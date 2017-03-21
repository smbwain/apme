
import {forbiddenError, notFoundError} from './errors';
import {ResourcesTypedList} from './resources-lists';

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
    _attachObject(object) {
        this._object = object;
    }

    /**
     * @return {boolean}
     */
    get loaded() {
        return this._object !== undefined /*&& !!this._rels*/;
    }

    /**
     * @deprecated
     * @return {boolean}
     */
    get loadedObject() {
        return this._object !== undefined;
    }

    /**
     * @deprecated
     * @return {boolean}
     */
    get loadedRels() {
        return !!this._rels;
    }

    /**
     * @return {boolean}
     */
    get exists() {
        if(this._object === undefined) {
            throw new Error('Try to read "exists" property of unloaded resource');
        }
        return !!this._object;
    }

    /**
     * @deprecated
     * @return {*}
     */
    get object() {
        if(this._object === undefined) {
            throw new Error('Try to read "object" property of unloaded resource');
        }
        return this._object;
    }

    /**
     * @return {object}
     */
    get data() {
        if(!this._object) {
            if(this._object === undefined) {
                throw new Error('Try to read "data" property of unloaded resource');
            } else {
                throw new Error('Try to read "data" property of resource which doesn\'t exist');
            }
        }
        return this._object;
    }

    /**
     * @return {object}
     */
    get rels() {
        if(!this._rels) {
            throw new Error('Try to read "rels" property of unloaded resource');
        }
        return this._rels;
    }

    /**
     * @return {Resource}
     */
    async load({mustExist = false} = {}) {
        if(this._object === undefined) {
            const collection = this.context.api.collections[this.type];
            const data = (await collection.loadOne(this.id, this.context));
            if(!data && mustExist) {
                throw notFoundError();
            }
            this._attachObject(data || null);
            if(!await this.checkPermission('read')) {
                throw forbiddenError();
            }
        }
        if(!this._rels && this._object) {
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
                if(relData === undefined) {
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
    async update(data) {
        if(!await this.checkPermission('read') || !await this.checkPermission('update', data)) {
            throw forbiddenError();
        }
        const collection = this.context.api.collections[this.type];
        data = await collection._update(this, data, 'update');
        this._attachObject(data);
        await this.clearCache();
        await this._loadRels();
        return this;
    }
    async create(data) {
        if(!await this.checkPermission('read') || !await this.checkPermission('create', data)) {
            throw forbiddenError();
        }
        const collection = this.context.api.collections[this.type];
        data = await collection._create(this, data, 'create');
        this._attachObject(data);
        if(!this.id) {
            this.id = collection.getId(this._object);
            this.context._loadedMap.add(this); // @todo: take off in some event
        }
        await this.clearCache();
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
    async checkPermission(operation, data) {
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
            return await perm.one(this, operation, data);
        }
        return await perm.few(new ResourcesTypedList(this.context, this.type, [this]), operation, data);
    }
    async clearCache() {
        await this.context.api.collections[this.type].removeObjectCache(this.id);
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