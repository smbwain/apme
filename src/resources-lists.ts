
import {Resource, ResourcesMap} from './resource';
import {forbiddenError} from './errors';
import {ListParams, PermissionRecord, ListInterface, IncludeTree} from "./types";
import {Context} from './context';

export abstract class AbstractResourcesList implements ListInterface.Readable, ListInterface.Loadable {
    public context: Context;
    public meta : {
        [name: string]: any
    };
    public items: Resource[];
    public loaded: boolean;
    constructor(context : Context, items : Resource[] = []) {
        this.context = context;
        this.items = items;
        this.loaded = false;
    }
    push(resource : Resource) : void {
        this.items.push(resource);
        this.loaded = false;
    }
    _clearUnexisting() {
        this.items = this.items.filter(resource => resource.exists);
        return this;
    }
    abstract splitByType() : {[type : string]: ResourcesTypedList};
    abstract load() : Promise<ListInterface.Readable>;
    /*async loadIdentifiers() : Promise<Resource[]> {
        return this.items;
    }*/
    async include(includeTree : IncludeTree) : Promise<ResourcesMixedList> {
        const includedResult = new ResourcesMixedList(this.context);

        if(!includeTree) {
            return includedResult;
        }

        const usedMap = this.getMap();

        let includeSets : Array<{
            includeTree: IncludeTree,
            list: AbstractResourcesList
        }> = [
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

                            for(const resource of itemRel.one ? [itemRel.one] : itemRel.many ? itemRel.many.items : []) {
                                if(list) {
                                    list.push(resource); // @todo: what about unique
                                }
                                if(!usedMap.get(resource.type, resource.id)) {
                                    needToLoad.push(resource);
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
                includedResult.push(resource);
            }
        }

        return includedResult;
    }
    getMap() : ResourcesMap {
        const map = new ResourcesMap();
        for(const item of this.items) {
            map.add(item);
        }
        return map;
    }
}

export class ResourcesTypedList extends AbstractResourcesList implements ListInterface.Typed {
    public type : string;

    constructor(context, type, items = []) {
        super(context, items);
        this.type = type;
        this.loaded = false;
    }

    push(resource) {
        if(resource.type != this.type) {
            throw new Error('Wrong type');
        }
        super.push(resource);
    }

    async load() {
        if(this.loaded) {
            return this;
        }

        const toLoad = this.items.filter(item => !item.loaded);
        if(toLoad.length) {
            const res = await this.context.apme.collections[this.type].loadFew(toLoad.map(resource => resource.id), this.context);
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
        const items = this.items.filter(item => !item._rels);
        const fields = this.context.fields[this.type];
        for(const item of items) {
            item._rels = {};
        }
        for(const relName in this.context.apme.collections[this.type].rels) {
            if(!fields || fields.has(relName)) {
                (await this.context.apme.collections[this.type].rels[relName].getFew(items)).forEach((related, i) => {
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

    async checkPermission(op : string) {
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
        if(perm.few) {
            return await perm.few({list: this, op, context: this.context});
        }
        for(const resource of this.items) {
            if(!await perm.one({resource, op, context: this.context})) {
                return false;
            }
        }
        return true;
    }
}

export class ResourcesMixedList extends AbstractResourcesList /*implements LoadableResourcesListInterface*/ {
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

export class ResourceTypedQuery extends ResourcesTypedList implements ListInterface.TypedQuery {
    public params : ListParams;
    public meta : any;
    constructor(context, type, params) {
        super(context, type);
        this.params = params;
    }
    async load() {
        if(this.loaded) {
            return this;
        }
        const collection = this.context.apme.collections[this.type];
        const loaded = await collection.loadList(this.params, this.context);
        this.items = loaded.items.map(object => {
            return this.context.resource(this.type, collection.getId(object), object);
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
        await this.load(); // @todo: remove that
        return await ResourcesTypedList.prototype.checkPermission.call(this, operation);
    }
}