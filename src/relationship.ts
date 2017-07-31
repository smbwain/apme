import {ResourcesTypedList, AbstractResourcesList} from './resources-lists';
import * as errors from './errors';
import {ObjectData, RelationOptions, RelationshipInterface} from "./types";
import {Resource} from "./resource";
import {Collection} from "./collection";

export class Relationship implements RelationshipInterface {
    public name : string;
    public toOne : boolean;
    public getResourceOne : (resource: Resource) => Promise<Resource>;
    public getResourceFew : (resources: Resource[]) => Promise<Resource[]>;
    public setData : (data: ObjectData, value: any) => void;
    public getListOne : (resource: Resource) => Promise<AbstractResourcesList>;
    public getListFew : (resources: Resource[]) => Promise<AbstractResourcesList[]>;

    constructor(collection : Collection, name : string, options : RelationOptions) {
        this.name = name;
        if(options.toOne) {
            this.toOne = true;
            if(options.toOne == '*') {
                throw new Error('Not implemented');
            } else {
                const type = options.toOne;
                if (options.getIdOne) {
                    this.getResourceOne = async function (resource) {
                        const id = await options.getIdOne(resource);
                        return id ? resource.context.resource(type, id) : null;
                    };
                    this.getResourceFew = async function (resources) {
                        const res = new Array(resources.length);
                        for(let i = resources.length-1; i>=0; i--) {
                            res[i] = await this.getResourceOne(resources[i]);
                        }
                        return res;
                    };
                } else if(options.getFilterOne) {
                    this.getResourceOne = async function (resource) {
                        return (await resource.context.list(type, {
                            filter: await options.getFilterOne(resource)
                        }).load()).items[0] || null;
                    };
                    this.getResourceFew = async function (resources) {
                        const res = [];
                        for(const resource of resources) {
                            res.push(await this.getResourceOne(resource));
                        }
                        return res;
                    };
                } else {
                    throw new Error('Wrong relation description');
                }
                if(options.setIdOne) {
                    this.setData = (data, relValue) => {
                        if(Array.isArray(relValue)) {
                            throw errors.badRequest(`Relation "${this.name}" is toOne`);
                        }
                        if(relValue.type != type) {
                            throw errors.badRequest(`Relation "${this.name}" type error`);
                        }
                        options.setIdOne(data, relValue ? relValue.id : null);
                    };
                }
            }
        } else if(options.toMany) {
            this.toOne = false;
            if(options.toMany == '*') {
                throw new Error('Not implemented');
            } else {
                const type = options.toMany;
                /*if(options.getFilterByObject) {
                 this.getListOne = async function (resource) {
                 await resource.load();
                 return await collection.apme.collections[type].loadList({
                 filter: await options.getFilterByObject(resource.object)
                 });
                 }
                 }*/
                if(options.getIdsOne) {
                    this.getListOne = async function (resource) {
                        // await resource.load();
                        return resource.context.resources(type, await options.getIdsOne(resource));
                    };
                    this.getListFew = async function (resources) {
                        const res = [];
                        for(const resource of resources) {
                            res.push(resource.context.resources(type, await options.getIdsOne(resource)));
                        }
                        return res;
                    };
                } else if(options.getFilterOne) {
                    this.getListOne = async function (resource) {
                        // await resource.load();
                        const list = resource.context.list(type, {
                            filter: await options.getFilterOne(resource)
                        });
                        await list.load();
                        return list;
                    };
                    this.getListFew = async function (resources) {
                        const res = [];
                        for(const resource of resources) {
                            res.push(await this.getListOne(resource));
                        }
                        return res;
                    };
                } else if(options.loadObjectsOne) {
                    this.getListOne = async function (resource) {
                        const relCollection = collection.apme.collections[type];
                        const list = new ResourcesTypedList(
                            resource.context,
                            type,
                            (await options.loadObjectsOne(resource)).map(data => resource.context.resource(type, relCollection.getId(data), data))
                        );
                        await list.load();
                        return list;
                    };
                    this.getListFew = async function (resources) {
                        const res = [];
                        for(const resource of resources) {
                            res.push(await this.getListOne(resource));
                        }
                        return res;
                    };
                } else {
                    throw new Error('Wrong relation description');
                }
                if(options.setIdsOne) {
                    this.setData = (data, relValue) => {
                        if(!Array.isArray(relValue)) {
                            throw errors.badRequest(`Relation "${this.name}" is toMany`);
                        }
                        if(relValue.some(resource => resource.type != type)) {
                            throw errors.badRequest(`Relation "${this.name}" type error`);
                        }
                        options.setIdsOne(data, relValue.map(resource => resource.id));
                    };
                }
            }
        } else {
            throw new Error('toOne or toMany should be specified');
        }
    }
    async getOne(resource : Resource) : Promise<{
        one?: Resource,
        many?: AbstractResourcesList
    }> {
        if(this.toOne) {
            return {
                one: await this.getResourceOne(resource)
            };
        } else {
            return {
                many: await this.getListOne(resource)
            };
        }
    }
    async getFew(resources : Array<Resource>) : Promise<Array<{
        one?: Resource,
        many?: AbstractResourcesList
    }>> {
        if(this.toOne) {
            return (await this.getResourceFew(resources)).map(resource => ({
                one: resource
            }));
        } else {
            return (await this.getListFew(resources)).map(list => ({
                many: list
            }));
        }
    }
    /*setData(data, relValue) {
     if(this.toOne) {
     if(Array.isArray(relValue)) {
     throw badRequestError(`Relation "${this.name}" is toOne`);
     }
     if(this.setIdOne) {
     this.setIdOne(data, relValue ? relValue.id : null);
     } else {
     throw badRequestError(`Relation ${this.name} is readOnly`);
     }
     } else {
     if(!Array.isArray(relValue)) {
     throw badRequestError(`Relation "${this.name}" is toMany`);
     }
     if(this.setIdsOne) {
     this.setIdsOne(data, relValue.map(resource => resource.id));
     } else {
     throw badRequestError(`Relation ${this.name} is readOnly`);
     }
     }
     }*/
}