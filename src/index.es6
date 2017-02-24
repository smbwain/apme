
export {Api} from './api';
export {jsonErrorHandler} from './errors';
export {Cache, SimpleMemoryCache, SimpleDebugMemoryCache} from './cache';
export function group(arr) {
    const map = {};
    for(const item of arr) {
        map[item.id] = item;
    }
    return map;
}