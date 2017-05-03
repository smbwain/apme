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