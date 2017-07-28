

/*export abstract class Cache implements CacheInterface {
    abstract get(prefix : string, key : string) : Promise<ObjectData>;
    abstract set(prefix : string, key : string, value : ObjectData) : Promise<void>;
    abstract remove(prefix : string, key : string) : Promise<void>;
    mget(prefix : string, keys : string[]) : Promise<{[key : string]: ObjectData}>;
    mset(prefix : string, few : {[key : string]: ObjectData}) : Promise<void>;
    mremove(prefix : string, keys : string[]) : Promise<void>;
    load(prefix : string, key : string, options : {fast?: boolean}, loader : () => Promise<ObjectData>) : Promise<ObjectData>;
    load(prefix : string, key : string, loader : () => Promise<ObjectData>) : Promise<ObjectData>;
    mload(prefix : string, keys : string[], options : {fast?: boolean}, loader : (keys : string[]) => Promise<ObjectData>) : Promise<{[key : string]: ObjectData}>;
    mload(prefix : string, keys : string[], loader : (keys : string[]) => Promise<ObjectData>) : Promise<{[key : string]: ObjectData}>;
}*/

/*export class SimpleMemoryCache extends Cache {
    constructor(options?: {flushInterval? : number});
    destroy(): void;
    get(prefix : string, key : string) : Promise<ObjectData>;
    set(prefix : string, key : string, value : ObjectData) : Promise<void>;
    remove(prefix : string, key : string) : Promise<void>;
}*/