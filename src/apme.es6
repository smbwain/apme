/**
 * Lightweight JSON Api server implementation
 */

import {notFoundError, methodNotAllowedError, badRequestError, validationError, jsonErrorHandler} from './errors';
import asyncMW from 'async-mw';
import tv4 from 'tv4';
import {v4 as uuid} from 'uuid';

export {jsonErrorHandler, notFoundError, methodNotAllowedError, validationError};

function createContext(properties) {
    return {
        ...properties,
        _cache: {},
        cache(type, instance) {
            (this._cache[type] || (this._cache[type] = {}))[instance.id] = instance;
        }
    };
}

class Ids {
    constructor() {
        this._cache = {};
    }
    static fromObjectsList(list) {
        const ids = new Ids();
        for(const item of list) {
            ids.push(item.type, item.id);
        }
        return ids;
    }
    push(type, id) {
        (this._cache[type] || (this._cache[type] = new Set())).add(id);
    }
    loop(handler) {
        for(const type in this._cache) {
            for(const id of this._cache[type]) {
                handler(type, id);
            }
        }
    }
    loopTypes(handler) {
        for(const type in this._cache) {
            handler(type, this._cache[type]);
        }
    }
    /*toJSON() {
        const obj = {};
        this.loopTypes((type, idsSet) => {
            obj[type] = Array.from(idsSet);
        });
        return obj;
    }*/
}

class PresentationCache {
    constructor() {
        this._cache = {};
    }
    push(obj) {
        (this._cache[obj.type] || (this._cache[obj.type] = {}))[obj.id] = obj;
    }
    get(type, id) {
        return this._cache[type] && this._cache[type][id];
    }
    getAll(ids) {
        const objects = [];
        ids.loop((type, id) => {
            const object = this.get(type, id);
            if(object) {
                objects.push(object);
            }
        });
        return objects;
    }
}

async function loadAllRelationships(api, context, loadedObjects) {
    if(!context.include) {
        return;
    }

    const includedResult = [];
    const presCache = new PresentationCache();
    for(const object of loadedObjects) {
        presCache.push(object);
    }
    function push(collectionName, data) {
        const pres = api._collections[collectionName].pack(data, context);
        includedResult.push(pres);
        presCache.push(pres);
    }

    let includeSets = [
        {
            includeTree: context.include,
            ids: Ids.fromObjectsList(loadedObjects)
        }
    ];

    while(includeSets.length) {
        // process many includeSets on each step

        const newIncludeSets = [];
        const needToLoad = new Ids();
        for(const includeSet of includeSets) {
            const objects = presCache.getAll(includeSet.ids);
            for(const relName in includeSet.includeTree) {
                let ids;
                if(Object.keys(includeSet.includeTree[relName]).length) {
                    ids = new Ids();
                    newIncludeSets.push({
                        includeTree: includeSet.includeTree[relName],
                        ids
                    });
                }
                for(const object of objects) {
                    const objectRelationshipData = object.relationships && object.relationships[relName] && object.relationships[relName].data;
                    if(!objectRelationshipData) {
                        continue;
                    }
                    for(const rel of Array.isArray(objectRelationshipData) ? objectRelationshipData : [objectRelationshipData]) {
                        if(ids) {
                            ids.push(rel.type, rel.id);
                        }
                        if(!presCache.get(rel.type, rel.id)) {
                            needToLoad.push(rel.type, rel.id);
                        }
                    }
                }
            }
        }

        includeSets = newIncludeSets;

        const promises = [];
        needToLoad.loopTypes((type, idsSet) => {
            promises.push((async() => {

                // try to load from context cache
                const rest = [];
                for(const id of idsSet) {
                    const cached = context._cache[type] && context._cache[type][id];
                    if(cached) {
                        push(type, cached);
                    } else {
                        rest.push(id);
                    }
                }

                if(!rest.length) {
                    return;
                }

                // try to load with getFew collection method
                if(api._collections[type].getFew) {
                    for (const data of (await api._collections[type].getFew(rest)).list) {
                        push(type, data);
                    }
                    return;
                }

                // try to load with getOne method
                if(api._collections[type].getOne) {
                    if(rest.length > 1) {
                        console.warn(`Loading many records from "${type}" by getOne. Add getFew(ids) to improve performance.`);
                    }
                    for(const id of rest) {
                        const data = (await api._collections[type].getOne(id)).one;
                        if(data) {
                            push(type, data);
                        }
                    }
                    return;
                }

                throw new Error(`Can't include relationships form collection "${type}"`);
            })());
        });
        await Promise.all(promises);
    }

    return includedResult.length ? includedResult : undefined;
}

/**
 * @param {string} sortString
 * @returns {Array<{string, boolean}>}
 */
