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
        
    * {object} perms
       
        ```
        read(context, object)
        write(context, object)
        create(context, object)
        update(context, object)
        passCustomId(context, object)
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
        
        