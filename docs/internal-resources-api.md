
# class Context

## .resource(type: String, id: String): Resource

## .list(type: String, {filter: Object, page: Object, sort: Object, fields: Object}): ResourcesTypedQuery

# class Resource

## .type: String

## .id: String

## .load(): Promise\<Resource>

## .object: mixed

## .loaded: boolean

Does resource loaded.
If false, this object only points at resource.

## .exists: boolean

Does resource exist.
Property has truthful value only after resource loaded. Before loading it indicates false.

## .pack(fieldSet: Set\<String>): Object

## .update(data: Object): Promise\<Resource>

## .remove(): Promise

## .checkPermission(operation): Promise\<Boolean>

# class ResourcesList

## .load(): Promise\<ResourceList>

## .loaded: boolean

## .push(resource)

## .packItems(fieldLists: Object\<Set\<String>>): Array\<Object>

## .checkPermission(operation): Promise\<Boolean>

# class ResourcesTypedList: ResourcesList

## type: String

# class ResourcesMixedList: ResourcesList

# class ResourcesTypedQuery: ResourcesTypedList

## params: Object