apme
====

jsonapi server oriented on API Gateway development. The aim is to give you control on jsonapi actions flow, instead of connecting api automatically to some particular database.

This library manages jsonapi whilst implementing getters/setters for data is your task. It's no matter whether you store data in local db or you generate it on the fly, maybe requesting some other services.
 
_apme_ automatically manages __toOne__ and __toMany relationships__ which could be very useful for building API Gateway in microservices architecture. You should implement accessors for each resource separately (which probably communicate with other services in your infrastructure) and _apme_ combines it into single api. 

```
@todo: add links support
@todo: add direct relationships support (GET /articles/1/relationships/comments)
@todo: add sample project
```

Minimal configuration
---------------------

```es6
import express from 'express';
import bodyParser from 'body-parser';
import {Api, jsonErrorHandler} from 'apme';

// express application
const app = express();

// body parser to parse json in request body
app.use(bodyParser.json({
    type: req => {
        const contentType = req.get('content-type');
        return contentType == 'application/json' || contentType == 'application/vnd.api+json';
    }
}));

// api and error handling
const api = new Api();
app.use('/api', api.expressRouter(), jsonErrorHandler());

// resource definition
api.define('books', {
    // ... resource definition
});
```

How to define resource
----------------------

To define resource use:
```es6
api.define(resourceName, { /* descriptions */ });
```

In description you should provide options and data accessors.

For example, to allow user retrieve a list of items, you should implement method _getList_:
```es6
api.define('my-resource', {
    getList: async() => ({
        list: await myDb.getListOfItems()
    })
});
```

