
export type Schema = any;

export type SyncOrAsync<T> = T | Promise<T>;

export type ListParams = {
    page?: any
    filter?: any
    sort?: any
    fields?: Set<string>
};

export type IncludeTree = {
    [name: string]: IncludeTree
};

export type PermissionDescription = ((resource: Resource, operation: string, data?: ObjectData) => boolean)
    | {
    byContext: (context: Context) => boolean
}
    | boolean;

export type ResourceDefinition = {
    fields?: {
        [name: string] : {
            get?: ((ObjectData) => any) | boolean,
            set?: ((ObjectData, value) => void) | boolean,
            schema?: Schema
        }
    },
    packAttrs?: (object : ObjectData, fieldsSet : Set<string>) => {[attrName: string]: any},
    unpackAttrs?: (data : {[attrName: string]: any}, patch: boolean) => ObjectData,
    getId?: (ObjectData) => string,
    generateId?: (data : ObjectData, context : Context) => string,
    passId?: boolean | ((context : Context, id : string) => boolean),
    loadOne?: (id: string, context: Context) => SyncOrAsync<ObjectData>,
    loadFew?: (ids: string[], context: Context) => SyncOrAsync<{[id: string]: ObjectData}>,
    loadList?: (params: ListParams, context: Context) => SyncOrAsync<Array<ObjectData> | {items: Array<ObjectData>, meta?: any}>,
    filter?: {
        schema?: Schema
    },
    sort?: {
        schema?: Schema
    },
    page?: {
        schema?: Schema
    },
    update?: (resource: Resource, options: {data: ObjectData, context: Context}) => SyncOrAsync<ObjectData>,
    create?: (resource: Resource, options: {data: ObjectData, context: Context}) => SyncOrAsync<ObjectData>,
    upsert?: (resource: Resource, options: {data: ObjectData, context: Context, op: string}) => SyncOrAsync<ObjectData>,
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

export type RelationOptions = {
    toOne?: string
    getIdOne?: (resource: Resource) => Promise<string> | string
    getFilterOne?: (resource: Resource) => Promise<any> | any
    setIdOne?: (data: ObjectData, value: string) => void
    toMany?: string
    getIdsOne?: (data: Resource) => Promise<string[]> | string[]
    loadObjectsOne?: (resource: Resource) => SyncOrAsync<Array<ObjectData>>
    setIdsOne?: (data: Resource, values: string[]) => void
};

export type ContextOptions = {
    req?: any,
    privileged?: boolean,
    meta?: any,
    fields?: {
        [collection: string]: Set<string>
    }
};

export type ObjectData = any;

export interface Apme {
    define(name: string, options: ResourceDefinition): void;
    context(options: ContextOptions): Context;
    use(plugin : (apme: Apme) => any) : any;
    collection(name: string) : Collection;
}

export interface Context {
    req: any;
    fields : {[name: string] : Set<string>};
    setMeta(updates: {[key: string]: any});
    resource(type: string, id?: string, object?: ObjectData): Resource;
    resources(type: string, ids: string[]): LoadableResourceList<TypedResourcesList>;
    list(type: string, params: ListParams): LoadableResourceList<TypedResourcesListQuery>;
    setInvalidate(type: string, keys: string[]): Promise<void>;
}

export interface Cache {
    get(prefix: string, key: string): Promise<ObjectData>;
    set(prefix: string, key: string, value: ObjectData);
    remove(prefix: string, key: string): Promise<boolean>;
    mget(prefix: string, keys: string[]): Promise<{[key: string]: ObjectData}>;
    mset(prefix: string, few: {[key: string]: ObjectData}): Promise<void>;
    mremove(prefix: string, keys: string[]): Promise<void>;
    load(prefix: string, key: string, options: {fast?: boolean}, loader: () => Promise<ObjectData>): Promise<ObjectData>;
    // load(prefix : string, key : string, loader : () => Promise<TObjectData>) : Promise<TObjectData>;
    mload(prefix: string, keys: string[], options: {fast?: boolean}, loader: (keys: string[]) => Promise<ObjectData>): Promise<{[key: string]: ObjectData}>;
    // mload(prefix : string, keys : string[], loader : (keys : string[]) => Promise<TObjectData>) : Promise<{[key : string]: TObjectData}>;
}

export interface Resource {
    id: string;
    type: string;
    context: Context;
    loaded: boolean;
    exists: boolean;
    data: ObjectData;
    rels: {[relName: string]: RelationshipData};
    load(options?: {mustExist?: boolean}): Promise<Resource>;
    update(data: any): Promise<Resource>;
    create(data: any): Promise<Resource>;
    remove(): Promise<boolean>;
    include(includeTree: IncludeTree): Promise<ReadableResourcesList>;
}

export interface RelationshipData {

}

export interface Relationship {

}

export interface ResourcesList {
    context: Context;
    loaded: boolean;
}

export interface TypedResourcesList extends ResourcesList{
    type : string;
}

export interface TypedResourcesListQuery extends TypedResourcesList {
    params : ListParams;
    meta : any;
}

export type LoadableResourceList<T> = T & {
    load() : Promise<T & ReadableResourcesList>;
}

export interface ReadableResourcesList extends ResourcesList {
    items: Array<Resource>;
    splitByType() : {[type : string]: TypedResourcesList};
    include(includeTree : IncludeTree) : Promise<ReadableResourcesList>;
}

export interface Collection {
    fieldsToGet? : Set<string>;
    rels : {[name: string] : Relationship};
    packAttrs(object : ObjectData, fieldsSet : Set<string>) : {[attrName: string]: any};
}

export default function(): Apme;