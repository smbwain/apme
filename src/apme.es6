/**
 * Lightweight JSON Api server implementation
 */

import {notFoundError, methodNotAllowedError, validationError, jsonErrorHandler} from './errors';
import asyncMW from './asyncMW';
import tv4 from 'tv4';

export {jsonErrorHandler, notFoundError, methodNotAllowedError, validationError};

class ResourcesList {
    constructor(japi, context) {
        this._japi = japi;
        this._resourcesToLoad = {};
        this._context = context;
    }
    addLink(link) {
        (this._resourcesToLoad[link.type] || (this._resourcesToLoad[link.type] = new Set())).add(link.id);
    }
    addItemRelationships(item) {
        const relationships = item.relationships || {};
        for(const relationshipName in relationships) {
            if(!this._japi._collections[item.type].links[relationshipName]) {
                console.warn(`No relationship "${relationshipName}" for collection "${item.type}"`);
                continue;
            }
            if(!this._japi._collections[item.type].links[relationshipName].include) {
                continue;
            }
            const relationshipData = relationships[relationshipName].data;
            if(!relationshipData) {
                continue;
            }
            for(const rel of Array.isArray(relationshipData) ? relationshipData : [relationshipData]) {
                this.addLink(rel);
            }
        }
    }
    addItemsListRelationships(list) {
        for(const item of list) {
            this.addItemRelationships(item);
        }
    }
    async load() {
        const res = [];
        for(const collectionName in this._resourcesToLoad) {
            if(this._japi._collections[collectionName].getOne) {
                for(const id of this._resourcesToLoad[collectionName]) {
                    const data = (await this._japi._collections[collectionName].getOne(id)).one;
                    if(data) {
                        res.push(
                            this._japi._collections[collectionName].pack(data, this._context)
                        );
                    }
                }
            }
        }
        return res;
    }
}

export class Apme {
    constructor() {
        this._collections = {};
    }

    define(type, options) {
        if(!options.packAttrs) {
            throw new Error('You should provide packAttrs method');
        }
        this._collections[type] = {
            links: {},
            ...options,
            pack: function(item, context) {
                const res = {
                    id: String(item.id),
                    type,
                    attributes: this.packAttrs(item, context)
                };
                for(const relName in this.links) {
                    const rel = this.links[relName];
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
            const context = {
                req
            };

            if(!req.collection.getList) {
                throw methodNotAllowedError();
            }

            const {list = [], meta = {}} = await req.collection.getList({
                page: req.query.page,
                filter: req.query.filter
            });
            const data = list.map(item => req.collection.pack(item, context));

            const rels = new ResourcesList(this, context);
            rels.addItemsListRelationships(data);
            const included = await rels.load();

            return {
                data,
                included: included.length ? included : undefined,
                meta: Object.keys(meta).length ? meta : undefined
            };
        }));
        router.get('/:collection/:id', asyncMW(async req => {
            const context = {
                req
            };

            if(!req.collection.getOne) {
                throw methodNotAllowedError();
            }

            const {one = null, meta = {}} = await req.collection.getOne(req.params.id, context);

            if(!one) {
                throw notFoundError();
            }

            const data = req.collection.pack(one, context);

            const rels = new ResourcesList(this, context);
            rels.addItemRelationships(data);
            const included = await rels.load();

            return {
                data,
                included: included.length ? included : undefined,
                meta: Object.keys(meta).length ? meta : undefined
            };
        }));

        const updaterMiddleware = (patch) => {
            return asyncMW(async req => {
                const context = {
                    req
                };

                if(patch ? !req.collection.updateOne : !req.collection.createOne) {
                    throw methodNotAllowedError();
                }

                // validate basic format
                const validationResult = tv4.validateResult(req.body, {
                    definitions: {
                        link: {
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
                                            $ref: '#/definitions/link'
                                        }
                                    }, {
                                        $ref: '#/definitions/link'
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

                let data = {};
                if(req.body.data.attributes) {
                    data = {...req.collection.unpackAttrs(req.body.data.attributes, context)};
                }
                const passedRels = req.body.data.relationships || {};
                for(const relName in passedRels) {
                    const linkDefinition = req.collection.links[relName];
                    if(!linkDefinition) {
                        throw new Error("Unknown relationship name");
                    }
                    if(linkDefinition.fromList) {
                        if(!Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toMany"`);
                        }
                        data = {...data, ...linkDefinition.fromList(passedRels[relName].data)};
                    } else if(linkDefinition.type && linkDefinition.fromIds) {
                        if(!Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toMany"`);
                        }
                        if(passedRels[relName].data.some(rel => rel.type != linkDefinition.type)) {
                            throw new Error(`Inappropriate type in relationship`);
                        }
                        data = {...data, ...linkDefinition.fromIds(passedRels[relName].data.map(rel => rel.id))};
                    } else if(rel.fromOne) {
                        if(Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toOne"`);
                        }
                        data = {...data, ...linkDefinition.fromOne(passedRels[relName].data)};
                    } else if(rel.type && rel.fromId) {
                        if(Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toOne"`);
                        }
                        if(passedRels[relName].data.type != linkDefinition.type) {
                            throw new Error(`Inappropriate type in relationship`);
                        }
                        data = {...data, ...linkDefinition.fromId(passedRels[relName].data.id)};
                    }
                }
                if(patch) {
                    data.id = req.params.id;
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

                const rels = new ResourcesList(this, context);
                rels.addItemRelationships(responseData);
                const included = await rels.load();

                return {
                    data: responseData,
                    included: included.length ? included : undefined,
                    meta: Object.keys(meta).length ? meta : undefined
                };
            });
        };

        router.post('/:collection', updaterMiddleware(false));
        router.patch('/:collection/:id', updaterMiddleware(true));
        router.delete('/:collection/:id', asyncMW(async (req, res) => {
            const id = String(req.params.id);
            const context = {
                req
            };

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

        return router;
    }
}