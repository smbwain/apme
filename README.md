apme
====

jsonapi server oriented on API Gateway development. The aim is to give you control on jsonapi actions flow, instead of connecting api automatically to some particular database.

This library manages jsonapi whilst implementing getters/setters for data is your task. It's no meter whether you store data in local db or you generate it on the fly, maybe requesting some other services.
 
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
            setId: id => ({
                authorId: id
            })
        },
        parts: {
            type: 'book-parts',
            getIds: book => book.partsIds,
            setIds: ids => ({
                partsIds: ids
            })
        }
    }
});
```

API
---

### Api.define(name, options)
* {string} __name__
    
    Name of collection.
    
* {object} __options__

    Object with options. Default = {}.

    * {function} __getList__
    
        Async function which loads list of items.
        It will be called to retrieve elements for GET /:collection request.
        ```
        async function({filter, page, sort, fields}, context)
        ```
        It __must__ return object or throw an error.
        Returned object __must__ contain property _list_ with array of items.
        Returned object __may__ contain property _meta_.
         
    * {function} __getOne__
        
        Async function which loads single item.
        It will be called to retrieve single element for GET /:collection/:id request.
        ```
        async function(id, context)
        ```
        It __must__ return object or throw an error.
        Returned object __may__ contain property _one_ with loaded item.
        Returned object __may__ contain property _meta_.
         
    * {function} __packAttrs__
    
        Function which transforms (serialize) item to object with resource attributes only.
        This object will be placed in _attributes_ property of jsonapi data.
        ```
        function(item, context)
        ```
        By default, all fields of item (except of _id_) will be placed to _attributes_ object.
        
    * {function} __unpackAttributes__
    
        Function which transforms (deserialize) attributes object to item which could be updated or created then.
        ```
        function(attrs, context)
        ```
               
    * {function} __beforeEditOne__
    
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
        Returned object __must__ contain property _one_ with modified item containing all fields (not only patched ones).
        Returned object __may__ contain property _meta_.

    * {function} __createOne__
    
        Async function which creates new element.
        It will be called for POST /:collection request
        ```
        async function(data, context)
        ```
        This function __must__ return object or throw error.
        Returned object __must__ contain property _one_ with created item containing all fields (including default ones, not passed in request).
        Returned object __may__ contain property _meta_.
    
    * {function} __deleteOne__
    
        Async function which deletes element.
        It will be used for DELETE /:collection/:id request
        ```
        async function(id, context)
        ```
        
    * {boolean} __passId__
    
       Allow user to pass own id on new item creation.
        
    * {object} __rels__
