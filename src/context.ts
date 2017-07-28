
import {Resource, ResourcesMap} from './resource';
import {AbstractResourcesList, ResourceTypedQuery, ResourcesTypedList} from './resources-lists';
import {Apme} from './apme';
import {ContextInterface, ContextOptions, ListParams} from "./types"

export class Context implements ContextInterface {
    public meta : {
        [key: string]: any
    } = {};
    public apme : Apme;
    public req : any;
    public privileged : boolean;
    public loadedMap : ResourcesMap = new ResourcesMap();
    public fields;

    constructor(apme : Apme, {req, privileged = false, fields = {}, meta = {}} : ContextOptions) {
        this.apme = apme;
        this.req = req;
        this.privileged = privileged;
        this.fields = fields;
    }

    /**
     * @param {Object.<string, Iterable.<string>>} fields
     */
    forceFields(fields) {
        for(const collectionName in fields) {
            if(this.fields[collectionName]) {
                this.fields[collectionName] = new Set([...this.fields[collectionName], ...fields[collectionName]]);
            }
        }
    }

    setMeta(updates) {
        this.meta = {
            ...this.meta,
            ...updates
        };
    }

    resource(type : string, id? : string, object? : any) : Resource {
        if(!this.apme.collections[type]) {
            throw new Error(`Unknown collection`);
        }
        if(!id) {
            return new Resource(this, type, null);
        }
        let resource = this.loadedMap.get(type, id);
        if(!resource) {
            resource = new Resource(this, type, id);
            this.loadedMap.add(resource);
        }
        if(object) {
            resource._attachObject(object);
        }
        return resource;
    }

    resources(type : string, ids : string[]) : ResourcesTypedList {
        if(!this.apme.collections[type]) {
            throw new Error(`Unknown collection`);
        }
        return new ResourcesTypedList(this, type, ids.map(id => this.resource(type, id)));
    }

    // resources

    list(type : string, params : ListParams) : ResourceTypedQuery {
        return new ResourceTypedQuery(this, type, params);
    }

    async setInvalidate(type : string, keys : string[]) : Promise<void> {
        await this.apme.collections[type].setInvalidate(keys);
    }
}