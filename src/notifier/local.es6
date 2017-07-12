
class Subscription {
    constructor(arr, handler, context) {
        this.isDisposed = false;
        this._arr = arr;
        this.handler = handler;
        this.context = context;
    }
    dispose() {
        this.isDisposed = true;
        this._arr.splice(this._arr.indexOf(this), 1);
    }
}

export default class LocalNotifier {
    constructor(apme) {
        this._objs = {};
        this._lists = {};
        this._apme = apme;
    }

    subscribeResource({type, id, context}, handler) {
        const key = `${type}:${id}`;
        const arr = (this._objs[key] || (this._objs[key] = []));
        const subscription = new Subscription(arr, handler, context);
        arr.push(subscription);
        return subscription;
    }

    subscribeList({type, filter, page, sort, context}) {
        const subscribeListKeys = this._apme.getSubscribeKeysByListData(type, {filter});
        // @todo
    }

    async resourceUpdated(type, id, data) {
        const subscriptions = this._objs[`${type}:${id}`];
        if(subscriptions) {
            for(const subscription of subscriptions) {
                await subscription.handler(subscription.context().resource(type, id));
            }
        }
        const subscribeListKeys = this._apme.getSubscribeKeysByData(type, data);

        // @todo: optimize & debounce

        for(const subscribeListKey of subscribeListKeys) {
            //this._lists[type][subscribeListKeys]
        }
    }
}