apme
====

```
Beta
@todo: full documentation
```

Jsonapi server library with validation, relationships and caching on the board.

This library manages jsonapi whilst implementing getters/setters for resources is your task.
It's no matter whether you store data in local db, fetch it from external service(s), or calculate it on the fly.
 
_apme_ manages __toOne__ and __toMany relationships__ itself. You should only implement getters/setters and describe how your resources are connected between each other. Then _apme_ allows you to make complex requests, fetching included resources by single api call.
It could be very useful for building API Gateway in microservices architecture. You should implement accessors for each resource separately (which probably communicate with other services in your infrastructure) and _apme_ combines it into single API.
It tries to call your accessors as few as possible, using caching and batch accessors.

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
app.use('/api', api.expressInitMiddleware(), api.expressJsonApiRouter({
    url: '/api'
}), jsonErrorHandler());

// resource definition
api.define('items', {
    // ... resource definition
});
```

### How to define resource

To define resource use:
```es6
api.define(resourceName, { /* descriptions */ });
```

In description you should provide options and data accessors.

For example, to allow user retrieve a list of items, you should implement method _loadList_:
```es6
api.define('my-resource', {
    loadList: async() => {
        return await myDb.getListOfItems()
    }
});
```

So, now if user requests GET /my-resource it receives list of items.
Your method _loadList_ could receives some request parameters, like _filter_, _page_, _sort_, etc. [see API](doc/define/options.md)

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