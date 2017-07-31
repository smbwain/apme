import {Apme} from './apme';
import {SimpleMemoryCache} from "./cache";
import {ResourceInterface} from "./types";

import * as errors from './errors';
export {errors};

export * from './cache';
export function group<T>(arr : T[], field : string | ((object: T) => string) = 'id') : {[name: string] : T} {
    const getter = (typeof field == 'function') ? field : data => data[field];
    const map = {};
    for(const item of arr) {
        map[getter(item)] = item;
    }
    return map;
}

export function simpleMemoryCache(options?: {flushInterval? : number}) : SimpleMemoryCache {
    return new SimpleMemoryCache(options);
}

export default function () : Apme {
    return new Apme();
};