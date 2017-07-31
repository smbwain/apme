
export * from './src/types';

import {ApmeInterface, CacheInterface, ObjectData, ResourceInterface} from "./src/types";

export default function() : ApmeInterface;

export namespace errors {
    export function validation(validationError? : any, text? : string) : Error;
    export function unauthorized(str? : string) : Error;
    export function forbidden(str? : string) : Error;
    export function notFound(str? : string) : Error;
    export function badRequest(str? : string) : Error;
    export function methodNotAllowed(str? : string) : Error;
    export function conflict(str? : string) : Error;
}

export function simpleMemoryCache(options?: {flushInterval? : number}) : CacheInterface;

export function jsonApi(options?: {url? : string}) : (apme: ApmeInterface) => any;

export function group<T>(arr : T[], field? : string | ((object: T) => string)) : {[name: string] : T};

export abstract class Cache implements CacheInterface {
    abstract get(prefix : string, key : string) : Promise<ObjectData>;
    abstract set(prefix : string, key : string, value : ObjectData) : Promise<void>;
    abstract remove(prefix : string, key : string) : Promise<void>;
    mget(prefix : string, keys : string[]) : Promise<{[key : string]: ObjectData}>;
    mset(prefix : string, few : {[key : string]: ObjectData}) : Promise<void>;
    mremove(prefix : string, keys : string[]) : Promise<void>;
    load(
        prefix : string,
        key : string,
        options : {fast?: boolean} | (() => Promise<ObjectData>),
        loader? : () => Promise<ObjectData>
    ) : Promise<ObjectData>;
    mload(
        prefix : string,
        keys : string[],
        options : {fast?: boolean} | ((keys : string[]) => Promise<ObjectData>),
        loader? : (keys : string[]) => Promise<ObjectData>
    ) : Promise<{[key : string]: ObjectData}>;
}