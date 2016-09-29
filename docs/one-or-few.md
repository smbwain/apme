
_"...One"_ or _"...Few"_?
=========================

Some methods in _apme_ could be defined with "...One" or "...Few" postfix.
When should we you use one notation, and when another?

To improve performance, every time when _apme_ operates on more than one record it tries to use _"...Few"_ methods.
If there isn't _"...Few"_ method, _apme_ calls _"...One"_ method n-times then. Once for every operated record.

When _apme_ operates on single record, it tries to call _"...One"_ method firstly. But if it's not defined, _"...Few"_ method will be called for it.

So. What should I write _"...Few"_ method, or _"...One"_?
If you define fast synchronous method, there is no any difference. So you could define _"..One"_ method, because it's simpler.

But what if your method is async and it makes some io calls? E.g. it retrieves data from database.
In that case it's faster to load few records by one request, than retrieve each record separately.
So you are welcome to write _"...Few"_ method to retrieve from database few records here.

Summary
=======

If your method makes async calls, and processing of few records is faster then each one separately, it'a always better to define "...Few" method.
In all other cases, "...One" method is fine.