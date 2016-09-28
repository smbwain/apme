
export class Resource {
    constructor(context, type, id, object) {
        this.context = context;
        this.type = type;
        this.id = id;
        this.object = object;
    }
    _attachObject(object) {
        this.object = object;
    }
    get loaded() {
        return this.object !== undefined;
    }
    get exists() {
        return !!this.object;
    }
    async load() {
        if(!this.loaded) {
            this.object = (await this.context.api.collections[this.type].loadOne(this.id)) || null;
        }
        return this;
    }
    pack(fields) {
        return {
            id: this.id,
            type: this.type,
            attributes: this.context.api.collections[this.type].packAttrs(this.object)
        };
        // @todo
    }
    async update(data) {
        this._attachObject(
            await this.context.api.collections[this.type].updateOne(data)
        );
        return this;
    }
    async create(data) {
        this._attachObject(
            await this.context.api.collections[this.type].createOne(data)
        );
        return this;
    }
    async remove() {
        throw new Error('Not implemented');
        // @todo
    }
    async include(include) {
        // @todo
        return new ResourcesMixedList(this.context);
    }
    /*toString() {
        return JSON.stringify({
            id: this.id,
            type: this.type,
            object: this.object
        });
    }*/
    // unpack() {}
    /*async load(context) {
        context.loadOne(this);
    }*/
}

export class ResourcesMap {
    constructor() {
        this._map = {};
    }
    add(resource) {
        (this._map[resource.type] || (this._map[resource.type] = {}))[resource.id] = resource;
    }
    get(type, id) {
        return this._map[type] && this._map[type][id];
    }
}

/*export class SyncCache extends ResourcesMap {
    /**
     * @param {string} type
     * @param {string} id
     * @param {function} loader
     * @returns {object}
     *
     async load(type, id, loader) {
        let obj = this.get(type, id);
        if (!obj) {
            obj = await loader();
            if(obj) {
                this.set(type, obj);
            }
        }
        return obj;
    }

    /**
     * @param {string} type
     * @param {[string]} ids
     * @param {function} loader
     * @returns {{object}}
     *
    async mload(type, ids, loader) {
        const few = {};
        const rest = [];
        for(const id of ids) {
            const data = this.get(type, id);
            if(data) {
                few[id] = data;
            } else {
                rest.push(id);
            }
        }

        if(rest.length) {
            const res = await loader(rest);
            for(const id in res) {
                this.set(type, res[id]);
                few[id] = res[id];
            }
        }

        return few;
    }
}*/

export class AbstractResourcesList {
    constructor(context, items = []) {
        this.context = context;
        this.items = items;
        this.loaded = false;
    }
    packItems(fields = {}) {
        return this.items.map(resource => resource.pack(fields[resource.type]));
    }
    push(resource) {
        this.items.push(resource);
    }
    include(include) {
        // @todo
        return new ResourcesMixedList(this.context);
    }
}

export class ResourcesTypedList extends AbstractResourcesList {
    constructor(context, type, items = []) {
        super(context, items);
        this.type = type;
    }
    push(resource) {
        if(resource.type != this.type) {
            throw new Error(`Wrong type`);
        }
        super.push(resource);
    }
    async load() {
        await this.context.loadFew(this.type, this.items.filter(item => !item.loaded));
        this.loaded = true;
    }
}

export class ResourcesMixedList extends AbstractResourcesList {
    async load() {
        const map = {};
        for(const item of this.items) {
            if(!item.loaded) {
                (map[item.type] || (map[item.type = []])).push(item);
            }
        }
        const promises = [];
        for(const type in map) {
            promises.push(this.context.loadFew(type, map[type]));
        }
        await Promise.all(promises);
        this.loaded = true;
    }
}

export class ResourceTypedQuery {
    constructor(context, type, params) {
        this.context = context;
        this.type = type;
        this.params = params;
    }
    async load() {
        const objects = await this.context.api.collections[this.type].loadList(this.params);
        return new ResourcesTypedList(
            this.context,
            this.type,
            objects.map(object => this.context.resource(this.type, object.id, object))
        );
    }
    /*pack() {
        const res = {
            links: {
                self: this.context.api.buildPath(this.type, this.params)
            }
        };
        if(this.loaded) {
            res.data = this.pack();
        }
        return res;
    }*/
}