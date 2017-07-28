
export type ObjectData = any;
export type Schema = any;
export type ListParams = {
    page?: any,
    filter?: any,
    sort?: any,
    fields?: Set<string>
};
export type SyncOrAsync<T> = T | Promise<T>;

export interface ApmeInterface {
    define(name : string, options: ResourceDefinition) : void;
    context(options: ContextOptions) : ContextInterface;
    use(plugin : (apme: ApmeInterface) => any): any;
    collection(name: string) : CollectionInterface;
}

export type RelationLink = {
    one?: ResourceInterface.Loadable;
    many?: ListInterface.Loadable;
};

export interface RelationshipInterface {
    getOne(resource : ResourceInterface.Readable) : Promise<RelationLink>;
    getFew(resources : ResourceInterface.Readable[]) : Promise<RelationLink[]>;
}

export interface CollectionInterface {
    fieldsToGet? : Set<string>;
    rels : {[name: string] : RelationshipInterface};
    packAttrs(object : ObjectData, fieldsSet : Set<string>) : {[attrName: string]: any};
}

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
    generateId?: (data : ObjectData, context : ContextInterface) => string,
    passId?: boolean | ((context : ContextInterface, id : string) => boolean),
    loadOne?: (id: string, context: ContextInterface) => Promise<ObjectData>,
    loadFew?: (ids: string[], context: ContextInterface) => Promise<{[id: string]: ObjectData}>,
    loadList?: (params: ListParams, context: ContextInterface) => Promise<{items: Array<ObjectData>, meta?: any} | Array<ObjectData>>,
    filter?: {
        schema?: Schema
    },
    sort?: {
        schema?: Schema
    },
    page?: {
        schema?: Schema
    },
    update?: (resource: ResourceInterface.Loadable, options: {data: ObjectData, context: ContextInterface}) => Promise<ObjectData>,
    create?: (resource: ResourceInterface.Loadable, options: {data: ObjectData, context: ContextInterface}) => Promise<ObjectData>,
    upsert?: (resource: ResourceInterface.Loadable, options: {data: ObjectData, context: ContextInterface, op: string}) => Promise<ObjectData>,
    remove?: (resource: ResourceInterface.Loadable, options: {context: ContextInterface}) => Promise<boolean>,
    perms?: {
        read?: PermissionDescription,
        write?: PermissionDescription,
        create?: PermissionDescription,
        update?: PermissionDescription,
        remove?: PermissionDescription,
        any?: PermissionDescription
    },
    cache?: CacheInterface,
    listCacheInvalidateKeys?: (params: {filter: any, sort: any, page: any}) => string[],
    rels?: {
        [name: string]: RelationOptions
    }
};

export type PermissionDescription = (
    (
        options: {
            resource: ResourceInterface.Loadable,
            op: string,
            data?: ObjectData,
            context: ContextInterface
        }
    ) => SyncOrAsync<boolean>
) | {
    byContext: (context: ContextInterface) => boolean
} | boolean;

export type PermissionRecord = {
    byContext?: (context: ContextInterface) => SyncOrAsync<boolean>;
    const?: boolean,
    one?: (options: {resource: ResourceInterface.Loadable, context: ContextInterface, op: string, data?: ObjectData}) => SyncOrAsync<boolean>;
    few?: (options: {list: ListInterface.Readable<ListInterface.Typed>, context: ContextInterface, op: string, data?: ObjectData}) => SyncOrAsync<boolean>;
};

export interface CacheInterface {
    get(prefix : string, key : string) : Promise<ObjectData>;
    set(prefix : string, key : string, value : ObjectData) : Promise<void>;
    remove(prefix : string, key : string) : Promise<void>;
    mget(prefix : string, keys : string[]) : Promise<{[key : string]: ObjectData}>;
    mset(prefix : string, few : {[key : string]: ObjectData}) : Promise<void>;
    mremove(prefix : string, keys : string[]) : Promise<void>;
    load(prefix : string, key : string, options : {fast?: boolean}, loader : () => Promise<ObjectData>) : Promise<ObjectData>;
    load(prefix : string, key : string, loader : () => Promise<ObjectData>) : Promise<ObjectData>;
    mload(prefix : string, keys : string[], options : {fast?: boolean}, loader : (keys : string[]) => Promise<ObjectData>) : Promise<{[key : string]: ObjectData}>;
    mload(prefix : string, keys : string[], loader : (keys : string[]) => Promise<ObjectData>) : Promise<{[key : string]: ObjectData}>;
}


