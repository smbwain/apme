
# define perms

Any permission description could be boolean value or function which returns boolean.
Functional description could retrieve params (context, id, object, data, operation).



readOne(context, resource, op) / readFew(context, resources, op)
createOne(context, resource, op) / createFew(context, resources, op)
updateOne(context, resource, op) / updateFew(context, resource, op)
removeOne(context, resource, op) / removeFew(context, resource, op)

You could define _write_ permissions (writeOne/writeFew) instead of create, update, remove.
Or you could define _any_ permission (anyOne/anyFew) to instead of all of them.