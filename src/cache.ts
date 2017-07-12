
import {TObjectData} from './types';

export abstract class Cache /*implements CacheInterface*/ {
    abstract get(prefix, key);
    abstract set(prefix, key, value);
    abstract remove(prefix, key);
    async mget(prefix, keys) {
        const few = {};
        for(const key of keys) {
            const cached = await this.get(prefix, key);
            if(cached !== undefined) {
                few[key] = cached;
            }
        }
        return few;
    }
    async mset(prefix, few) {
        for(const key in few) {
            await this.set(prefix, key, few[key]);
        }
    }
    async mremove(prefix, keys) {
        for(const key of keys) {
            await this.remove(prefix, key);
        }
    }
    async load(prefix, key, options, loader) {
        if(!loader) {
            loader = options;
            options = {};
        }
        let cached = await this.get(prefix, key);
        if(cached === undefined) {
            cached = await loader();
            const setPromise = this.set(prefix, key, cached);
            if(!options.fast) {
                await setPromise;
            }
        }
        return cached;
    }
    async mload(prefix, keys, options, loader) {
        if(!loader) {
            loader = options;
            options = {};
        }
        const few = await this.mget(prefix, keys);
        keys = keys.filter(key => few[key] === undefined);

        if(keys.length) {
            const res = await loader(keys);
            for(const key of keys) {
                if(!(key in res)) {
                    res[key] = null;
                }
            }
            const setPromise = this.mset(prefix, res);
            if(!options.fast) {
                await setPromise;
            }
            for(const key in res) {
                few[key] = res[key];
            }
        }
        return few;
    }
}

export class SimpleMemoryCache extends Cache {
    private _cache;
    private _tmr;
    constructor({flushInterval = null} = {}) {
        super();
        this._cache = {};
        if(flushInterval) {
            this._tmr = setInterval(() => {
                this._cache = {};
            }, flushInterval);
        }
    }
    destroy() {
        if(this._tmr) {
            clearInterval(this._tmr);
            this._tmr = null;
        }
    }
    set(prefix, key, value) {
        this._cache[prefix+key] = value;
    }
    get(prefix, key) {
        return this._cache[prefix+key];
    }
    remove(prefix, key) {
        delete this._cache[prefix+key];
    }
}

function msg(...args) {
    console.log('cache log>>', ...args);
}
export class SimpleDebugMemoryCache extends SimpleMemoryCache {
    async set(prefix, key, value) {
        await SimpleMemoryCache.prototype.set.call(this, prefix, key, value);
        msg(`SET "${prefix+key}"`);
    }
    async get(prefix, key) {
        const res = await SimpleMemoryCache.prototype.get.call(this, prefix, key);
        msg(`GET "${prefix+key}": ${res !== undefined ? 'hit' : 'missed'}`);
        return res;
    }
    async remove(prefix, key) {
        await SimpleMemoryCache.prototype.remove.call(this, prefix, key);
        msg(`REMOVE "${prefix+key}"`);
    }
    async mget(prefix, keys) {
        const res = await SimpleMemoryCache.prototype.mget.call(this, prefix, keys);
        msg(`MGET ${keys.map(key => `"${prefix+key}"`).join(',')}: ${Object.keys(res).length}/${keys.length} hits`);
        return res;
    }
    async mset(prefix, data) {
        await SimpleMemoryCache.prototype.mset.call(this, prefix, data);
        msg(`MSET ${Object.keys(data).map(key => `"${prefix+key}"`).join(',')}`);
    }
    async mremove(prefix, keys) {
        await SimpleMemoryCache.prototype.mremove.call(this, prefix, keys);
        msg(`MREMOVE ${keys.map(key => `"${prefix+key}"`).join(',')}`);
    }
}