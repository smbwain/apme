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

    