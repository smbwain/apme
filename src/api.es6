
import Joi from 'joi';

import {Collection} from './collection';
import {Context} from './context';
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
}


export class Api {
    constructor() {
        this.collections = {};
    }

    define(name, options) {
        this.collections[name] = new Collection(this, name, options);
    }

    context(options) {
        return new Context(this, options);
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

        router.get('/:collection', asyncMW(async (req) => {
            const {collection, type} = req;

            const fields = collection.parseFields(req.query.fields);
            const filter = req.query.filter;
            const include = req.collection.parseInclude(req.query.include);
            const sort = req.collection.parseSort(req.query.sort);
            const page = req.query.page;

            const list = await req.apmeContext.list(type, {sort, page, filter}).load();
            const included = (await list.include(include)).packItems(fields, urlBuilder);

            return {
                data: list.packItems(fields, urlBuilder),
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

            const fields = collection.parseFields(req.query.fields);
            const include = req.collection.parseInclude(req.query.include);

            const included = (await resource.include(include)).packItems(fields, urlBuilder);

            return {
                data: resource.pack(fields[type], urlBuilder),
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

                // req.apmeContext.include = req.query.include ? parseInclude(req.query.include) : req.collection.include;

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

                const fields = collection.parseFields(req.query.fields);
                const include = req.collection.parseInclude(req.query.include);

                const included = (await resource.include(include)).packItems(fields, urlBuilder);

                return {
                    data: resource.pack(fields[resource.type], urlBuilder),
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

            const fields = collection.parseFields(req.query.fields);

            let data = null;
            if(rel.toOne) {
                const resource = await rel.getResourceOne(mainResource);
                if(resource) {
                    await resource.load();
                    if(resource.exists) {
                        data = resource.pack(fields[resource.type], urlBuilder);
                    }
                }
            } else {
                const list = await rel.getListOne(mainResource);
                await list.load();
                data = list.packItems(fields, urlBuilder);
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