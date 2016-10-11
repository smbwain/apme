
Each relation has name.

Relation options
================

* Relationship could be ___toOne___ or ___toMany___.

    It's clear.

* Relationship could be ___typed___ or ___untyped___.

    ___Typed___ relationship could join record with another record(s) of __some predefined type__.
    E.g. type _books_ has relationship _owner_. Owner always has type _users_.
    ___Untyped___ relationship could join record with another record(s) of __different types__.
    E.g. type _users_ has relationship _ownedObjects_. Owned object could have type _book_, _car_ or _laptop_.
    
Depending on is a relationship _toOne_ or _toMany_ and is it _typed_ or _untyped_,
you could use different options for this relationship.

* If relationship is ___is toOne___

    There option _toOne_ should be added. Value of this option is the name of related collection.

    * You could use one of the following options to read related object:
        
        * {function} __getIdOne__
        It should return id of related resource or null, if there is no resource related.
    
        ```
        async function(resource): string        
        ```
        
        * ??? {function} __getIdFew__
        
        ```
        function(resources)        
        ```
        
    * If relationship ___is toMany___
    
        * You could use one of the following options to read related objects:
        
            * {function} __getIdsOne__
            
                ```
                function(resource)        
                ```
                
                It should return array with related resources ids. If there are no resources related, it should return empty array.
            
            * {function} __getIdsFew__
            
                ```
                function(resources)        
                ```
                
            * {function} __getWithFilter__
            
                ```
                function(resorce)
                ```

* If relationship ___is untyped___        
    
    * If relationship is ___is toOne___
        
        * You could use one of the following options to read related object:
    
            * {function} __getRefOne__
            
                ```
                function(resource)        
                ```
                
                It should return reference object {type: \<resourceName>, id: \<id>} or null, if there is no related object.
                
            * {function} __getRefFew__
    
                ```
                function(resources)        
                ```
                
            * {function} __getResourceOne__
            
                ```
                function(resource)
                ```
                
            * {function} __getResourceFew__
                                
                ```
                function(resources)
                ```
            
    * If relationship ___is toMany___
        
        * You could use one of the following options to read related objects:        
    
            * {function} __getRefsOne__
            
                ```
                function(resouce)        
                ```
                It should return array of reference objects \[{type: \<resourceName>, id: \<id>}, ...]. If there are no resources related, empty array should be returned.
            
            * {function} __getRefsFew__
            
                ```
                function(resources)
                ```
                
            * {function} __getResourcesOne__
                        
                ```
                function(resource)
                ```
                
            * {function} __getResourcesFew__
                                
                ```
                function(resources)
                ```
                
            * {function} __getCollectionOne__
            
                ```
                function(resource)
                ```
            
            * {function} __getCollectionFew__
                        
                ```
                function(resources)
                ```
            
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