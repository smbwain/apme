
import {Resource, ResourcesMap, AbstractResourcesList, ResourceTypedQuery, ResourcesTypedList} from './resource';

export class Context {
    constructor(api, {req, privileged}) {
        this.api = api;
        this.req = req;
        this.privileged = privileged;
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
}