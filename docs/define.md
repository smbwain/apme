<a name="fields"></a>
# 4.1. fields

> _fields_ property coudn’t be used together with _packAttrs_ or _unpackAttrs_


<a name="fields-get"></a>
## 4.1.1. fields[].get


<a name="fields-set"></a>
## 4.1.2. fields[].set


<a name="fields-schema"></a>
## 4.1.3. fields[].schema

<a name="packAttrs"></a>
# 4.2. packAttrs

> _fields_ property coudn’t be used together with _packAttrs_ or _unpackAttrs_


<a name="unpackAttrs"></a>
# 4.3. unpackAttrs

> _fields_ property coudn’t be used together with _packAttrs_ or _unpackAttrs_


<a name="getId"></a>
# 4.4. getId


<a name="generateId"></a>
# 4.5. generateId


<a name="passId"></a>
# 4.6. passId


<a name="loadOne"></a>
# 4.7. loadOne


<a name="loadFew"></a>
# 4.8. loadFew


<a name="loadList"></a>
# 4.9. loadList


<a name="filter"></a>
# 4.10. filter


<a name="sort"></a>
# 4.11. sort


<a name="page"></a>
# 4.12. page


<a name="update"></a>
# 4.13. update

```
async function update(resource, {data, context})
```

* resource: [Resource](resource.md)
* data: object
* context: [Context](context.md)
* return updated [native object](get-started.md#presentations-native)


> _upsert_ property coudn’t be used together with _update_ or _create_


<a name="create"></a>
# 4.14. create

```
async function create(resource, {data, context})
```

* resource: [Resource](resource.md)
* data: object
* context: [Context](context.md)
* return created [native object](get-started.md#presentations-native)

> _upsert_ property coudn’t be used together with _update_ or _create_


<a name="upsert"></a>
# 4.15. upsert

```
async function upsert(resource, {data, op, context})
```

* resource: [Resource](resource.md)
* data: object
* op: string
* context: [Context](context.md)
* return upserted [native object](get-started.md#presentations-native)

> _upsert_ property coudn’t be used together with _update_ or _create_


<a name="remove"></a>
# 4.16. remove

```
async function remove(resource, {context})
```

* resource: [Resource](resource.md)
* context: [Context](context.md)
* return boolean


<a name="perms"></a>
# 4.17. perms


<a name="cache"></a>
# 4.18. cache


<a name="listCacheInvalidateKeys"></a>
# 4.19. listCacheInvalidateKeys


<a name="rels"></a>
# 4.20. rels

## 4.20.1. toOne

## 4.20.2. toMany