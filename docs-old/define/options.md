Define options
==============

cache
-----

loadList
--------

Async function which loads list of items.
It will be called to retrieve elements for GET /:collection request.
```
async function({filter, page, sort, fields})
```
It __must__ return array or object or throw an error.
If it returns object, it __must__ contain property _items_ with array of items.
     
loadOne
-------
    
Async function which loads single object.
(E.g. It will be called to retrieve single element for GET /:collection/:id request)
```
async function(id)
```
It __must__ return object or throw an error.
    
loadFew
-------

Async function which loads few objects by their ids.
It used for loading many resources of the same type at once. E.g. when they used as relationships.
If you implement this method you shouldn't implement method _loadOne_ and vise versa.
```
async function(ids)
``` 
It __must__ return object or throw an error.
Returned object should be key-value map of objects. Where key is id of object. And value is an object.
Returned object should contain only existing objects.
     
packAttrs
---------

Function which transforms object to resource attributes. They will be placed in _attributes_ property of resource json.
```
function(item)
```
By default, all fields of item (except of _id_) will be placed to _attributes_ object.
    
unpackAttrs
-----------

Function which transforms resource attributes to object.
```
function(attrs)
```
              
updateOne
---------

Async function which updates existing element.
It will be called for PATCH /:collection/:id request.
```
async function(id, data, context)
```
This function __must__ return object or throw error.
Returned object be in "after modified" state.

createOne
---------

Async function which creates new element.
It will be called for POST /:collection request
```
async function(id, data, context)
```
This function __must__ return object or throw error.

generateId
----------

removeOne
---------

Async function which deletes element.
It will be used for DELETE /:collection/:id request
```
async function(id, context)
```
    
fields
------

Fields object
    
perms
-----

Defines permissions object.
           
allowSort
---------

```
false - sort not allowed (default)
<string> | <array<string>> - sorting patterns
<function(sortObject)>
<true> - allow sorting by any allowed fields (fields should be defined)
```
      
rels
----

Relations object
    
    