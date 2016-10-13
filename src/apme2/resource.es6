
import {forbiddenError} from './errors';

export class Resource {
    constructor(context, type, id, object) {
        this.context = context;
        this.type = type;
        this.id = id;
        this.object = object;
        this.rels = {};
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
            this._attachObject( (await this.context.api.collections[this.type].loadOne(this.id)) || null);
            if(!await this.checkPermission('read')) {
                throw forbiddenError();
            }
        }
        return this;
    }
    async loadRel(relName) {
        const rel = this.context.api.collections[this.type].rels[relName];
        if(rel.toOne) {
            this.rels[relName] = await rel.getResourceOne(this);
        } else {
            this.rels[relName] = await rel.getListOne(this);
        }
    }
    pack(fields, urlBuilder) {
        const collection = this.context.api.collections[this.type];
        const data = {
            id: this.id,
            type: this.type,
            attributes: collection.packAttrs(this.object),
            /*links: {
                self: urlBuilder(`${this.type}/${this.id}`)
            }*/
        };
        if(Object.keys(collection.rels).length) {
            data.relationships = {};
            for(const relName in collection.rels) {
                data.relationships[relName] = {
                    links: {
                        self: urlBuilder(`${this.type}/${this.id}/relationships/${relName}`)
                    }
                };
                if(this.rels[relName] instanceof Resource) {
                    data.relationships[relName].data = this.rels[relName].packRef();
                } else if (this.rels[relName] instanceof AbstractResourcesList) {
                    data.relationships[relName].data = this.rels[relName].packRefs();
                }
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
    packRefs() {
        return this.items.map(resource => resource.packRef());
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
                        await typedList.loadRel(relName); // @todo: make it simultaneous
                        for(const item of typedList.items) {
                            const itemRel = item.rels[relName];
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

        const toLoad = this.items.filter(item => !item.loaded);
        if(!toLoad.length) {
            return this;
        }

        const res = await this.context.api.collections[this.type].loadFew(toLoad.map(resource => resource.id));
        for(const resource of toLoad) {
            resource._attachObject(res[resource.id] || null);
        }

        this._clearUnexisting();
        this.loaded = true;
        if(!await this.checkPermission('read')) {
            throw forbiddenError();
        }
        return this;
    }
    async loadRel(relName) {
        (await this.context.api.collections[this.type].rels[relName].getFew(this.items)).forEach((related, i) => {
            this.items[i].rels[relName] = related;
        });
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