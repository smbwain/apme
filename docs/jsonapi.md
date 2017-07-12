
<a name="apme-expressInitMiddleware"></a>
## 3.1.2. apme.expressInitMiddleware()

```js
apme.expressInitMiddleware()
```

Returns express middleware which initializes new [Context](#Context) as _req.apmeContext_. So, next middlewares could use it to make data requests.

```js
import express from 'express';
import {Apme} from 'apme';

const app = express();
const apme = new Apme();
app.use(apme.expressInitMiddleware());
```

<a name="apme-expressJsonApiRouter"></a>
## 3.1.3. apme.expressJsonApiRouter()

```js
apme.expressJsonApiRouter(options)
```

Returns express router, which exposes jsonapi entrypoints.

- _options_: object
    - _url_: string (default: "/") - Url to your api endpoint.
      It will be added to links in responses, so it's better to provide absolute url.

> Make sure you use [apme.expressInitMiddleware](#apme-expressInitMiddleware) in middleware chain before.

```js
import express from 'express';
import {Apme, jsonErrorHandler} from 'apme';

const app = express();
const apme = new Apme();
app.use(
    apme.expressInitMiddleware(),
    apme.expressJsonApiRouter({
        url: 'https://api.example.com/'
    }),
    jsonErrorHandler()
);
```
