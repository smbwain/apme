
import {methodNotAllowedError} from './errors';
import {MD5} from 'object-hash';

export class Collection {
    constructor(api, type, options) {
        this.api = api;
        this.type = type;

        // load one
        if(options.loadOne) {
            this._loadOne = options.loadOne;
        } else if(options.loadFew) {
            this._loadOne = async id => ((await options.loadFew([id]))[id]);
        }

        // load few
        if(options.loadFew) {
            this._loadFew = options.loadFew;
        } else if(options.loadOne) {
            this._loadFew = async ids => {
                const res = {};
                for(const id of ids) {
                    const obj = await options.loadOne(id);
                    if(obj) {
                        res[id] = obj;
                    }
                }
                return res;
            };
        }

        // load list
        if(options.loadList) {
            this._loadList = options.loadList;
        }

        // cache
        if(options.cache) {
            const cache = options.cache;
            this.loadOne = function(id) {
                return cache.load(`${type}:o:`, id, () => (
                    this._loadOne(id)
                ));
            };
            this.loadFew = function(ids) {
                /*const keysMap = {};
                for(const id of ids) {
                    keysMap[`${type}:o:${id}`] = id;
                }
                console.log('mload>>>', Object.keys(keysMap));*/
                return cache.mload(`${type}:o:`, ids, rest => {
                    // console.log(rest.map(cacheKey => keysMap[cacheKey]));
                    return this._loadFew(rest);
                });
            };
            this.loadList = async function({filter, page, sort}) {
                const cacheKey = MD5({filter, sort, page});
                const ids = await cache.get(`${type}:l:`, cacheKey);
                if(ids) {
                    const fromCache = await cache.mget(`${type}:o:`, ids);
                    let list = [];
                    for(const id of ids) {
                        const value = fromCache[id];
                        if(!value) {
                            list = null;
                            break;
                        }
                        list.push(value);
                    }
                    if(list) {
                        return list;
                    }
                }
                let loaded = await this._loadList({filter, page, sort});
                if(Array.isArray(loaded)) {
                    loaded = {items: loaded};
                }
                const few = {};
                for(const item of loaded.items) {
                    few[item.id] = item;
                }
                await cache.mset(`${type}:o:`, few);
                await cache.set(`${type}:l:`, cacheKey, loaded.list.map(item => item.id));
                return loaded;
            }
        } else {
            this.loadOne = this._loadOne;
            this.loadFew = this._loadFew;
            this.loadList = async function(params) {
                let loaded = await this._loadList(params);
                if(Array.isArray(loaded)) {
                    loaded = {items: loaded};
                }
                return loaded;
            }
        }

        this.packAttrs = options.packAttrs || (({id, ...rest}) => rest);
        this.updateOne = options.updateOne || function() {
            throw new Error('Method not allowed');
        };
        this.createOne = options.createOne || function() {
            throw new Error('Method not allowed');
        };
        this.removeOne = options.removeOne || function() {
            throw new Error('Method not allowed');
        };

        // perms
        function wrapPerm(perms, names) {
            for(const name of names) {
                if(perms[name] != null) {
                    if(typeof perms[name] == 'function') {
                        return {
                            byContext: perms[name]
                        }
                    } else {
                        return {
                            'const': perms[name]
                        }
                    }
                }
                if(perms[`${name}One`] || perms[`${name}Few`]) {
                    const res = {};
                    if(perms[`${name}One`]) {
                        res.one = perms[`${name}One`];
                    }
                    if(perms[`${name}Few`]) {
                        res.few = perms[`${name}Few`];
                    }
                    return res;
                }
            }
            return {
                'const': true
            };
        }
        const perms = options.perms || {};
        this.perms = {
            create: wrapPerm(perms, ['create', 'write', 'any']),
            update: wrapPerm(perms, ['update', 'write', 'any']),
            remove: wrapPerm(perms, ['remove', 'write', 'any']),
            read: wrapPerm(perms, ['read', 'any'])
        };

        // relationships
        this.rels = {};
        for(const relName in options.rels || {}) {
            this.rels[relName] = new Relationship(this, relName, options.rels[relName]);
        }

        // (context, data, oldData, operation)

        // this.unpackAttrs = options.unpackAttrs || : attrs => ({...attrs}),
        // generateId: options.passId ? (data, passedId) => passedId || uuid() : () => uuid(),
        /*this.options = {
            packAttrs: ({id, ...rest}) => rest,
            unpackAttrs: attrs => ({...attrs}),
            generateId: options.passId ? (data, passedId) => passedId || uuid() : () => uuid(),
            ...options,
            rels: {...options.rels || {}}
        };*/
        /*for(const relName in this.options.rels) {
            const rel = this.options.rels[relName];
            if(rel.type && rel.getId) {
                rel.getOne = (item) => {
                    const id = rel.getId(item);
                    if (id) {
                        return {
                            data: {
                                id: id,
                                type: rel.type
                            }
                        };
                    }
                }
            } else if(rel.type && rel.getIds) {
                rel.getList = (item) => rel.getIds(item).map(id => ({
                    id,
                    type: rel.type
                }));
            }
        }
        this.api = api;*/
    }

    /**
     * Load single instance raw data (without using cache)
     * @param {string} id
     * @returns {object}
     * @private
     */
    async _loadOne(id) {
        throw methodNotAllowedError();
    }

    /**
     * Load few instances raw data (without using cache)
     * @param {array<string>} ids
     * @returns {object<object>}
     * @private
     */
    async _loadFew(ids) {
        throw methodNotAllowedError();
    }

    async _loadList() {
        throw methodNotAllowedError();
    }

    parseFields(fields) {
        // @todo
        return [];
    }

    parseSort(sort) {
        // @todo
        return null;
    }

    parseInclude(includeString) {
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

    unpackForUpdate(data) {
        return {
            id: data.id,
            ...data.attributes
        };
    }

    unpackForCreate(data) {
        return {
            id: data.id,
            ...data.attributes
        };
    }
}

class Relationship {
    constructor(collection, name, options) {
        if(options.toOne) {
            this.toOne = true;
            if(options.toOne == '*') {
                throw new Error('Not implemented');
            } else {
                const type = options.toOne;
                if (options.getIdOne) {
                    this.getResourceOne = async function (resource) {
                        return resource.context.resource(type, await options.getIdOne(resource));
                    };
                    this.getResourceFew = async function (resources) {
                        const res = Array(resources.length);
                        for(let i = resources.length-1; i>=0; i--) {
                            res[i] = resources[i].context.resource(type, await options.getIdOne(resources[i]));
                        }
                        return res
                    };
                } else if(options.getFilterOne) {
                    this.getResourceOne = async function (resource) {
                        const list = resource.context.list(type, {
                            filter: await options.getFilterOne(resource)
                        });
                        await list.load();
                        return list.items[0];
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
                } else {
                    throw new Error('Wrong relation description');
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
}