// export * from './cache-types';

// export function jsonErrorHandler(options? : {debug?: boolean, errorLog?: (err) => void}): (err, req, res, next) => void;

export interface ContextInterface {
    meta : {
        [key: string]: any
    };
    apme : ApmeInterface;
    req : any;
    privileged : boolean;
    fields : {
        [collection: string]: Set<string>
    };
    setMeta(updates : {[key : string] : any});
    resource(type : string, id? : string, object? : ObjectData) : ResourceInterface.Loadable;
    resources(type : string, ids : string[]) : ListInterface.Loadable<ListInterface.Typed>;
    list(type : string, params : ListParams) : ListInterface.Loadable<ListInterface.TypedQuery>;
    setInvalidate(type : string, keys : string[]) : Promise<void>;
}

export type ContextOptions = {
    req?: any;
    privileged?: boolean;
    meta?: any;
    fields?: {
        [collection: string]: Set<string>
    };
};

export type RelationOptions = {
    toOne?: string
    getIdOne?: (resource: ResourceInterface.Readable) => Promise<string> | string
    getFilterOne?: (resource: ResourceInterface.Readable) => Promise<any> | any
    setIdOne?: (data: ObjectData, value: string) => void
    toMany?: string
    getIdsOne?: (data: ResourceInterface.Readable) => Promise<string[]> | string[]
    loadObjectsOne?: (resource: ResourceInterface.Readable) => Promise<Array<ObjectData>> | Array<ObjectData>
    setIdsOne?: (data: ObjectData, values: string[]) => void
};

export namespace ListInterface {
    export interface Loadable<T = void> {
        context: ContextInterface;
        loaded: boolean;
        load() : Promise<Readable<T>>;
        // loadIdentifiers() : Promise<ResourceInterface.Identifier[]>;
    }

    export interface Readable<T = void> extends Loadable<T> {
        items: ResourceInterface.Readable[];
        splitByType() : {[type : string]: Readable<Typed>};
        include(includeTree : IncludeTree) : Promise<Readable<void>>;
    }

    export interface Typed {
        type: string;
    }

    export interface TypedQuery extends Typed {
        params: ListParams;
        meta: any;
    }
}

/*export interface LoadableResourcesListInterface {
    context: ContextInterface;
    loaded: boolean;
    load(): Promise<ReadableResourcesListInterface>;
}

/*export interface ReadableResourcesListInterface extends LoadableResourcesListInterface {
    meta: {
        [name: string]: any
    };
    items: Array<ResourceInterface>;
    splitByType(): {[type : string]: ReadableResourcesListInterface & TypedResourcesListInterface};
    include(includeTree : IncludeTree) : Promise<ReadableResourcesListInterface>;
}

export interface TypedResourcesListInterface {
    type : string;
}*/

export type IncludeTree = {
    [name: string]: IncludeTree
};

export namespace ResourceInterface {
    export interface Identifier {
        type: string;
        id: string;
    }

    export interface Loadable extends Identifier {
        context: ContextInterface;
        loaded: boolean;
        load(options?: { mustExist?: boolean }): Promise<Readable>;
        update(data: ObjectData): Promise<Readable>;
        create(data: ObjectData): Promise<Readable>;
        remove(): Promise<boolean>;
        clearCache(): Promise<void>;
    }

    export interface Readable extends Loadable {
        exists: boolean;
        data: ObjectData;
        rels: { [name: string]: RelationLink };
        include(includeTree: IncludeTree): Promise<ListInterface.Readable>;
    }
}