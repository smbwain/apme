
class Ids {
    constructor() {
        this._cache = {};
    }
    static fromObjectsList(list) {
        const ids = new Ids();
        for(const item of list) {
            ids.push(item.type, item.id);
        }
        return ids;
    }
    push(type, id) {
        (this._cache[type] || (this._cache[type] = new Set())).add(id);
    }
    has(type, id) {
        return !!(this._cache[type] && this._cache[type].has(id));
    }
    loop(handler) {
        for(const type in this._cache) {
            for(const id of this._cache[type]) {
                handler(type, id);
            }
        }
    }
    loopTypes(handler) {
        for(const type in this._cache) {
            handler(type, this._cache[type]);
        }
    }
}

export async function loadAllRelationships(api, context, loadedObjects, includeTree) {
    if(!includeTree) {
        return;
    }

    const includedResult = new ObjectsSyncCache();
    const usedIds = Ids.fromObjectsList(loadedObjects);
    /*const presCache = new PresentationCache();
    for(const object of loadedObjects) {
        presCache.push(object);
    }
    function push(object) {

    }*/

    let includeSets = [
        {
            includeTree,
            ids: Ids.fromObjectsList(loadedObjects)
        }
    ];

    while(includeSets.length) {
        // process many includeSets on each step

        const newIncludeSets = [];
        const needToLoad = new Ids();
        for(const includeSet of includeSets) {
            for(const relName in includeSet.includeTree) {
                let ids;
                if(Object.keys(includeSet.includeTree[relName]).length) {
                    ids = new Ids();
                    newIncludeSets.push({
                        includeTree: includeSet.includeTree[relName],
                        ids
                    });
                }
                includeSet.ids.loop((type, id) => {
                    const object = context.cache.get(type, id);
                    const objectRelationshipData = api.collections[type].getRel(object, relName);
                    if(!objectRelationshipData) {
                        return;
                    }
                    for(const rel of Array.isArray(objectRelationshipData) ? objectRelationshipData : [objectRelationshipData]) {
                        if(ids) {
                            ids.push(rel.type, rel.id);
                        }
                        if(!usedIds.has(rel.type, rel.id)) {
                            needToLoad.push(rel.type, rel.id);
                            usedIds.push(rel.type, rel.id);
                        }
                    }
                });
            }
        }

        includeSets = newIncludeSets;

        const promises = [];
        needToLoad.loopTypes((type, idsSet) => {
            promises.push((async() => {
                const objects = await api.collections[type].loadFew(Array.from(idsSet));
                for(const id in objects) {
                    includedResult.set(type, objects[id]);
                }
            })());
        });
        await Promise.all(promises);
    }

    return includedResult;
}