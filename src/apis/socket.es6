
import * as Joi from 'joi';

async function fn() {

}

const SCHEMA_INCLUDE = Joi.object().pattern(/.*/, Joi.lazy(() => SCHEMA_INCLUDE));

const SCHEMA_RELS = Joi.object().required().keys({});

const SCHEMA_GET_LIST = Joi.object().required().keys({
    type: Joi.string().required(),
    filter: Joi.any(),
    page: Joi.any(),
    include: SCHEMA_INCLUDE,
    sort: Joi.any()
});

const SCHEMA_GET_OBJECT = Joi.object().required().keys({
    type: Joi.string().required(),
    id: Joi.string().required(),
    include: SCHEMA_INCLUDE
});

const SCHEMA_CREATE_OBJECT = Joi.object().required().keys({
    type: Joi.string().required(),
    id: Joi.string(),
    attrs: Joi.object(),
    rels: SCHEMA_RELS,
    include: SCHEMA_INCLUDE,
});

const SCHEMA_SET_OBJECT = Joi.object().required().keys({
    type: Joi.string().required(),
    id: Joi.string().required(),
    attrs: Joi.object(),
    rels: SCHEMA_RELS,
    include: SCHEMA_INCLUDE,
});

const SCHEMA_DELETE_OBJECT = Joi.object().required().keys({
    type: Joi.string().required(),
    id: Joi.string().required()
});

const SCHEMA_SUBSCRIBE_OBJECT = Joi.alternatives().try(
    Joi.object().required().keys({
        type: Joi.string().required(),
        id: Joi.string().required(),
//        alias: Joi.string().required(),
//        include: SCHEMA_INCLUDE
    }),
    Joi.object().required().keys({
        alias: Joi.string().required()
    })
);

const SCHEMA_SUBSCRIBE_LIST = Joi.alternatives().try(
    Joi.object().required().keys({
        type: Joi.string().required().allow(null),
//        listName: Joi.string().required(),
        filter: Joi.any(),
        page: Joi.any(),
//        include: SCHEMA_INCLUDE,
        sort: Joi.any()
    }),
    Joi.object().required().keys({
        alias: Joi.string().required()
    }),
);

/*function getCollection(apme, type) {
    const collection = apme.collections[type];
    if (!collection) {
        throw notFoundError('No collection found');
    }
}*/

function createContext(apme, socket) {
    return apme.context();
}

app.onUpdated = () => {

};

function socketIOInitialize(apme, socket) {
    socket.on('get-list', fn(SCHEMA_GET_LIST, async ({type, filter, page, include, sort}) => {
        const context = createContext(apme, socket);

        const list = await context.list(type, {sort, page, filter}).load();

        return {
            data: list.packItems(),
            meta: list.meta,
            included: (await list.include(include)).packItems()
        };
    }));

    socket.on('get-object', fn(SCHEMA_GET_OBJECT, async ({type, id, include}) => {
        // const collection = getCollection(apme, type);
        const context = createContext(apme, socket);

        const resource = await context.resource(type, id).load();
        if(!resource.exists) {
            throw notFoundError();
        }

        // const fields = parseFields(req.query.fields);
        // const include = parseInclude(req.query.include);

        return {
            data: resource.pack(),
            included: (await resource.include(include)).packItems()
        };
    }));

    socket.on('create-object', fn(SCHEMA_CREATE_OBJECT, async ({type, id, attrs, rels, include}) => {

    }));

    socket.on('set-object', fn(SCHEMA_SET_OBJECT, async ({type, id, attrs, rels, include}) => {

    }));

    socket.on('delete-object', fn(SCHEMA_DELETE_OBJECT, async ({type, id}) => {

    }));

    const subscriptions = {};

    socket.on('subscribe-object', fn(SCHEMA_SUBSCRIBE_OBJECT, async ({alias, type, id, include}) => {
        const subName = `obj-${alias}`;
        if(subscriptions[subName]) {
            //if(subscriptions.type == type && subscriptions.id == id && subscriptions.include == include)
            subscriptions[subName].dispose();
            delete subscriptions[subName];
        }
        if(!type) {
            return;
        }
        subscriptions[subName] = apme.notifier.subscribeResource({
            type,
            id,
            context: () => createContext(apme, socket)
        }, async (resource, {subscription}) => {
            await resource.load();

            const objects = (await resource.include(include)).packItems();
            objects.push(resource.pack());

            if(!subscription.isDisposed) {
                socket.emit('update', {
                    aliases: {
                        [alias]: `${type}:${id}`
                    },
                    objects
                });
            }
        });
    }));

    socket.on('subscribe-list', fn(SCHEMA_SUBSCRIBE_LIST, async ({listName, type, filter, page, include, sort}) => {
        const subName = `list-${listName}`;
        if(subscriptions[subName]) {
            //if(subscriptions.type == type && subscriptions.id == id && subscriptions.include == include)
            subscriptions[subName].dispose();
            delete subscriptions[subName];
        }
        if(!type) {
            return;
        }
        subscriptions[subName] = apme.notifier.subscribeList({
            type,
            filter,
            page,
            sort,
            context: () => createContext(apme, socket)
        }, async (list, {subscription}) => {
            await list.load();

            const objects = list.packItems();
            const included = (await list.include(include)).packItems();

            if(!subscription.isDisposed) {
                socket.emit('update', {
                    objects: [...objects, ...included],
                    lists: {
                        [listName]: {
                            tids: objects.map(obj => `${obj.type}:${obj.id}`),
                            meta: list.meta
                        }
                    }
                });
            }
        });
    }));

    socket.on('disconnect', () => {
        for(const subName in subscriptions) {
            subscriptions[subName].dispose();
        }
    });
}