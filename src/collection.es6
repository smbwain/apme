
import {methodNotAllowedError, badRequestError} from './errors';
import {MD5} from 'object-hash';
import {v4 as uuid} from 'uuid';
import {Relationship} from './relationship';
import Joi from 'joi';
import {validate} from './validate';

const optionsScheme = Joi.object()
    .keys({
        cache: Joi.object(),
        fields: Joi.object().pattern(/.*/, Joi.object().keys({
            set: Joi.alternatives().try(
                Joi.func(),
                Joi.boolean().only(false)
            ),
            get: Joi.alternatives().try(
                Joi.func(),
                Joi.boolean().only(false)
            ),
            schema: Joi.object(),
            joi: Joi.object()
        })),
        packAttrs: Joi.func(),
        unpackAttrs: Joi.func(),
        perms: Joi.object().pattern(/^read|write|create|update|remove|any$/, Joi.alternatives().try(
            Joi.func(),
            Joi.object().keys({
                byContext: Joi.func().required()
            })
        )),
        filter: Joi.object().keys({
            schema: Joi.object()
        }),
        getId: Joi.func(),
        generateId: Joi.func(),
        passId: Joi.boolean().default(false),
        loadOne: Joi.func(),
        loadFew: Joi.func(),
        loadList: Joi.func(),
        update: Joi.func(),
        create: Joi.func(),
        upsert: Joi.func(),
        removeOne: Joi.func(),
        rels: Joi.object().pattern(
            /.*/,
            Joi.alternatives().try(
                Joi.object().keys({
                    toOne: Joi.string().required(),
                    getIdOne: Joi.func(),
                    getFilterOne: Joi.func(),
                    setIdOne: Joi.func()
                }).xor('getIdOne', 'getFilterOne'),
                Joi.object().keys({
                    toMany: Joi.string().required(),
                    getIdsOne: Joi.func(),
                    getFilterOne: Joi.func(),
                    setIdsOne: Joi.func()
                }).xor('getIdsOne', 'getFilterOne')
            )
        ),
        listCacheInvalidateKeys: Joi.any()
    })
    .without('upsert', ['update', 'create'])
    .without('fields', ['packAttrs', 'unpeckAttrs']);

