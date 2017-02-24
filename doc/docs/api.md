
# Api

## .define(name, options)

Creates new resource type.

- name: String - Name of resources
- options: Object - Resource options. Possible options are [here](define/options.md)

## .expressInitMiddleware()

## .expressJsonApiRouter(options)

Returns express router, which could be used as express middleware in app.use method.

- options: Object = {}
    - url: string = "/" - Url to your api endpoint.
        It will be added to links in responses, so it's better to provide absolute url.

## .context(options)

Create new apme context. Context allow you to make actions on resources.

__Usually you shouldn't call this method manually in the context of express user request.
Just use _req.apmeContext_ instead.__

- options: object = {}
    - req
    - privileged: boolean
    
returns: Context

# Context

## .resource(type, id)

Get resource instance. Each resource instance for each context will be created once.
If you try to retrieve resource with the same type and id with that context next time, you'll get the same instance.

- type: String
- id: String

Returns: Resource

## .resources(type, ids)

Get list of resources by type and ids.

- type: String
- id: Array\<String>

## .list(type, options)

Create list of resource instances.

- type: string
- options: object = {}
    - filter: object
    - page: object
    - sort: object
    - fields: object
    
Returns: ResourcesTypedQuery

## .setInvalidate(type, keys)

## .packRefData(value)

# Resource

## .type: String

## .id: String

## .load()

Load resource data and resource relationships.
If data and relationships are loaded, this method do nothing.
 
Returns promise which resolves with current resource.
Returns: Promise\<Resource>

## .object: mixed

Row data of resource instance.
It's null for unexisting object.

## .loaded: boolean

Does resource loaded.

## .exists: boolean

Does resource exist.
This property could be read only for loaded resource.

## .pack(fieldSet)

- fieldSet: Set\<String\>

Returns: object

## .update(data)

Returns: Promise\<Resource>

## .create(data)

Returns: Promise\<Resource>

## .remove()

Returns: Promise

## .include(includeTree)

Returns: Promise\<ResourcesMixedList>

## .checkPermission(operation)

Returns: Promise\<Boolean>

# ResourcesList

## .load()

Returns: Promise\<ResourceList>

## .loaded: boolean

## .push(resource)

## .packItems(fieldLists: Object\<Set\<String>>): Array\<Object>

## .checkPermission(operation): Promise\<Boolean>

# ResourcesTypedList: ResourcesList

## type: String

# ResourcesMixedList: ResourcesList

# ResourcesTypedQuery: ResourcesTypedList

## params: Object
