
import {Resource, ResourcesMap, AbstractResourcesList, ResourceTypedQuery, ResourcesTypedList} from './resource';

export class Context {
    constructor(api, {req}) {
        this.api = api;
        this.req = req;
        this._loadedMap = new ResourcesMap();
        this.fields = {};
    }

    resource(type, id, object) {
        if(!id) {
            return new Resource(this, type, null);
        }
        let resource = this._loadedMap.get(type, id);
        if(!resource) {
            resource = new Resource(this, type, id);
            this._loadedMap.add(resource);
        }
        if(object) {
            resource._attachObject(object);
        }
        return resource;
    }

    resources(type, ids) {
        return new ResourcesTypedList(this, type, ids.map(id => this.resource(type, id)));
    }

    // resources

    list(type, params) {
        return new ResourceTypedQuery(this, type, params);
    }

    async setInvalidate(type, keys) {
        await this.api.collections[type].setInvalidate(keys);
    }

    packRefData(value) {
        if(value instanceof Resource) {
            return value.packRef();
        } else if(value instanceof AbstractResourcesList) {
            return value.items.map(resource => resource.packRef());
        } else if(value === null) {
            return null;
        } else {
            throw new Error();
        }
    }

    /**
     * @param {Resource} resource
     * @returns {Resource}
     */
    /*async loadOne(resource) {
        return await this._syncCache.load(resource, () => (
            this.api.collections[type].loadOne(id)
        ));
    }

    async loadList(type, {filter, page, sort}) {
        return await this.api.collections[type].loadList({filter, page, sort});
    }

    async loadFew(type, ids) {
        return await this._syncCache.load(type, ids, rest => (
            this.api.collections[type].loadFew(rest)
        ));
    }

    /*async loadFewMixed(refs) {
        const map = {};
    }*/

    /*async include(aObjects, include) {
        throw new Error('Not implemented');
    }*/

    /*packOne(type, obj, fieldsArr) {
        const res = {
            type,
            id: obj.id,
            attributes: this.api.collections[type].packAttrs(obj)
        };
        return res;
    }

    packFew(type, objs, fieldsObj) {
        return objs.map(obj => this.packOne(type, obj, fieldsObj));
    }

    async packFewMixed(aObjects, fieldsObj) {
        return aObjects.map(({type, obj}) => this.packOne(type, obj, fieldsObj));
    }*/
}