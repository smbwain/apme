apme
====

```
Alpha testing
@todo: documentations
```

Jsonapi server library with relationships and caching on the board.

The aim is to give you control over jsonapi actions flow, instead of connecting api directly to some particular database.
This library manages jsonapi whilst implementing getters/setters for resources is your task. It's no matter whether you store data in local db or you calculate it on the fly.
 
_apme_ manages __toOne__ and __toMany relationships__ which could be very useful for building API Gateway in microservices architecture. You should implement accessors for each resource separately (which probably communicate with other services in your infrastructure) and _apme_ combines it into single api. 

Short description
-----------------

### Minimal configuration

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
app.use('/api', api.expressRouter({
    url: '/api'
}), jsonErrorHandler());

// resource definition
api.define('books', {
    // ... resource definition
});
```

### How to define resource

To define resource use:
```es6
api.define(resourceName, { /* descriptions */ });
```

In description you should provide options and data accessors.

For example, to allow user retrieve a list of items, you should implement method _getList_:
```es6
api.define('my-resource', {
    loadListOne: async() => {
        return await myDb.getListOfItems()
    }
});
```

So, now if user requests GET /my-resource it receives list of items.
Your method loadListOne receives some request parameters, like _filter_, _page_, _sort_, etc. [see API](#API)

### Relationships

```es6
api.define('books', {
    // ...
    rels: {
        author: {
            toOne: 'authors',
            getIdOne: book => book.authorId,
            setIdOne: (id, book) => {
                book.authorId = id;
            }
        },
        parts: {
            toMany: 'book-parts',
            getIdsOne: book => book.partsIds,
            setIdsOne: (ids, book) => {
                book.partsIds = ids;
            }
        }
    }
});
```

API
---

[see API](docs/api.md)