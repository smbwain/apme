/**
 * @typedef {object} ResourceDefinition
 * @param load
 * @param loadFew
 * @param loadList
 * @param create(resource, data, op)
 * @param update(resource, data, op)
 * @param upsert(resource, data, op)
 * @param perms
 * @param rels
 */

import Joi from 'joi';

import {Collection} from './collection';
import {Context} from './context';
import {validate} from './validate';
import {badRequestError, notFoundError} from './errors';
import asyncMW from 'async-mw';
import querystring from 'querystring';

const schemas = {};
{
    const rel = Joi.object().unknown(false).keys({
        id: Joi.string().required(),
        type: Joi.string().required()
    });
    schemas.relationship = Joi.object().unknown(false).keys({
        data: Joi.alternatives().required().try(
            Joi.array().items(rel),
            rel
        )
    });
    schemas.relationshipToMany = Joi.object().unknown(false).keys({
        data: Joi.array(rel)
    });
    schemas.update = Joi.object().required().keys({
        data: Joi.object().required().unknown(false).keys({
            id: Joi.string(),
            type: Joi.string(),
            attributes: Joi.object(),
            relationships: Joi.object().pattern(/.*/, schemas.relationship)
        }),
        meta: Joi.object()
    });
    schemas.fields = Joi.object().pattern(/.*/, Joi.string());
    schemas.include = Joi.string();
}

function parseFields(fields) {
    const res = {};
    if(fields) {
        validate(fields, schemas.fields, 'Fields validation');
        for (const collectionName in fields) {
            res[collectionName] = new Set(fields[collectionName].split(','));
        }
    }
    return res;
}

function parseInclude(includeString) {
    if(!includeString) {
        return null;
    }
    validate(includeString, schemas.include, 'Include validation');
    const res = {};
    for(const includeElement of includeString.split(',')) {
        let curObj = res;
        for(const current of includeElement.split('.')) {
            curObj = curObj[current] || (curObj[current] = {});
        }
    }
    return res;
}

export class Api {
    constructor() {
        this.collections = {};
    }

    /**
     * @param {string} name
     * @param {ResourceDefinition} options
     */
    define(name, options) {
        this.collections[name] = new Collection(this, name, options);
    }

    context(options) {
        return new Context(this, options);
    }

    /**
     * @param {Object.<string, Iterable.<string>>} fields
     */
    validateFields(fields) {
        for(const collectionName in fields) {
            const collection = this.collections[collectionName];
            if(!collection) {
                throw badRequestError(`Unknown collection ${collectionName}`);
            }
            if(collection.fieldsSetToGet) {
                for(const fieldName of fields[collectionName]) {
                    if(!collection.fieldsSetToGet.has(fieldName)) {
                        throw badRequestError(`Unknown attribute or relationship "${collectionName}"."${fieldName}"`);
                    }
                }
            }
        }
    }

    expressInitMiddleware() {
        return (req, res, next) => {
            req.apmeContext = this.context({
                req
            });
            next();
        };
    }

