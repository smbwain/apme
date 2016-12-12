
# class Api

## api.define(name, options)

Creates new resource type.

- name: string - Name of resources
- options: object - Resource options. Possible options are [here](define/options.md)

## api.expressRouter(options)

Returns express router, which could be used as express middleware in app.use method.

- options: object = {}
    - url: string = "/" - Url to your api endpoint.
        It will be added to links in responses, so it's better to provide absolute url.

## api.context(options)

Creates context to make some manual actions with api resources.

- options: object = {}
    - req
    - privileged: boolean
    
Returns: Context

# class Context

## context.resource(type, id)

Create single instance of resource

- type: string
- id: string

Returns: Resource

## context.resources(type, ids)

## context.list(type, options)

Create list of resource instances.

- type: string
- options: object = {}
    - filter: object
    - page: object
    - sort: object
    - fields: object
    
Returns: ResourcesTypedQuery

## context.setInvalidate(type, keys)

## context.packRefData(value)

# class Resource

## resource.type: String

## resource.id: String

## resource.load()

Load resource data and resource relationships.
If data and relationships are loaded, this method do nothing.
 
Returns promise which resolves with current resource.
Returns: Promise\<Resource>

## resource.object: mixed

Row data of resource instance.
It's null for unexisting object.

## resource.loaded: boolean

Does resource loaded.

## resource.exists: boolean

Does resource exist.
This property could be read only for loaded resource.

## resource.pack(fieldSet)

- fieldSet: Set\<String>

Returns: object

## resource.update()

Returns: Promise\<Resource>

## resource.create()

Returns: Promise\<Resource>

## resource.remove()

Returns: Promise

## resource.include(includeTree)

## resource.checkPermission(operation): Promise\<Boolean>

# class ResourcesList

## resourcesList.load()

Returns: Promise\<ResourceList>

## resourcesList.loaded: boolean

## resourcesList.push(resource)

## resourcesList.packItems(fieldLists: Object\<Set\<String>>): Array\<Object>

## resourcesList.checkPermission(operation): Promise\<Boolean>

# class ResourcesTypedList: ResourcesList

## type: String

# class ResourcesMixedList: ResourcesList

# class ResourcesTypedQuery: ResourcesTypedList

## params: Object