function parseSort(sortString) {
    return sortString.split(',').map(sortElement => {
        if(sortElement[0] == '-') {
            return [sortElement.slice(1), false];
        }
        return [sortElement, true];
    });
}

/**
 * @param {Object<string, string>} fieldsObject
 * @returns {Object<Array<string>>}
 */
function parseFields(fieldsObject) {
    const res = {};
    for(const collectionName in fieldsObject) {
        res[collectionName] = new Set(fieldsObject[collectionName].split(','));
    }
    return res;
}

function parseInclude(includeString) {
    // @todo: validate it
    const obj = {};
    function bld(curObj, path, i) {
        curObj[path[i]] || (curObj[path[i]] = {});
    }
    for(const includeElement of includeString.split(',')) {
        let curObj = obj;
        for(const current of includeElement.split('.')) {
            curObj = curObj[current] || (curObj[current] = {});
        }
    }
    return obj;
}

export class Api {
    constructor() {
        this._collections = {};
    }

    define(type, options) {
        this._collections[type] = {
            rels: {},
            packAttrs: ({id, ...rest}) => rest,
            unpackAttrs: attrs => ({...attrs}),
            generateId: options.passId ? (data, passedId) => passedId || uuid() : () => uuid(),
            ...options,
            pack: function(item, context) {
                const res = {
                    id: String(item.id),
                    type,
                    attributes: this.packAttrs(item, context)
                };
                for(const relName in this.rels) {
                    const rel = this.rels[relName];
                    if(rel.getList) {
                        res.relationships = res.relationships || {};
                        res.relationships[relName] = {
                            data: rel.getList(item)
                        };
                    } else if(rel.type && rel.getIds) {
                        res.relationships = res.relationships || {};
                        res.relationships[relName] = {
                            data: rel.getIds(item).map(id => ({
                                id,
                                type: rel.type
                            }))
                        };
                    } else if(rel.getOne) {
                        res.relationships = res.relationships || {};
                        res.relationships[relName] = {
                            data: rel.getOne(item)
                        };
                    } else if(rel.type && rel.getId) {
                        res.relationships = res.relationships || {};
                        res.relationships[relName] = {
                            data: {
                                id: rel.getId(item),
                                type: rel.type
                            }
                        };
                    }
                }
                return res;
            }
        };
    }

    expressRouter() {
        const router = require.main.require('express').Router();

        router.param('collection', (req, res, next, name) => {
            req.collection = this._collections[name];
            if(!req.collection) {
                next(notFoundError('No collection found'));
                return;
            }
            next();
        });

        router.param('id', (req, res, next, id) => {
            req.id = req.params.id;
            next();
        });

        router.use((req, res, next) => {
            res.set('Content-Type', 'application/vnd.api+json');
            next();
        });

        router.get('/:collection', asyncMW(async req => {
            const context = createContext({
                req
            });

            if(!req.collection.getList) {
                throw methodNotAllowedError();
            }

            const query = {
                page: req.query.page,
                filter: req.query.filter
            };
            if(req.query.sort) {
                query.sort = parseSort(req.query.sort);
                let ok = false;
                if(typeof req.collection.allowSort == 'function') {
                    ok = req.collection.allowSort(query.sort);
                }
                // @todo: validate other patterns
                if(!ok) {
                    throw badRequestError('Sort is not allowed for collection');
                }
            }
            if(req.query.fields) {
                // @todo: validate
                query.fields = parseFields(req.query.fields);
            }

            if(req.query.include) {
                context.include = parseInclude(req.query.include);
            }

            const {list = [], meta = {}} = await req.collection.getList(query, context);
            const data = list.map(item => req.collection.pack(item, context));

            return {
                data,
                included: await loadAllRelationships(this, context, data),
                meta: Object.keys(meta).length ? meta : undefined
            };
        }));
        router.get('/:collection/:id', asyncMW(async req => {
            const context = createContext({
                req
            });

            if(!req.collection.getOne) {
                throw methodNotAllowedError();
            }

            if(req.query.include) {
                context.include = parseInclude(req.query.include);
            }

            const {one = null, meta = {}} = await req.collection.getOne(req.params.id, context);

            if(!one) {
                throw notFoundError();
            }

            const data = req.collection.pack(one, context);

            return {
                data,
                included: await loadAllRelationships(this, context, [data]),
                meta: Object.keys(meta).length ? meta : undefined
            };
        }));

        const updaterMiddleware = (patch) => {
            return asyncMW(async req => {
                const context = createContext({
                    req
                });

                if(patch ? !req.collection.updateOne : !req.collection.createOne) {
                    throw methodNotAllowedError();
                }

                // validate basic format
                const validationResult = tv4.validateResult(req.body, {
                    definitions: {
                        rel: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['id', 'type'],
                            properties: {
                                id: {
                                    type: 'string'
                                },
                                type: {
                                    type: 'string'
                                }
                            }
                        },
                        relationship: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['data'],
                            properties: {
                                data: {
                                    oneOf: [{
                                        type: 'array',
                                        items: {
                                            $ref: '#/definitions/rel'
                                        }
                                    }, {
                                        $ref: '#/definitions/rel'
                                    }]
                                }
                            }
                        }
                    },
                    type: 'object',
                    required: ['data'],
                    properties: {
                        data: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                id: {
                                    type: 'string'
                                },
                                type: {
                                    type: 'string'
                                },
                                attributes: {
                                    type: 'object'
                                },
                                relationships: {
                                    type: 'object',
                                    additionalProperties: {
                                        $ref: '#/definitions/relationship'
                                    }
                                }
                            }
                        }
                    }
                });
                if(!validationResult.valid) {
                    throw validationError(validationResult.error);
                }