export class Collection {
    constructor(api, type, options) {
        this.api = api;
        this.type = type;

        {
            const validate = optionsScheme.validate(options);
            if(validate.error) {
                throw validate.error;
            }
            options = validate.value;
        }

        // load one
        if(options.loadOne) {
            this._loadOne = options.loadOne;
        } else if(options.loadFew) {
            this._loadOne = async (id, context) => ((await options.loadFew([id], context))[id]);
        }

        // load few
        if(options.loadFew) {
            this._loadFew = options.loadFew;
        } else if(options.loadOne) {
            this._loadFew = async (ids, context) => {
                const res = {};
                for(const id of ids) {
                    const obj = await options.loadOne(id, context);
                    if(obj) {
                        res[id] = obj;
                    }
                }
                return res;
            };
        }

        // load list
        if(options.loadList) {
            this._loadList = async function(params, context) {
                let loaded = await options.loadList(params, context);
                if(Array.isArray(loaded)) {
                    loaded = {items: loaded};
                }
                return loaded;
            };
        }
        if(options.listCacheInvalidateKeys) {
            this._listCacheInvalidateKeys = options.listCacheInvalidateKeys;
        }

        // cache
        this._cache = options.cache;

        if(options.fields) {
            this.fieldsSetToGet = new Set();
            const setters = {};
            const getters = {};
            for(const name in options.fields) {
                const d = options.fields[name];

                if(d.set !== false) {
                    const setter = d.set || ((obj, x) => {
                        obj[name] = x;
                    });
                    const schema = d.schema || d.joi;
                    setters[name] = !schema ? setter : (obj, x) => {
                        const validation = schema.validate(x);
                        if (validation.error) {
                            throw new Error(`Field "${name}": ${validation.error.message}`);
                        }
                        setter(obj, validation.value);
                    };
                }

                if(d.get !== false) {
                    getters[name] = d.get || (obj => obj[name]);
                    this.fieldsSetToGet.add(name);
                }
            }
            this.packAttrs = (object, fieldsSet) => {
                const res = {};
                for(const name in getters) {
                    if(!fieldsSet || fieldsSet.has(name)) {
                        res[name] = getters[name](object);
                    }
                }
                return res;
            };
            this.unpackAttrs = (data, patch) => {
                const obj = {};
                if(patch) {
                    for(const fieldName in data) {
                        if(!setters[fieldName]) {
                            throw badRequestError(`Unwritable field "${fieldName}"`);
                        }
                        setters[fieldName](obj, data[fieldName]);
                    }
                } else {
                    for (const fieldName in setters) {
                        setters[fieldName](obj, data[fieldName]);
                    }
                    for (const fieldName in data) {
                        if(!setters[fieldName]) {
                            throw badRequestError(`Unwritable field "${fieldName}"`);
                        }
                    }
                }
                return obj;
            };
        } else {
            this.packAttrs = options.packAttrs || (({id, ...rest}) => rest);
            this.unpackAttrs = options.unpackAttrs || (attrs => ({...attrs}));
        }
        this._update = options.update || options.upsert || function() {
            throw new Error('Method not allowed');
        };
        this._create = options.create || options.upsert || function() {
            throw new Error('Method not allowed');
        };
        this.removeOne = options.removeOne ? async (id, context) => {
            const object = await options.removeOne(id, context);
            await this.removeObjectCache(id);
            return object;
        } : function() {
            throw new Error('Method not allowed');
        };

        this.generateId = options.generateId || (() => uuid());
        this.getId = options.getId || (object => object.id);
        this.passId = options.passId;

        // perms
        function wrapPerm(perms, names) {
            for(const name of names) {
                const perm = perms[name];
                if(perm === undefined) {
                    continue;
                }
                if(typeof perm == 'function') {
                    return {
                        one: perm
                    };
                }
                if(typeof perm == 'object' && perm && (perm.few || perm.one || perm.byContext)) {
                    return perm;
                }
                if(typeof perm == 'boolean') {
                    return {
                        const: perms[name]
                    };
                }
                throw new Error('Wrong permission description');
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

        this._filter = options.filter || {};
        this._sort = options.sort || {};
        this._page = options.page || {};

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
     * Load single instance raw data
     * @param {string} id
     * @param {Context} context
     * @returns {Promise.<Resource|null>}
     */
    loadOne(id, context) {
        if(!this._cache) {
            return this._loadOne(id, context);
        }
        return this._cache.load(`${this.type}:o:`, id, () => (
            this._loadOne(id, context)
        ));
    }

    /**
     * Load single instance raw data (without using cache)
     * @private
     */
    async _loadOne() {
        throw methodNotAllowedError();
    }

    /**
     * Load few instances raw data
     * @param {[string]} ids
     * @param {Context} context
     * @returns {Promise.<Object.<Resource>>}
     */
    loadFew(ids, context) {
        if(!this._cache) {
            return this._loadFew(ids, context);
        }
        return this._cache.mload(`${this.type}:o:`, ids, rest => {
            return this._loadFew(rest, context);
        });
    }

    /**
     * Load few instances raw data (without using cache)
     * @private
     */
    async _loadFew() {
        throw methodNotAllowedError();
    }

    async loadList({filter, page, sort}, context) {
        filter = validate(filter, this._filter.schema, 'Filter validation');
        page = validate(page, this._page.schema, 'Page validation');
        sort = validate(sort, this._sort.schema, 'Sort validation');

        if(!this._cache) {
            return await this._loadList({filter, page, sort}, context);
        }
        const now = Date.now();
        const cacheKey = MD5({filter, sort, page});
        let loadedFromCache = await this._cache.get(`${this.type}:l:`, cacheKey);
        if(
            this._listCacheInvalidateKeys &&
            !(await this.checkInvalidate( this._listCacheInvalidateKeys({filter, sort, page}), loadedFromCache ? loadedFromCache.ts : 0, now))
        ) {
            loadedFromCache = null;
        }
        if (loadedFromCache) {
            const fromCache = await this._cache.mget(`${this.type}:o:`, loadedFromCache.ids);
            let items = [];
            for (const id of loadedFromCache.ids) {
                const value = fromCache[id];
                if (!value) {
                    items = null;
                    break;
                }
                items.push(value);
            }
            if (items) {
                return {
                    items,
                    meta: loadedFromCache.meta
                };
            }
        }
        const loaded = await this._loadList({filter, page, sort}, context);
        const few = {};
        for (const item of loaded.items) {
            few[this.getId(item)] = item;
        }
        await this._cache.mset(`${this.type}:o:`, few);
        await this._cache.set(`${this.type}:l:`, cacheKey, {
            meta: loaded.meta,
            ids: loaded.items.map(this.getId),
            ts: now
        });
        return loaded;
    }

    async _loadList() {
        throw methodNotAllowedError();
    }

    async removeObjectCache(id) {
        if(this._cache) {
            await this._cache.remove(`${this.type}:o:`, id);
        }
    }

    /**
     * @deprecated Use invalidates instead
     */
    async removeListCache({filter, sort, page}) {
        if(this._cache) {
            return await this._cache.remove(`${this.type}:l:`, MD5({filter, sort, page}));
        }
    }

    parseSort(sort) {
        // @todo
        return null;
    }

    async setInvalidate(keys) {
        if(!this._cache) {
            return;
        }
        await this._cache.mremove(`${this.type}:i:`, keys);
    }

    async checkInvalidate(keys, stamp, now = Date.now()) {
        if(!this._cache || !keys.length) {
            return true;
        }
        const invalidators = await this._cache.mget(`${this.type}:i:`, keys);
        const toSet = {};
        let set = false;
        let res = true;
        for(const key of keys) {
            if(!invalidators[key]) {
                res = false;
                set = true;
                toSet[key] = now;
            } else if(stamp < invalidators[key]) {
                res = false;
            }
        }
        if(set) {
            await this._cache.mset(`${this.type}:i:`, toSet);
        }
        return res;
    }
}