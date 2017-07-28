
import {ObjectData, CacheInterface} from './types';

export abstract class Cache implements CacheInterface {
    abstract get(prefix : string, key : string) : Promise<ObjectData>;
    abstract set(prefix : string, key : string, value : ObjectData) : Promise<void>;
    abstract remove(prefix : string, key : string) : Promise<void>;
    async mget(prefix : string, keys : string[]) : Promise<{[key : string]: ObjectData}> {
        const few = {};
        for(const key of keys) {
            const cached = await this.get(prefix, key);
            if(cached !== undefined) {
                few[key] = cached;
            }
        }
        return few;
    }
    async mset(prefix : string, few : {[key : string]: ObjectData}) : Promise<void> {
        for(const key in few) {
            await this.set(prefix, key, few[key]);
        }
    }
    async mremove(prefix : string, keys : string[]) : Promise<void> {
        for(const key of keys) {
            await this.remove(prefix, key);
        }
    }
    async load(
        prefix : string,
        key : string,
        options : {fast?: boolean} | (() => Promise<ObjectData>),
        loader? : () => Promise<ObjectData>
    ) : Promise<ObjectData> {
        if(!loader) {
            loader = options as (() => Promise<ObjectData>);
            options = {};
        }
        let cached = await this.get(prefix, key);
        if(cached === undefined) {
            cached = await loader();
            const setPromise = this.set(prefix, key, cached);
            if(!(options as ({ fast?: boolean; })).fast) {
                await setPromise;
            }
        }
        return cached;
    }
    async mload(
        prefix : string,
        keys : string[],
        options : {fast?: boolean} | ((keys : string[]) => Promise<ObjectData>),
        loader? : (keys : string[]) => Promise<ObjectData>
    ) : Promise<{[key : string]: ObjectData}> {
        if(!loader) {
            loader = options as ((keys : string[]) => Promise<ObjectData>);
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
            if(!(options as {fast?: boolean}).fast) {
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
    destroy(): void {
        if(this._tmr) {
            clearInterval(this._tmr);
            this._tmr = null;
        }
    }
    async set(prefix : string, key : string, value : ObjectData) : Promise<void> {
        this._cache[prefix+key] = value;
    }
    async get(prefix : string, key : string) : Promise<ObjectData> {
        return this._cache[prefix+key];
    }
    async remove(prefix : string, key : string) : Promise<void> {
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