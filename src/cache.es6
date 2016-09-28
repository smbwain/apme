
export class Cache {
    get() {}
    set() {}
    remove() {}
    async mget(keys) {
        const few = {};
        for(const key of keys) {
            const cached = await this.get(key);
            if(cached) {
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
    async load(key, loader) {
        let data = await this.get(key);
        if(!data) {
            data = await loader();
            await this.set(key, data);
        }
        return data;
    }
    async mload(keys, loader) {
        const few = await this.mget(keys);
        keys = keys.filter(id => !!few[id]);

        if(keys.length) {
            const res = await loader(keys);
            await this.mset(res);
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
    setOne(key, value) {
        this._cache[key] = value;
    }
    getOne(key) {
        return this._cache[key];
    }
    removeOne(key) {
        delete this._cache[key];
    }
}