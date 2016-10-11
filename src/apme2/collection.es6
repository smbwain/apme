
import {methodNotAllowedError} from './errors';

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
            this.loadOne = function(id) {
                return options.cache.load(type, id, () => (
                    this._loadOne(id)
                ));
            };
            this.loadFew = function(ids) {
                return options.cache.mload(type, ids, rest => (
                    this._loadFew(rest)
                ));
            };
            // this.loadList
        } else {
            this.loadOne = this._loadOne;
            this.loadFew = this._loadFew;
            this.loadList = this._loadList;
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
                throw new Error('No implemented');
            } else {
                const type = options.toOne;
                if (options.getIdOne) {
                    this.getResourceOne = async function (resource) {
                        // await resource.load();
                        return resource.context.resource(type, await options.getIdOne(resource));
                    };
                    this.getResourceFew = async function (resources) {
                        const res = Array(resources.length);
                        for(let i = resources.length-1; i>=0; i--) {
                            res[i] = resources[i].context.resource(type, await options.getIdOne(resources[i]));
                        }
                        return res
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
                if(options.getFilterOne) {
                    this.getListOne = async function (resource) {
                        // await resource.load();
                        return await resource.context.list(type, {
                            filter: await options.getFilterOne(resource)
                        });
                    }
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