
interface Apme {
    define(name : string, options: ResourceDefinition) : void;
    context(options: ContextOptions) : Context;
    use<ApmePlugin>(plugin : ApmePluginHandler<ApmePlugin>) : ApmePlugin;
}

type ApmePluginHandler<ApmePlugin> = (apme: Apme) => ApmePlugin;

interface Context {
    apme : Apme;
    req : any;
    privileged : boolean;
    meta: {[name: string]: any};
    setMeta(updates : {[name: string]: any}): void;
    resource(type : string, id? : string) : Resource;
    resources(type : string, ids : string[]) : ResourcesTypedList;
    list(type : string, params : ListParams) : ResourceTypedQuery;
    setInvalidate(type : string, keys : string[]) : Promise<void>;
}

interface Resource {
    context : Context;
    type : string;
    id : string;
    loaded : boolean;
    exists : boolean;
    data : ResourceData;
    rels : {[name: string]: Resource | ResourcesMixedList};
    load(options?: {mustExist? : boolean}) : Promise<Resource>;
    update(data : ResourceData) : Promise<Resource>;
    create(data : ResourceData) : Promise<Resource>;
    remove() : Promise<Resource>;
    include(includeTree : IncludeTree) : Promise<ResourcesMixedList>;
}

interface ResourcesList {
    context: Context;
    items: Array<Resource>;
    loaded: boolean;
    splitByType() : {[type : string]: ResourcesTypedList};
    include(includeTree: IncludeTree) : Promise<ResourcesMixedList>;
    load(): Promise<ResourcesList>;
}

interface ResourcesTypedList extends ResourcesList {
    type : string;
}

interface ResourcesMixedList extends ResourcesList {
}

interface ResourceTypedQuery extends ResourcesTypedList  {
    params : ListParams;
}

interface Cache {
    get(prefix : string, key : string) : SyncOrAsync<ResourceData>;
    set(prefix : string, key : string, value : ResourceData) : SyncOrAsync<void>;
    remove(prefix : string, key : string) : SyncOrAsync<boolean>;
    mget(prefix : string, keys : string[]) : SyncOrAsync<TypedResourceDataDictionary>;
    mset(prefix : string, few : {[key : string]: ResourceData}) : SyncOrAsync<void>;
    mremove(prefix : string, keys : string[]) : SyncOrAsync<void>;
    load(prefix : string, key : string, loader : () => SyncOrAsync<ResourceData>) : SyncOrAsync<ResourceData>;
    load(prefix : string, key : string, options : {fast?: boolean}, loader : () => SyncOrAsync<ResourceData>) : SyncOrAsync<ResourceData>;
    mload(prefix : string, keys : string[], loader : (keys : string[]) => SyncOrAsync<TypedResourceDataDictionary>) : SyncOrAsync<TypedResourceDataDictionary>;
    mload(prefix : string, keys : string[], options : {fast?: boolean}, loader : (keys : string[]) => SyncOrAsync<TypedResourceDataDictionary>) : SyncOrAsync<TypedResourceDataDictionary>;
}

type ResourceData = {
    [name: string]: any
};

type ListParams = {
    page?: any,
    filter?: any,
    sort?: any,
    fields?: Set<string>
};

type IncludeTree = {[name: string]: IncludeTree};

type ContextOptions = {
    req?: any,
    privileged?: boolean,
    meta?: any,
    fields?: {
        [collection: string]: Set<string>
    }
};

type SyncOrAsync<T> = Promise<T> | T;

type ResourceDefinition = {
    fields?: {
        [name: string] : {
            get?: ((ObjectData) => any) | boolean,
            set?: ((ObjectData, value) => void) | boolean,
            joi?: Schema,
            schema?: Schema
        }
    },
    packAttrs?: (object : ResourceData, fieldsSet : Set<string>) => any,
    unpackAttrs?: (data : any, patch: boolean) => ResourceData,
    getId?: (data: ResourceData) => string,
    generateId?: (data : ResourceData, context : Context) => string,
    passId?: boolean | ((context : Context, id : string) => boolean),
    loadOne?: (id: string, context: Context) => SyncOrAsync<ResourceData>,
    loadFew?: (ids: string[], context: Context) => SyncOrAsync<{[id: string]: ResourceData}>,
    loadList?: (params: ListParams, context: Context) => SyncOrAsync<{items: Array<ResourceData>, meta?: any} | Array<ResourceData>>,
    filter?: {
        schema?: Schema
    },
    sort?: {
        schema?: Schema
    },
    page?: {
        schema?: Schema
    },
    update?: (resource: Resource, options: {data: ResourceData, context: Context, op: string}) => SyncOrAsync<ResourceData>,
    create?: (resource: Resource, options: {data: ResourceData, context: Context, op: string}) => SyncOrAsync<ResourceData>,
    upsert?: (resource: Resource, options: {data: ResourceData, context: Context, op: string}) => SyncOrAsync<ResourceData>,
    remove?: (resource: Resource, options: {context: Context}) => SyncOrAsync<boolean>,
    perms?: {
        read?: PermissionDescription,
        write?: PermissionDescription,
        create?: PermissionDescription,
        update?: PermissionDescription,
        remove?: PermissionDescription,
        any?: PermissionDescription
    },
    cache?: Cache,
    listCacheInvalidateKeys?: (params: {filter: any, sort: any, page: any}) => string[],
    rels?: {
        [name: string]: RelationOptions
    }
};

type Schema = any;

type PermissionDescription = ((resource: Resource, operation: string, data?: ResourceData) => boolean) | {
    byContext: (context: Context) => boolean
} | boolean;

type RelationOptions = {
    toOne?: string
    getIdOne?: (resource: Resource) => string
    getFilterOne?: (resource: Resource) => any
    setIdOne?: (data: ResourceData, value: string) => void
    toMany?: string
    getIdsOne?: (data: Resource) => string[]
    loadObjectsOne?: (resource: Resource) => SyncOrAsync<Array<ResourceData>>
    setIdsOne?: (data: Resource, values: string[]) => void
};

type TypedResourceDataDictionary = {
    [id: string]: ResourceData
}

declare function apme() : Apme;
