
import Joi from 'joi';

import {Collection} from './collection';
import {Context} from './context';
import * as errors from './errors';
import asyncMW from 'async-mw';

export const jsonErrorHandler = errors.jsonErrorHandler;

const schemas = {};
{
    const rel = Joi.object().unknown(false).keys({
        id: Joi.string().required(),
        type: Joi.string().required()
    });
    const relationship = Joi.object().unknown(false).keys({
        data: Joi.alternatives().required().try(
            Joi.array().items(rel),
            rel
        )
    });
    schemas.update = Joi.object().required().keys({
        data: Joi.object().required().unknown(false).keys({
            id: Joi.string(),
            type: Joi.string(),
            attributes: Joi.object(),
            relationships: Joi.object().pattern(/.*/, relationship)
        })
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

    expressRouter() {
        const router = require('express').Router();

        router.param('collection', (req, res, next, type) => {
            req.collection = this.collections[type];
            req.type = type;
            if (!req.collection) {
                next(errors.notFoundError('No collection found'));
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
            const context = this.context({req});
            const {collection, type} = req;

            const fields = collection.parseFields(req.query.fields);
            const filter = req.query.filter;
            const include = req.query.include && req.collection.parseInclude(req.query.include);
            const sort = req.collection.parseSort(req.query.sort);
            const page = req.query.page;

            const list = await context.list(type, {sort, page, filter}).load();
            const included = (await list.include(include)).packItems(fields);

            return {
                data: list.packItems(fields),
                included: included.length ? included : undefined
            };
        }));

        router.get('/:collection/:id', asyncMW(async req => {
            const context = this.context({req});
            const {collection} = req;
            const {type, id} = req;

            const resource = await context.resource(type, id).load();
            if(!resource.exists) {
                throw errors.notFoundError();
            }

            const fields = collection.parseFields(req.query.fields);
            const include = req.query.include && req.collection.parseInclude(req.query.include);

            const included = (await resource.include(include)).packItems(fields);

            return {
                data: resource.pack(fields[type]),
                included: included.length ? included : undefined
            };
        }));

        const updaterMiddleware = (patch) => {
            return asyncMW(async req => {
                const context = this.context({req});
                const {collection} = req;

                // validate basic format
                const body = await new Promise((resolve, reject) => {
                    Joi.validate(req.body, schemas.update, (err, value) => {
                        err ? reject(err) : resolve(value);
                    });
                });
                // @todo: return 400 on error

                // context.include = req.query.include ? parseInclude(req.query.include) : req.collection.include;

                // check type
                if(body.data.type && body.data.type != req.type) {
                    throw badRequestError('Wrong "type" passed in document');
                }

                // fill/check id
                if(patch) {
                    if(body.data.id && body.data.id != req.params.id) {
                        throw badRequestError('Wrong "id" passed in document');
                    } else {
                        body.data.id = req.id;
                    }
                } else {
                    if(body.data.id) {
                        // if(!context.hasPermission('passId', resource)) {
                        //    throw errors.forbiddenError(`Passing id is permitted`);
                        // }
                    } else {
                        body.data.id = await collection.generateID();
                    }
                }

                // const resource = context.resource(body.data.type, body.data.id).unpack(body.data);
                /*if(!patch && body.data.id && ) {

                }*/

                /*if(!patch)
                const object = req.collection.unpackAttrs(attributes);
                if(patch) {
                    object.id = req.params.id;
                } else {
                    object.id = req.collection.generateId(data, req.body.data.id);
                }*/

                /*const passedRels = req.body.data.relationships || {};
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
                    } else if(relDefinition.fromOne) {
                        if(Array.isArray(passedRels[relName].data)) {
                            throw new Error(`Relationship "${relName}" should be "toOne"`);
                        }
                        data = {...data, ...relDefinition.fromOne(passedRels[relName].data)};
                    } else if(relDefinition.type && relDefinition.fromId) {
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
                }*/

                const resource = context.resource(req.type, body.data.id);

                if(patch) {
                    resource.setData(req.collection.unpackForUpdate(body.data));
                    await resource.update();
                    if(!resource.exists) {
                        throw errors.notFoundError();
                    }
                } else {
                    resource.setData(req.collection.unpackForCreate(body.data));
                    await resource.create();
                }

                const fields = collection.parseFields(req.query.fields);
                const include = req.query.include && req.collection.parseInclude(req.query.include);

                const included = (await resource.include(include)).packItems(fields);

                return {
                    data: resource.pack(fields),
                    included: included.length ? included : undefined
                };
            });
        };

        router.post('/:collection', updaterMiddleware(false));
        router.patch('/:collection/:id', updaterMiddleware(true));

        router.delete('/:collection/:id', asyncMW(async (req, res) => {
            const context = this.context({req});

            if(!await context.resource(req.type, req.id).remove()) {
                throw errors.notFoundError();
            }

            res.status(204).send();
            return null;
        }));

        router.get('/:collection/:id/:relName', asyncMW(async req => {
            const context = this.context({req});

            // @todo
            /*const rel = req.collection.rels[req.params.relName];
            if(!rel) {
                throw notFoundError('No relation with such name');
            }

            if(req.query.include) {
                context.include = parseInclude(req.query.include);
            }

            const mainData = (await req.collection.loadByIdsAndPack([req.params.id], context))[0];
            if(!mainData) {
                throw notFoundError();
            }

            const data = await loadAllRelationships(this, {
                ...context,
                include: {
                    [req.params.relName]: {}
                }
            }, [mainData]);

            return {
                data: (rel.getId || rel.getOne) ? data[0] || null : data,
                included: await loadAllRelationships(this, context, data)
            };*/
        }));

        return router;
    }


}