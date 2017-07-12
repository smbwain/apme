export {Apme} from './apme';
export {jsonErrorHandler} from './errors';
export {Cache, SimpleMemoryCache, SimpleDebugMemoryCache} from './cache';
export function group(arr, field = 'id') {
    const getter = (typeof field == 'function') ? field : data => data[field];
    const map = {};
    for(const item of arr) {
        map[getter(item)] = item;
    }
    return map;
}