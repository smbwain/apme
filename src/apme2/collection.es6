
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