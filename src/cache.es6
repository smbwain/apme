
export class Cache {
    get() {}
    set() {}
    remove() {}
    async mget(keys) {
        const few = {};
        for(const key of keys) {
            const cached = await this.get(key);
            if(cached !== undefined) {
                few[key] = cached;
            }
        }
        return few;
    }
    async mset(few) {
        for(const key in few) {
            await this.set(key, few[key]);
        }
    }
    async mremove(keys) {
        for(const key of keys) {
            await this.remove(key);
        }
    };
    async load(key, options, loader) {
        if(!loader) {
            loader = options;
            options = {};
        }
        let cached = await this.get(key);
        if(cached === undefined) {
            cached = await loader();
            const setPromise = this.set(key, cached);
            if(!options.fast) {
                await setPromise;
            }
        }
        return cached;
    }
    async mload(keys, options, loader) {
        if(!loader) {
            loader = options;
            options = {};
        }
        const few = await this.mget(keys);
        keys = keys.filter(id => few[id] !== undefined);

        if(keys.length) {
            const res = await loader(keys);
            const setPromise = this.mset(res);
            if(!options.fast) {
                await setPromise;
            }
            for(const key in res) {
                few[key] = res;
            }
        }

        return few;
    }
}

export class SimpleMemoryCache extends Cache {
    constructor({flushInterval} = {}) {
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
    set(key, value) {
        this._cache[key] = value;
    }
    get(key) {
        return this._cache[key];
    }
    remove(key) {
        delete this._cache[key];
    }
}