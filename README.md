apme
====

It's under construction yet!

Minimal configuration
---------------------

```es6
import express from 'express';
import bodyParser from 'body-parser';
import {Api, jsonErrorHandler} from '../apme';

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
api.define('book', {
    // ... resource definition
});
```

API
---

### Api.define(name, options)
* {string} __name__
* {object} [__options__ = {}]
    * {async function({filter, page}, context)} [__getList__]
    
         Async function which loads list of items.
         It must return object or throw an error.
         Returned object must contain property _list_ with array of items.
         Returned object may contain property _meta_.
         
    * {async function(id, context)} [__getOne__]
        
         Async function which loads single item.
         It must return object or throw an error.
         Returned object may contain property _one_ with loaded items.
         Returned object may contain property _meta_.
         
    * {function(item, context)} [__packAttrs__]
    
        Function which transforms item to object with resource attributes only.
        This object will be placed in _attributes_ property of jsonapi data.
        
    * {function(attrs, context)} [__unpackAttributes__]
    
        Function which transforms attributes object to item which could be updated or created then.
               
    * {function({action, data}, context)} [__beforeEditOne__]
    * {function(data, context)} [__updateOne__]
    * {function(data, context)} [__createOne__]
    * {function(id, context)} [__deleteOne__]
    * {object} [links = {}]
 