So, now if user requests GET /my-resource it receives list of items.
In your method getList you could also use some request parameters, like _filter_, _page_, _sort_, etc, to return only what client needs. [see API](#API)

Relationships
-------------

```es6
api.define('books', {
    // ...
    rels: {
        author: {
            type: 'authors',
            getId: book => book.authorId,
            setId: (id, book) => {
                book.authorId = id;
            }
        },
        parts: {
            type: 'book-parts',
            getIds: book => book.partsIds,
            setIds: (ids, book) => {
                book.partsIds = ids;
            }
        }
    }
});
```

API
---

### Api

#### Api.define(name, options)
* {string} __name__
    
    Name of collection.
    
* {object} __options__

    Object with options. Default = {}.

    * {function} __loadList__
    
        Async function which loads list of items.
        It will be called to retrieve elements for GET /:collection request.
        ```
        async function({filter, page, sort, fields})
        ```
        It __must__ return array or object or throw an error.
        If it returns object, it __must__ contain property _list_ with array of items.
         
    * {function} __loadOne__
        
        Async function which loads single object.
        (E.g. It will be called to retrieve single element for GET /:collection/:id request)
        ```
        async function(id)
        ```
        It __must__ return object or throw an error.
        
    * {function} __loadFew__
    
        Async function which loads many objects by their ids.
        It used on loading many resources of the same type at once. E.g. when they used in some toMany relationship.
        By default, there is _getOne_ method is called serially.
        
        If you specify this method you could not specify _getOne_.
        If there is _getFew_, but no _getOne_, then _getFew_ method will be used to load single object.
         
    * {function} __packAttrs__
    
        Function which transforms object to resource attributes. They will be placed in _attributes_ property of resource json.
        ```
        function(item, context)
        ```
        By default, all fields of item (except of _id_) will be placed to _attributes_ object.
        
    * {function} __unpackAttrs__
    
        Function which transforms resource attributes to object.
        ```
        function(attrs, context)
        ```
               
    * --- {function} __beforeEditOne__
    
        Async function which will be called before any attempt to write anything. (POST, PATCH, DELETE requests).
        ```
        async function({action, data}, context)
        ```
        _action_ is string with value 'create', 'update' or 'delete'.
        If _action_ is 'create' or 'update', _data_ contains deserialized item.
        If _action_ is 'update', _data_ __also__ contains _id_ field.
        If _action_ is 'delete', _data_ contains __only__ _id_ field.
        
    * {function} __updateOne__
   
        Async function which updates existing element.
        It will be called for PATCH /:collection/:id request.
        ```
        async function(data, context)
        ```
        This function __must__ return object or throw error.
        ?? Returned object __must__ contain property _one_ with modified item containing all fields (not only patched ones).
        ?? Returned object __may__ contain property _meta_.

    * {function} __createOne__
    
        Async function which creates new element.
        It will be called for POST /:collection request
        ```
        async function(data, context)
        ```
        This function __must__ return object or throw error.
        ?? Returned object __must__ contain property _one_ with created item containing all fields (including default ones, not passed in request).
        ?? Returned object __may__ contain property _meta_.
    
    * {function} __deleteOne__
    
        Async function which deletes element.
        It will be used for DELETE /:collection/:id request
        ```
        async function(id, context)
        ```
        
    * {object} access
       
        ```
        read(obj, context)
        write(obj, context)
        create(obj, context)
        update(obj, context)
        passCustomId(obj, context)
        ```        
       
    * {mixed} __allowSort__
    
        ```
        false - sort not allowed (default)
        \<string> | \<array\<string>> - sorting patterns
        \<function(sortObject)>
        \<true> - allow sorting by any allowed fields (_allowFields_ should be defined)
        ```
       
    * {array\<string>} __allowFields__
      
        List of fields. It impacts on default packAttrs, unpackAttrs, allowSort.
        
    * {object} __rels__
        
        * {string} __type__
        
        Type of related resource(s). Use it in the case when type of related resource(s) is always the same.
        
        * {function} __getId__
        
        Use it (together with option _type_) to make __to one__ relationship. 
        ```
        function(obj)        
        ```
        It should return id of related resource or null, if there is no resource related.
        
        * {function} __getIds__
        
        Use it (together with option _type_) to make __to many__ relationship.
        ```
        function(obj)        
        ```
        It should return array with related resources ids. If there are no resources related, it should return empty array.
        
        * {function} __getRef__
        
        Use it to make __to one__ relationship, if there are resources of different types could be linked.
        ```
        function(obj)        
        ```
        It should return reference object {type: \<resourceName>, id: \<id>} or null, if there is no related object.
        
        * {function} __getRefs__
        
        Use it to make __to many__ relationship, if there are resources of different types could be linked.
        ```
        function(obj)        
        ```
        It should return array of reference objects \[{type: \<resourceName>, id: \<id>}, ...]. If there are no resources related, empty array should be returned.
        
        * {function} __setId__
        
        ```
        function(id, obj)
        ```
        
        * {function} __setIds__
        
        ```
        function(ids, obj)
        ```
        
        * {function} __setRef__
        
        ```
        function(ref, obj)
        ```
        
        * {function} __setRefs__
        
        ```
        function(refs, obj)
        ```
        
        * {function} __addIds__
        
        ```
        async function(ids, obj)
        ```
        
        * {function} __removeIds__
        
        ```
        async function(ids, obj)
        ```
        
        * {function} __addRefs__
        
        ```
        async function(refs, obj)
        ```
        
        * {function} __removeRefs__
        
        ```
        async function(refs, obj)
        ```
        
        * {function} __load__
        
        ```
        async function(obj, context)
        ```
        It __should__ return related object or null.
        
        * {function} __loadMixed__
        
        ```
        async function(obj, context)
        ```
        It __should__ return related aObject or null.
        
        * {function} __loadList__
        
        ```
        async function(obj, {filter, page, sort, fields}, context)
        ```
        It __should__ return List\<object> 
        
        * {function} __loadListMixed__
        
        ```
        async function(obj, {filter, page, sort, fields}, context)
        ```
        It __should__ return List\<aObject>
        
        * {function} __toFilter__
        
        ```
        function(obj, context)
        ```