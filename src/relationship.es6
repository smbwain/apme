
import {ResourcesTypedList} from './resources-lists';
import {badRequestError} from './errors';

export class Relationship {
    constructor(collection, name, options) {
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
                        const list = resource.context.list(type, {
                            filter: await options.getFilterOne(resource)
                        });
                        await list.load();
                        return list.items[0] || null;
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
                            throw badRequestError(`Relation "${this.name}" is toOne`);
                        }
                        if(relValue.type != type) {
                            throw badRequestError(`Relation "${this.name}" type error`);
                        }
                        options.setIdOne(data, relValue ? relValue.id : null);
                    };
                }
            }
        } else if(options.toMany) {
            this.toOne = false;
            if(options.toOne == '*') {
                throw new Error('Not implemented');
            } else {
                const type = options.toMany;
                /*if(options.getFilterByObject) {
                 this.getListOne = async function (resource) {
                 await resource.load();
                 return await collection.api.collections[type].loadList({
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
                        const relCollection = collection.api.collections[type];
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
                            throw badRequestError(`Relation "${this.name}" is toMany`);
                        }
                        if(relValue.some(resource => resource.type != type)) {
                            throw badRequestError(`Relation "${this.name}" type error`);
                        }
                        options.setIdsOne(data, relValue.map(resource => resource.id));
                    };
                }
            }
        } else {
            throw new Error('toOne or toMany should be specified');
        }
    }
    getOne(resource) {
        if(this.toOne) {
            return this.getResourceOne(resource);
        } else {
            return this.getListOne(resource);
        }
    }
    getFew(resources) {
        if(this.toOne) {
            return this.getResourceFew(resources);
        } else {
            return this.getListFew(resources);
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