
import {SimpleMemoryCache} from './cache';

class Collection {
    constructor(api, type, options) {
        this.type = type;
        this.options = {
            packAttrs: ({id, ...rest}) => rest,
            unpackAttrs: attrs => ({...attrs}),
            generateId: options.passId ? (data, passedId) => passedId || uuid() : () => uuid(),
            ...options,
            rels: {...options.rels || {}}
        };
        for(const relName in this.options.rels) {
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
        this.api = api;
    }

    /**
     * Load single instance raw data (without using cache)
     * @param {string} id
     * @param {Context} context
     * @returns {object}
     * @private
     */
    async _loadOne(id, context) {
        if(this.options.loadOne) {
            return await this.options.loadOne(id, context);
        }
        if(this.options.loadFew) {
            return (await this.options.loadFew([id], context))[id];
        }
        throw new Error('No method to loadOne');
    }

    async loadOne(id, context) {
        const key = `${this.type}:${id}`;
        return await context._cache.load(
            key,
            () => (this._cache.load(
                key,
                () => (this._loadOne(id, context))
            ))
        );
    }

    /**
     * Load few instances raw data (without using cache)
     * @param {array<string>} ids
     * @param {Context} context
     * @returns {object<object>}
     * @private
     */
    async _loadFew(ids, context) {
        if(this.options.loadFew) {
            return await this.options.loadFew([ids], context);
        }
        if(this.options.loadOne) {
            const res = {};
            for(const id in ids) {
                res[id] = await this.options.loadOne(id, context);
            }
            return res;
        }

        throw new Error('No method to loadOne');
    }

    async loadFew(ids, context) {
        const keys = ids.map(id => `${this.type}:${id}`);
        return await context._cache.mload(
            keys,
            keys => (this._cache.mload(
                keys,
                keys => (this._loadFew(keys.map(key => key.split(':')[1]), context))
            ))
        );
    }

    pack(item) {
        const res = {
            id: String(item.id),
            type: this.type,
            attributes: this.options.packAttrs(item)
        };
        if(this.api.path) {
            res.links = {
                self: `${this.api.path}${this.type}/${item.id}`
            }
        }
        for(const relName in this.options.rels) {
            const rel = this.options.rels[relName];
            let relRes;
            if(rel.getList) {
                relRes = {
                    data: rel.getList(item)
                };
            } else if(rel.getOne) {
                relRes = {
                    data: rel.getOne(item)
                };
            } else {
                continue;
            }
            if(this.api.path) {
                relRes.links = {
                    self: `${this.api.path}${this.type}/${item.id}/rels/${relName}`,
                    related: `${this.api.path}${this.type}/${item.id}/${relName}`
                };
            }
            // if(relRes)
            res.relationships = res.relationships || {};
            res.relationships[relName] = relRes;
        }

        return res;
    }

    getRels(item) {
        const rels = {};
        for(const relName in this.options.rels) {
            const rel = this.options.rels[relName];
            if(rel.getList) {
                rels[relName] = rel.getList(item);
            } else if(rel.getOne) {
                rels[relName] = rel.getOne(item);
            }
        }
        return rels;
    }
}

class Context {
    constructor(api, req) {
        this.cache = new SimpleMemoryCache();
        this.api = api;
        this.req = req;
    }
}

export class Api {
    define(name, options) {
        this._collections[name] = new Collection(this, name, options);
    }

    expressRouter() {

    }
}