    expressJsonApiRouter({url = '/'} = {}) {
        const router = require('express').Router();

        function urlBuilder(path, params) {
            return url+path+((params && Object.keys(params).length) ? '?'+querystring.stringify(params) : '');
        }

        router.param('collection', (req, res, next, type) => {
            req.collection = this.collections[type];
            req.type = type;
            if (!req.collection) {
                next(notFoundError('No collection found'));
                return;
            }
            next();
        });

        router.param('id', (req, res, next, id) => {
            req.id = id;
            next();
        });

        router.use((req, res, next) => {
            res.set('Content-Type', 'application/vnd.api+json');
            next();
        });

        const parseFieldsMiddleware = (req, res, next) => {
            const fields = parseFields(req.query.fields);
            this.validateFields(fields);
            req.apmeContext.fields = fields;

            req.include = parseInclude(req.query.include);
            next();
        };

        router.get('/:collection', parseFieldsMiddleware, asyncMW(async (req) => {
            const {type} = req;

            const {filter, sort, page} = req.query;

            const list = await req.apmeContext.list(type, {sort, page, filter}).load();
            const included = (await list.include(req.include)).packItems(urlBuilder);

            return {
                data: list.packItems(urlBuilder),
                meta: list.meta,
                included: included.length ? included : undefined,
                links: {
                    self: urlBuilder(`${type}`, req.query)
                }
            };
        }));

        router.get('/:collection/:id', asyncMW(async req => {
            const {collection} = req;
            const {type, id} = req;

            const resource = await req.apmeContext.resource(type, id).load();
            if(!resource.exists) {
                throw notFoundError();
            }

            const fields = parseFields(req.query.fields);
            const include = parseInclude(req.query.include);

            const included = (await resource.include(include)).packItems(urlBuilder);

            return {
                data: resource.pack(urlBuilder),
                included: included.length ? included : undefined,
                links: {
                    self: urlBuilder(`${type}/${id}`, req.query)
                }
            };
        }));

        const updaterMiddleware = (patch) => {
            return asyncMW(async req => {
                const {collection} = req;

                // validate basic format
                const body = await new Promise((resolve, reject) => {
                    Joi.validate(req.body, schemas.update, (err, value) => {
                        err ? reject(err) : resolve(value);
                    });
                });
                req.meta = body.meta || {};
                // @todo: return 400 on error

                // check type
                if(body.data.type && body.data.type != req.type) {
                    throw badRequestError('Wrong "type" passed in document');
                }

                let id = body.data.id;
                const data = collection.unpackAttrs(body.data.attributes || {}, patch);
                const passedRels = body.data.relationships || {};
                for(const relName in passedRels) {
                    const rel = collection.rels[relName];
                    if(!rel) {
                        throw badRequestError('Bad relation name');
                    }
                    const passedRelData = passedRels[relName].data;
                    let relValue;
                    if(Array.isArray(passedRelData)) {
                        relValue = passedRelData.map(data => req.apmeContext.resource(data.type, data.id));
                    } else {
                        relValue = passedRelData ? req.apmeContext.resource(passedRelData.type, passedRelData.id) : null;
                    }
                    rel.setData(data, relValue);
                }

                // fill/check id
                if(patch) {
                    if(id) {
                        if (id != req.id) {
                            throw badRequestError('Wrong "id" passed in document');
                        }
                    } else {
                        id = req.id;
                    }
                } else {
                    if(id) {
                        if(!collection.passId || (typeof collection.passId == 'function' && !(await collection.passId(req.apmeContext, id)))) {
                            throw badRequestError('Passing id is not allowed');
                        }
                    } else {
                        id = await collection.generateId(data, req.apmeContext);
                    }
                }

                const resource = req.apmeContext.resource(req.type, id);

                if(patch) {
                    await resource.update(data);
                    if(!resource.exists) {
                        throw notFoundError();
                    }
                } else {
                    await resource.create(data);
                }

                const fields = parseFields(req.query.fields);
                const include = parseInclude(req.query.include);

                const included = (await resource.include(include)).packItems(urlBuilder);

                return {
                    data: resource.pack(urlBuilder),
                    included: included.length ? included : undefined,
                    links: {
                        self: urlBuilder(`${resource.type}/${resource.id}`) // @todo: params
                    },
                    meta: Object.keys(req.apmeContext.meta).length ? req.apmeContext.meta : undefined
                };
            });
        };

        router.post('/:collection', updaterMiddleware(false));
        router.patch('/:collection/:id', updaterMiddleware(true));

        router.delete('/:collection/:id', asyncMW(async (req, res) => {
            if(!await req.apmeContext.resource(req.type, req.id).remove()) {
                throw notFoundError();
            }

            res.status(204).send();
            return null;
        }));

        router.get('/:collection/:id/:relName', asyncMW(async req => {
            const {collection} = req;
            const {type, id} = req;
            const {relName} = req.params;

            const rel = collection.rels[relName];
            if(!rel) {
                throw notFoundError('No relation with such name');
            }

            const mainResource = await req.apmeContext.resource(type, id).load();
            if(!mainResource.exists) {
                throw notFoundError();
            }

            const fields = parseFields(req.query.fields);

            let data = null;
            if(rel.toOne) {
                const resource = await rel.getResourceOne(mainResource);
                if(resource) {
                    await resource.load();
                    if(resource.exists) {
                        data = resource.pack(urlBuilder);
                    }
                }
            } else {
                const list = await rel.getListOne(mainResource);
                await list.load();
                data = list.packItems(urlBuilder);
            }

            // @todo: add included

            return {
                data,
                links: {
                    self: urlBuilder(`${type}/${id}/${relName}`)
                }
            };

            // const include = req.query.include && req.collection.parseInclude(req.query.include);
            // const included = (await resource.include(include)).packItems(fields);

            /*return {
                data: mainResource.pack(fields[type])
                //included: included.length ? included : undefined
            };*/


            // @todo
            /*const rel = req.collection.rels[req.params.relName];
            if(!rel) {
                throw notFoundError('No relation with such name');
            }*/

            /*if(req.query.include) {
             req.apmeContext.include = parseInclude(req.query.include);
            }*/

            /*const mainData = (await req.collection.loadByIdsAndPack([req.params.id], req.apmeContext))[0];
            if(!mainData) {
                throw notFoundError();
            }

            const data = await loadAllRelationships(this, {
                ...req.apmeContext,
                include: {
                    [req.params.relName]: {}
                }
            }, [mainData]);

            return {
                data: (rel.getId || rel.getOne) ? data[0] || null : data,
                included: await loadAllRelationships(this, req.apmeContext, data)
            };*/
        }));

        router.get('/:collection/:id/relationships/:relName', asyncMW(async req => {
            const {collection} = req;
            const {type, id} = req;
            const {relName} = req.params;

            const rel = collection.rels[relName];
            if(!rel) {
                throw notFoundError('No relation with such name');
            }

            const mainResource = await req.apmeContext.resource(type, id).load();
            if(!mainResource.exists) {
                throw notFoundError();
            }

            /*let data;
            if(rel.toOne) {
                const resource = await rel.getResourceOne(mainResource);
                data = resource ? resource.packRef() : null
            } else {
                const list = await rel.getListOne(mainResource);
                await list.load();
                //console.log('>>list', list);
                data = list.packRefs();
            }*/

            return {
                data: req.apmeContext.packRefData(await rel.getOne(mainResource)),
                links: {
                    self: urlBuilder(`${type}/${id}/relationships/${relName}`),
                    related: urlBuilder(`${type}/${id}/${relName}`)
                }
            };
        }));

        /*router.patch('/:collection/:id/relationships/:relName', asyncMW(async req => {
            /!*const body = await new Promise((resolve, reject) => {
                Joi.validate(req.body, schemas.relationship, (err, value) => {
                    err ? reject(err) : resolve(value);
                });
            });*!/
            // @todo
            // @todo: return 400 on error
        }));

        router.post('/:collection/:id/relationships/:relName', asyncMW(async req => {
            /!*const body = await new Promise((resolve, reject) => {
                Joi.validate(req.body, schemas.relationshipToMany, (err, value) => {
                    err ? reject(err) : resolve(value);
                });
            });*!/
            // @todo
            // @todo: return 400 on error
        }));

        router.delete('/:collection/:id/relationships/:relName', asyncMW(async req => {
            /!*const body = await new Promise((resolve, reject) => {
                Joi.validate(req.body, schemas.relationshipToMany, (err, value) => {
                    err ? reject(err) : resolve(value);
                });
            });*!/
            // @todo
            // @todo: return 400 on error
        }));*/

        return router;
    }
}