                if(req.query.include) {
                    context.include = parseInclude(req.query.include);
                }

                let data = {};
                if(req.body.data.attributes) {
                    data = {...req.collection.unpackAttrs(req.body.data.attributes, context)};
                }
                const passedRels = req.body.data.relationships || {};
                for(const relName in passedRels) {
                    const relDefinition = req.collection.rels[relName];
                    if(!relDefinition) {
                        throw new Error("Unknown relationship name");
                    }
                    if(relDefinition.fromList) {
                        if(!Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toMany"`);
                        }
                        data = {...data, ...relDefinition.fromList(passedRels[relName].data)};
                    } else if(relDefinition.type && relDefinition.fromIds) {
                        if(!Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toMany"`);
                        }
                        if(passedRels[relName].data.some(rel => rel.type != relDefinition.type)) {
                            throw new Error(`Inappropriate type in relationship`);
                        }
                        data = {...data, ...relDefinition.fromIds(passedRels[relName].data.map(rel => rel.id))};
                    } else if(rel.fromOne) {
                        if(Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toOne"`);
                        }
                        data = {...data, ...relDefinition.fromOne(passedRels[relName].data)};
                    } else if(rel.type && rel.fromId) {
                        if(Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toOne"`);
                        }
                        if(passedRels[relName].data.type != relDefinition.type) {
                            throw new Error(`Inappropriate type in relationship`);
                        }
                        data = {...data, ...relDefinition.fromId(passedRels[relName].data.id)};
                    }
                }
                if(patch) {
                    data.id = req.params.id;
                } else {
                    data.id = req.collection.generateId(data, req.body.data.id);
                }

                if(req.collection.beforeEditOne) {
                    await req.collection.beforeEditOne({
                        action: patch ? 'update' : 'create',
                        data
                    }, context);
                }

                // do update
                const {one, meta = {}} = patch
                    ? await req.collection.updateOne(data, context)
                    : await req.collection.createOne(data, context);

                const responseData = req.collection.pack(one, context);

                return {
                    data: responseData,
                    included: await loadAllRelationships(this, context, [responseData]),
                    meta: Object.keys(meta).length ? meta : undefined
                };
            });
        };

        router.post('/:collection', updaterMiddleware(false));
        router.patch('/:collection/:id', updaterMiddleware(true));
        router.delete('/:collection/:id', asyncMW(async (req, res) => {
            const id = String(req.params.id);
            const context = createContext({
                req
            });

            if(!req.collection.deleteOne) {
                throw methodNotAllowedError();
            }

            if(req.collection.beforeEditOne) {
                await req.collection.beforeEditOne({
                    data: {id},
                    action: 'delete'
                }, context);
            }

            // do delete
            const {meta = {}} = await req.collection.deleteOne(id, context) || {};

            if(!Object.keys(meta).length) {
                res.status(204).send();
                return null;
            }

            return {
                meta: meta
            };
        }));

        router.get('/:collection/:id/:relName', asyncMW(async req => {
            const context = createContext({
                req
            });

            const rel = req.collection.rels[req.params.relName];
            if(!rel) {
                throw notFoundError('No relation with such name');
            }

            if(!req.collection.getOne) {
                throw methodNotAllowedError();
            }

            if(req.query.include) {
                context.include = parseInclude(req.query.include);
            }

            const {one = null, meta = {}} = await req.collection.getOne(req.params.id, context);

            if(!one) {
                throw notFoundError();
            }

            const data = req.collection.pack(one, context);

            // @todo

            const rels = new ResourcesList(this, context);
            rels.addItemRelationship(data, req.params.relName);
            const relationships = await rels.load();

            return {
                data: (rel.getId || rel.getOne) ? relationships[0] || null : relationships,
                meta: Object.keys(meta).length ? meta : undefined
            };
        }));

        return router;
    }
}