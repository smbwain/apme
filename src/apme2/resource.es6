
import {forbiddenError} from './errors';

export class Resource {
    constructor(context, type, id, object) {
        this.context = context;
        this.type = type;
        this.id = id;
        this.object = object;
    }
    setData(data) {
        this.data = data;
        return this;
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
            if(!await this.checkPermission('read')) {
                throw forbiddenError();
            }
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
    async update() {
        if(!await this.checkPermission('read') || !await this.checkPermission('update')) {
            throw forbiddenError();
        }
        this._attachObject(
            await this.context.api.collections[this.type].updateOne(this.id, this.data, this.context)
        );
        delete this.data;
        return this;
    }
    async create() {
        if(!await this.checkPermission('read') || !await this.checkPermission('create')) {
            throw forbiddenError();
        }
        this._attachObject(
            await this.context.api.collections[this.type].createOne(this.id, this.data, this.context)
        );
        delete this.data;
        return this;
    }
    async remove() {
        if(!await this.checkPermission('read') || !await this.checkPermission('remove')) {
            throw forbiddenError();
        }
        return await this.context.api.collections[this.type].removeOne(this.id, this.context);
    }
    async include(include) {
        // @todo
        return new ResourcesMixedList(this.context);
    }
    async checkPermission(operation) {
        if(this.context.privileged) {
            return true;
        }
        const perm = this.context.api.collections[this.type].perms[operation];
        if(perm.const != null) {
            return perm.const;
        }
        if(perm.byContext) {
            return await perm.byContext(this.context);
        }
        if(perm.one) {
            return await perm.one(this, operation);
        }
        return await perm.few(new ResourcesTypedList(this.context, this.type, [this]), operation);
    }
    /*toString() {
        return JSON.stringify({
            id: this.id,
            type: this.type,
            object: this.object
        });
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
        if(this.loaded) {
            return this;
        }
        await this.context.loadFew(this.type, this.items.filter(item => !item.loaded));
        this.loaded = true;
        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }
        return this;
    }
    splitByType() {
        return {
            [this.type]: this
        };
    }
    async checkPermission(operation) {
        if(this.context.privileged) {
            return true;
        }
        const perm = this.context.api.collections[this.type].perms[operation];
        if(perm.const != null) {
            return perm.const;
        }
        if(perm.byContext) {
            return await perm.byContext(this.context);
        }
        if(perm.few) {
            return await perm.few(this, operation);
        }
        for(const item of this.items) {
            if(!await perm.one(item, operation)) {
                return false;
            }
        }
        return true;
    }
}

export class ResourcesMixedList extends AbstractResourcesList {
    async load() {
        if(this.loaded) {
            return this;
        }
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
        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }
        return this;
    }
    splitByType() {
        const map = {};
        for(const item of this.items) {
            if(map[item.type]) {
                map[item.type] = new ResourcesTypedList(this.context, item.type);
            }
            map[item.type].push(item);
        }
        return map;
    }
    async checkPermission(operation) {
        const byType = this.splitByType();
        const promises = [];
        for(const type in byType) {
            promises.push(byType[type].checkPermission(operation));
        }
        return (await Promise.all(promises)).every(res => res);
    }
}

export class ResourceTypedQuery extends ResourcesTypedList {
    constructor(context, type, params) {
        super(context, type);
        this.params = params;
    }
    async load() {
        if(this.loaded) {
            return this;
        }
        this.items = (await this.context.api.collections[this.type].loadList(this.params)).map(object => {
            return this.context.resource(this.type, object.id, object);
        });
        this.loaded = true;
        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }
        return this;
    }
    async checkPermission(operation) {
        await this.load();
        return await ResourcesTypedList.prototype.checkPermission.call(this, operation);
    }
}