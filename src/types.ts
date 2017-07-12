
import {Resource} from "./resource";
import {Context} from "./context";
import {AbstractResourcesList} from "./resources-lists";
import {Cache} from './cache';
export type TSchema = any;

export type TPermissionDescription = ((resource: Resource, operation: string, data?: TObjectData) => boolean)
    | {
        byContext: (context: Context) => boolean
    }
    | boolean;

export type ResourceDefinition = {
    fields?: {
        [name: string] : {
            get?: ((ObjectData) => any) | boolean,
            set?: ((ObjectData, value) => void) | boolean,
            joi?: TSchema,
            schema?: TSchema
        }
    },
    packAttrs?: (object : TObjectData, fieldsSet : Set<string>) => {[attrName: string]: any},
    unpackAttrs?: (data : {[attrName: string]: any}, patch: boolean) => TObjectData,
    getId?: (ObjectData) => string,
    generateId?: (data : TObjectData, context : Context) => string,
    passId?: boolean | ((context : Context, id : string) => boolean),
    loadOne?: (id: string, context: Context) => Promise<TObjectData>,
    loadFew?: (ids: string[], context: Context) => Promise<{[id: string]: TObjectData}>,
    loadList?: (params: TListParams, context: Context) => Promise<{items: Array<TObjectData>, meta?: any} | Array<TObjectData>>,
    filter?: {
        schema?: TSchema
    },
    sort?: {
        schema?: TSchema
    },
    page?: {
        schema?: TSchema
    },
    update?: (resource: Resource, options: {data: TObjectData, context: Context}) => Promise<TObjectData>,
    create?: (resource: Resource, options: {data: TObjectData, context: Context}) => Promise<TObjectData>,
    upsert?: (resource: Resource, options: {data: TObjectData, context: Context, op: string}) => Promise<TObjectData>,
    remove?: (resource: Resource, options: {context: Context}) => Promise<boolean>,
    perms?: {
        read?: TPermissionDescription,
        write?: TPermissionDescription,
        create?: TPermissionDescription,
        update?: TPermissionDescription,
        remove?: TPermissionDescription,
        any?: TPermissionDescription
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
    setIdOne?: (data: TObjectData, value: string) => void
    toMany?: string
    getIdsOne?: (data: Resource) => Promise<string[]> | string[]
    loadObjectsOne?: (resource: Resource) => Promise<Array<TObjectData>> | Array<TObjectData>
    setIdsOne?: (data: Resource, values: string[]) => void
};

export type ContextOptions = {
    req?: any,
    privileged?: boolean,
    meta?: any,
    fields?: {
        [collection: string]: Set<string>
    },

};

export type TObjectData = any;

/*export interface ApmeInterface {
    define(name: string, options: ResourceDefinition) : void;
    context(options: ContextOptions) : ContextInterface;
    expressInitMiddleware() : (req, res, next) => void;
    expressJsonApiRouter({url : string}) : any;
}

export interface ContextInterface {
    setMeta(updates : {[key : string] : any});
    resource(type : string, id? : string, object? : TObjectData) : ResourceInterface;
    resources(type : string, ids : string[]) : LoadableResourcesListInterface & TypedResourcesListInterface;
    list(type : string, params : TListParams) : LoadableResourcesListInterface & TypedResourcesListInterface;
    setInvalidate(type : string, keys : string[]) : Promise<void>;
}

export interface CacheInterface {
    get(prefix : string, key : string) : Promise<TObjectData>;
    set(prefix : string, key : string, value : TObjectData);
    remove(prefix : string, key : string) : Promise<boolean>;
    mget(prefix : string, keys : string[]) : Promise<{[key : string]: TObjectData}>;
    mset(prefix : string, few : {[key : string]: TObjectData}) : Promise<void>;
    mremove(prefix : string, keys : string[]) : Promise<void>;
    load(prefix : string, key : string, options : {fast?: boolean}, loader : () => Promise<TObjectData>) : Promise<TObjectData>;
    // load(prefix : string, key : string, loader : () => Promise<TObjectData>) : Promise<TObjectData>;
    mload(prefix : string, keys : string[], options : {fast?: boolean}, loader : (keys : string[]) => Promise<TObjectData>) : Promise<{[key : string]: TObjectData}>;
    // mload(prefix : string, keys : string[], loader : (keys : string[]) => Promise<TObjectData>) : Promise<{[key : string]: TObjectData}>;
}*/

// resource

/*export interface ResourceInterface {
    id : string;
    type : string;
    context : ContextInterface;
    loaded : boolean;
    exists : boolean;
    data : TObjectData;
    rels : {[relName : string]: TRelationData};
    load(options?: {mustExist?: boolean}): Promise<ResourceInterface>;
    update(data : any) : Promise<ResourceInterface>;
    create(data : any) : Promise<ResourceInterface>;
    remove(): Promise<boolean>;
    include(includeTree : TInclusionTree) : Promise<ReadableResourcesListInterface>;
}*/

// lists

export type TListParams = {
    page?: any,
    filter?: any,
    sort?: any,
    fields?: Set<string>
};

/*export interface LoadableResourcesListInterface {
    context: ContextInterface;
    loaded: boolean;
    load(): Promise<ReadableResourcesListInterface>;
}

export interface ReadableResourcesListInterface extends LoadableResourcesListInterface {
    items: Array<ResourceInterface>;
    packItems() : any;
    splitByType(): {[type : string]: ReadableResourcesListInterface & TypedResourcesListInterface};
    include(includeTree : TInclusionTree) : Promise<ReadableResourcesListInterface>;
    checkPermission(operation : string, context? : ContextInterface) : Promise<boolean>;
}

export interface TypedResourcesListInterface {
    type : string;
}*/