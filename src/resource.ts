
import * as errors from './errors';
import {ResourcesTypedList, AbstractResourcesList} from './resources-lists';
import {Collection} from "./collection";
import {Context} from './context';
import {ObjectData, PermissionRecord, ResourceInterface} from "./types";

/*function filterFields(obj, fields) {
    if(!fields) {
        return obj;
    }
    const res = {};
    for(const name in fields) {
        res[name] = obj[name];
    }
    return res;
}*/

export class Resource implements ResourceInterface.Readable, ResourceInterface.Loadable {
    public context : Context;
    public type : string;
    public id : string;
    private _object : any;
    public _rels : {
        [name: string]: {
            one?: Resource,
            many?: AbstractResourcesList
        }
    } = null;

    constructor(context, type, id, object?) {
        this.context = context;
        this.type = type;
        this.id = id;
        this._object = object;
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
            const collection = this.context.apme.collections[this.type];
            const data = (await collection.loadOne(this.id, this.context));
            if(!data && mustExist) {
                throw errors.notFound();
            }
            this._attachObject(data || null);
            if(!await this.checkPermission('read')) {
                throw errors.forbidden();
            }
        }
        if(!this._rels && this._object) {
            await this._loadRels();
        }
        return this;
    }

    async _loadRels() {
        const collection = this.context.apme.collections[this.type];
        const fields = this.context.fields[this.type];
        this._rels = {};
        for(const relName in collection.rels) {
            if(!fields || fields.has(relName)) {
                const rel = this.context.apme.collections[this.type].rels[relName];
                this._rels[relName] = await rel.getOne(this);
            }
        }
    }
    async update(data) {
        if(!await this.checkPermission('update', data)) {
            throw errors.forbidden();
        }
        const collection = this.context.apme.collections[this.type];
        data = await collection.update(this, data);
        this._attachObject(data);
        await this.clearCache();
        await this._loadRels();
        return this;
    }
    async create(data) {
        if(!await this.checkPermission('create', data)) {
            throw errors.forbidden();
        }
        const collection = this.context.apme.collections[this.type];
        data = await collection.create(this, data);
        this._attachObject(data);
        if(!this.id) {
            this.id = collection.getId(this._object);
            this.context.loadedMap.add(this); // @todo: take off in some event
        }
        await this.clearCache();
        await this._loadRels();
        return this;
    }
    async remove() {
        if(!await this.checkPermission('read') || !await this.checkPermission('remove')) {
            throw errors.forbidden();
        }
        return await this.context.apme.collections[this.type].remove(this);
    }
    async include(includeTree) {
        return await (new ResourcesTypedList(this.context, this.type, [this])).include(includeTree);
    }
    async checkPermission(op : string, data? : ObjectData) {
        if(this.context.privileged) {
            return true;
        }

        const perm : PermissionRecord = this.context.apme.collections[this.type].perms[op];
        if(perm.const != null) {
            return perm.const;
        }
        if(perm.byContext) {
            return await perm.byContext(this.context);
        }
        if(perm.one) {
            return await perm.one({resource: this, op, data, context: this.context});
        }
        return await perm.few({list: new ResourcesTypedList(this.context, this.type, [this]), op, data, context: this.context});
    }
    async clearCache() {
        await this.context.apme.collections[this.type].removeObjectCache(this.id);
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
    private map : {
        [type: string]: {
            [id: string]: Resource
        }
    } = {};
    add(resource: Resource) : void {
        (this.map[resource.type] || (this.map[resource.type] = {}))[resource.id] = resource;
    }
    get(type : string, id : string) : Resource {
        return this.map[type] && this.map[type][id];
    }
    loopTypes(handler: (type: string, resources: {[id: string]: Resource}) => void) {
        for(const type in this.map) {
            handler(type, this.map[type]);
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