<a name="apme"></a>
# 3.1. Apme

<a name="apme-define"></a>
## 3.1.1. apme.define(name, options)

Create new collection.

- name: string - name of collection
- options: object - collection options ([see define options section](define.md))

<a name="apme-use"></a>
## 3.1.2. apme.context(options)

<a name="apme-context"></a>
## 3.1.3. apme.context(options)

Create new apme [Context](#Context).

> Usually you shouldn't call this method manually.
  If you use express 
  When you use express. Use _req.apmeContext_ instead.

- options: object = {}
    - req
    - privileged: boolean
    
returns: Context

<a name="Context"></a>
# 3.2. Context

Context allows you to make data requests.

Usually context is created and associated with user request. Context has own cache, so the same resources won't be loaded more than once during user request.

<a name="Context-resource"></a>
## 3.2.1. context.resource()

```js
context.resource(type, id)
```

Get resource instance. Each resource instance will be created once for each context.
If you try to retrieve resource with the same type and id for the same context more than once, you'll still get the same instance.

* type: string
* id: string
* returns [Resource](#Resource)

<a name="Context-resources"></a>
## 3.2.2. context.resources()

```js
context.resources(type, ids)
```

Get list of resources by type and ids.

* type: string
* id: array<string\>
* returns [ResourcesTypedList](#ResourcesTypedList)

<a name="Context-list"></a>
## 3.2.3. context.list()

```js
context.list(type, options)
```

Create list of resource instances.

* type: string
* options: object = {}
    * filter: object
    * page: object
    * sort: object
    * fields: object
* returns [ResourceTypedQuery](#ResourceTypedQuery)

<a name="Context-setInvalidate"></a>
## 3.2.4. context.setInvalidate()

```js
context.setInvalidate(type, keys)
```

* type: string
* keys: array<string\>

<a name="Resource"></a>
# 3.3. Resource

<a name="Resource-type"></a>
## 3.3.1. resource.type

<a name="Resource-id"></a>
## 3.3.2. resource.id

<a name="Resource-load"></a>
## 3.3.3. resource.load()

Load resource data and resource relationships.
If data and relationships are loaded, this method do nothing.
 
Returns promise which resolves with current resource.
Returns: Promise<[Resource](#Resource)\>

<a name="Resource-data"></a>
## 3.3.4. resource.data

Row data
Throws error, if resource isn't loaded or doesn't exist.

<a name="Resource-loaded"></a>
## 3.3.5. resource.loaded

Does resource loaded.

<a name="Resource-exists"></a>
## 3.3.6 resource.exists

Does resource exist.
This property could be read only for loaded resource.

<a name="Resource-update"></a>
## 3.3.7. resource.update()

```js
resource.update(data)
```

* data: object
* returns Promise<[Resource](#Resource)\>

<a name="Resource-create"></a>
## 3.3.8. resource.create()

```js
resource.create(data)
```

* data: object
* returns Promise<[Resource](#Resource)\>

<a name="Resource-remove"></a>
## 3.3.9. resource.remove()

```js
resource.remove()
```

* returns Promise

<a name="Resource-include"></a>
## 3.3.10. resource.include()

```js
resource.include(includeTree)
```

* includeTree: object
* returns Promise<[ResourcesMixedList](#ResourcesMixedList)\>

<a name="lists"></a>
# 3.4. Lists

<a name="AbstractResourcesList"></a>
## 3.4.1. AbstractResourcesList

### 3.4.1.1. list.load()

### 3.4.1.2. list.items

### 3.4.1.3. list.loaded

### 3.4.1.4. list.include()

```js
list.include(includeTree)
```

* includeTree: object
* returns [ResourcesMixedList](#ResourcesMixedList)

<a name="ResourceTypedQuery"></a>
## 3.4.2. ResourceTypedQuery

### 3.4.2.1. list.type

<a name="ResourceTypedQuery"></a>
## 3.4.3. ResourceTypedQuery

<a name="ResourcesMixedList"></a>
## 3.4.4. ResourcesMixedList

