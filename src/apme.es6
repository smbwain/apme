/**
 * Lightweight JSON Api server implementation
 */

import {notFoundError, methodNotAllowedError, badRequestError, validationError, jsonErrorHandler} from './apme2/errors';
import asyncMW from 'async-mw';
import tv4 from 'tv4';
import {v4 as uuid} from 'uuid';

export {jsonErrorHandler, notFoundError, methodNotAllowedError, validationError};

function createContext(apme, properties) {
    return {
        ...properties,
        _cache: {},
        cache(type, instance) {
            (this._cache[type] || (this._cache[type] = {}))[instance.id] = instance;
        },
        async loadOne(type, id) {
            const cached = this._cache[type] && this._cache[type][id];
            if(cached) {
                return this._cache;
            }

            const one = await apme._collections[type].loadOne(id);
            if(one) {
                this.cache(type, one);
            }
            return one;
        }
    };
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
            include: typeof options.include == 'string' ? parseInclude(options.include) : options.include,
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
            },
            loadOne: async function(id, context) {
                if(this.getOne) {
                    return (await this.getOne(id, context)).one;
                }
                if(this.getFew) {
                    return (await this.getFew([id], context)).list[0];
                }
                throw new Error('No method to loadOne');
            },
            loadByIdsAndPack: async function(ids, context, handler) {
                let res;
                if(!handler) {
                    res = [];
                    handler = obj => {
                        res.push(obj)
                    };
                }

                if(!ids.length) {
                    return;
                }

                // try to load from collection cache
                if(this.cache && this.cache.getS) {
                    ids = ids.filter(id => {
                        const cached = this.cache.getS(`${type}:${id}`);
                        if(cached) {
                            handler(cached);
                            return false;
                        }
                        return true;
                    });
                }

                if(!ids.length) {
                    return res;
                }

                const toCache = [];
                const push = (data) => {
                    const presentation = this.pack(data);
                    if(this.cache) {
                        toCache.push(presentation);
                    }
                    handler(presentation);
                };

                // try to load with getFew/getOne collection method
                if(this.getFew) {
                    (await this.getFew(ids, context)).list.forEach(push);
                } else if(this.getOne) {
                    if(ids.length > 1) {
                        console.warn(`Loading many records from "${type}" by getOne. Add getFew(ids) to improve performance.`);
                    }
                    for(const id of ids) {
                        const data = (await this.getOne(id, context)).one;
                        if(data) {
                            push(data);
                        }
                    }
                } else {
                    throw new Error(`Can't load objects form collection "${type}"`);
                }

                if(this.cache) {
                    if(this.cache.setS) {
                        for(const element of toCache) {
                            this.cache.setS(`${element.type}:${element.id}`, element);
                        }
                    }
                }

                return res;
            }
        };
    }

    expressRouter() {

    }
}

export class SimpleCache {
    constructor({clearInterval = 5*60*1000} = {}) {
        this._cache = {};
        this._tmr = setInterval(() => {
            this._cache = {};
        }, clearInterval);
    }
    setS(key, value) {
        this._cache[key] = value;
    }
    getS(key) {
        return this._cache[key];
    }
}
