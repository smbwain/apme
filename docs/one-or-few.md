
_"...One"_ or _"...Few"_?
=========================

Some methods in _apme_ could be defined with "...One" or "...Few" postfix.
When should we you use one notation, and when another?

### Short answer

If your method makes async calls. If processing of few records is faster then each one separately, it'a always better to define "...Few" method.
In all other cases, "...One" method is fine.

### Long answer

To improve performance, every time when _apme_ operates on more than one record it tries to use _"...Few"_ methods.
If there isn't _"...Few"_ method, _apme_ calls _"...One"_ method n-times then. Once for every operated record.

When _apme_ operates on single record, it tries to call _"...One"_ method firstly. But if it's not defined, _"...Few"_ method will be called.

So. What should I implement _"...Few"_ method, or _"...One"_?
If you define fast synchronous method, there is no any difference. So you could define _"..One"_ method, because it's simpler.

But if your method is async and probably makes some io calls (e.g. it retrieves data from database),
it's faster to load few records by one request, than retrieve each record separately.
So you are welcome to write _"...Few"_ method to process few records at once.