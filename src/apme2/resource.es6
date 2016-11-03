
import {forbiddenError} from './errors';

function filterFields(obj, fields) {
    if(!fields) {
        return obj;
    }
    const res = {};
    for(const name in fields) {
        res[name] = obj[name];
    }
    return res;
}

export class Resource {
    constructor(context, type, id, object) {
        this.context = context;
        this.type = type;
        this.id = id;
        this._object = object;
        this._rels = null;
    }
    setData(data) {
        this.data = data;
        return this;
    }
    _attachObject(object) {
        this._object = object;
    }
    get loaded() {
        return this._object !== undefined /*&& !!this._rels*/;
    }
    get loadedObject() {
        return this._object !== undefined;
    }
    get loadedRels() {
        return !!this._rels;
    }
    get exists() {
        if(this._object === undefined) {
            throw new Error(`Try to read "exists" property of unloaded resource`);
        }
        return !!this._object;
    }
    get object() {
        if(this._object === undefined) {
            throw new Error(`Try to read "object" property of unloaded resource`);
        }
        return this._object;
    }
    get rels() {
        if(this._rels === undefined) {
            throw new Error(`Try to read "rels" property of unloaded resource`);
        }
        return this._rels;
    }
    async load() {
        if(this._object === undefined) {
            const collection = this.context.api.collections[this.type];
            this._attachObject( (await collection.loadOne(this.id)) || null);
            if(!await this.checkPermission('read')) {
                throw forbiddenError();
            }
        }
        if(!this._rels) {
            await this._loadRels();
        }
        return this;
    }
    async _loadRels() {
        const collection = this.context.api.collections[this.type];
        const fields = this.context.fields[this.type];
        this._rels = {};
        for(const relName in collection.rels) {
            if(!fields || fields.has(relName)) {
                const rel = this.context.api.collections[this.type].rels[relName];
                this._rels[relName] = await rel.getOne(this);
            }
        }
    }
    pack(fields, urlBuilder) {
        const collection = this.context.api.collections[this.type];
        const data = {
            id: this.id,
            type: this.type,
            attributes: filterFields(collection.packAttrs(this.object), fields),
            /*links: {
                self: urlBuilder(`${this.type}/${this.id}`)
            }*/
        };
        if(Object.keys(collection.rels).length) {
            data.relationships = {};
            for(const relName in collection.rels) {
                if(fields && !fields[relName]) {
                    continue;
                }
                const relData = this.rels[relName];
                if(!relData) {
                    console.log(this);
                    throw new Error(`No relationship data ${this.type}:${relName}`);
                }
                data.relationships[relName] = {
                    data: this.context.packRefData(relData),
                    links: {
                        self: urlBuilder(`${this.type}/${this.id}/relationships/${relName}`)
                    }
                };
                /*if(this.rels[relName] instanceof Resource) {
                    data.relationships[relName].data = this.rels[relName].packRef();
                } else if (this.rels[relName] instanceof AbstractResourcesList) {
                    data.relationships[relName].data = this.rels[relName].packRefs();
                }*/
            }
        }
        return data;
    }
    packRef() {
        return {
            id: this.id,
            type: this.type
        };
    }
    async update() {
        if(!await this.checkPermission('read') || !await this.checkPermission('update')) {
            throw forbiddenError();
        }
        this._attachObject(
            await this.context.api.collections[this.type].updateOne(this.id, this.data, this.context)
        );
        delete this.data;
        await this._loadRels();
        return this;
    }
    async create() {
        if(!await this.checkPermission('read') || !await this.checkPermission('create')) {
            throw forbiddenError();
        }
        this._attachObject(
            await this.context.api.collections[this.type].createOne(this.id, this.data, this.context)
        );
        if(!this.id) {
            this.id = this.context.api.collections[this.type].getId(this._object);
            this.context._loadedMap.add(this); // @todo: take off in some event
        }
        delete this.data;
        await this._loadRels();
        return this;
    }
    async remove() {
        if(!await this.checkPermission('read') || !await this.checkPermission('remove')) {
            throw forbiddenError();
        }
        return await this.context.api.collections[this.type].removeOne(this.id, this.context);
    }
    async include(includeTree) {
        return await (new ResourcesTypedList(this.context, this.type, [this])).include(includeTree);
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
    loopTypes(handler) {
        for(const type in this._map) {
            handler(type, this._map[type]);
        }
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
    packItems(fields = {}, urlBuilder) {
        return this.items.map(resource => resource.pack(fields[resource.type], urlBuilder));
    }
    push(resource) {
        this.items.push(resource);
    }
    _clearUnexisting() {
        this.items = this.items.filter(resource => resource.exists);
        return this;
    }
    async include(includeTree) {
        const includedResult = new ResourcesMixedList(this.context);

        if(!includeTree) {
            return includedResult;
        }

        const usedMap = this.getMap();

        let includeSets = [
            {
                includeTree,
                list: this
            }
        ];

        while(includeSets.length) {
            // process many includeSets on each step

            const newIncludeSets = [];
            const needToLoad = new ResourcesMixedList(this.context);
            for(const includeSet of includeSets) {
                for(const relName in includeSet.includeTree) {
                    let list;
                    if(Object.keys(includeSet.includeTree[relName]).length) {
                        list = new ResourcesMixedList(this.context);
                        newIncludeSets.push({
                            includeTree: includeSet.includeTree[relName],
                            list
                        });
                    }
                    const split = includeSet.list._clearUnexisting().splitByType();
                    for(const type in split) {
                        const typedList = split[type];
                        // await typedList._loadRel(relName); // @todo: make it simultaneous
                        for(const item of typedList.items) {
                            const itemRel = item.rels[relName];
                            if(itemRel === null) {
                                continue;
                            }
                            for(const resource of (itemRel instanceof Resource) ? [itemRel] : itemRel.items) {
                                if(list) {
                                    list.push(resource); // @todo: what about unique
                                }
                                if(!usedMap.get(resource.type, resource.id)) {
                                    needToLoad.push(resource); // @todo: what about unique
                                    usedMap.add(resource);
                                }
                            }
                        }
                    }
                }
            }

            includeSets = newIncludeSets;

            await needToLoad.load();
            for(const resource of needToLoad.items) {
                includedResult.push(resource)
            }
        }

        return includedResult;
    }
    getMap() {
        const map = new ResourcesMap();
        for(const item of this.items) {
            map.add(item);
        }
        return map;
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

        const toLoad = this.items.filter(item => !item.loadedObject);
        if(toLoad.length) {
            const res = await this.context.api.collections[this.type].loadFew(toLoad.map(resource => resource.id));
            for(const resource of toLoad) {
                resource._attachObject(res[resource.id] || null);
            }
            this._clearUnexisting();
        }

        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }

        await this._loadRels();

        this.loaded = true;

        return this;
    }
    async _loadRels() {
        const items = this.items.filter(item => !item.loadedRels);
        const fields = this.context.fields[this.type];
        for(const item of items) {
            item._rels = {};
        }
        for(const relName in this.context.api.collections[this.type].rels) {
            if(!fields || fields.has(relName)) {
                (await this.context.api.collections[this.type].rels[relName].getFew(items)).forEach((related, i) => {
                    items[i]._rels[relName] = related;
                });
            }
        }
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
        /*const map = {};
        for(const item of this.items) {
            if(!item.loaded) {
                (map[item.type] || (map[item.type] = [])).push(item);
            }
        }
        const promises = [];
        for(const type in map) {
            promises.push(this.context.loadFew(type, map[type]));
        }
        await Promise.all(promises);*/
        const split = this.splitByType();
        const promises = [];
        for(const type in split) {
            promises.push(split[type].load());
        }
        await Promise.all(promises);
        this._clearUnexisting();
        this.loaded = true;
        /*if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }*/
        return this;
    }
    splitByType() {
        const map = {};
        for(const item of this.items) {
            if(!map[item.type]) {
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
        const loaded = await this.context.api.collections[this.type].loadList(this.params);
        this.items = loaded.items.map(object => {
            return this.context.resource(this.type, object.id, object);
        });
        this.meta = loaded.meta;
        this.loaded = true;
        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }

        await this._loadRels();

        return this;
    }
    async checkPermission(operation) {
        await this.load();
        return await ResourcesTypedList.prototype.checkPermission.call(this, operation);
    }
    async clearCache() {
        await this.context.api.collections[this.type].removeListCache(this.params);
    }
}