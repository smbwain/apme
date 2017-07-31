import {Collection} from './collection';
import {Context} from './context';
import {ApmeInterface, ResourceDefinition, ContextOptions} from './types';
import * as errors from './errors';

export class Apme implements ApmeInterface {
    public collections : {[name: string] : Collection} = {};

    define(name : string, options: ResourceDefinition) : void {
        this.collections[name] = new Collection(this, name, options);
    }

    context(options: ContextOptions) : Context {
        return new Context(this, options);
    }

    use<T>(plugin : (apme: Apme) => T) : T {
        return plugin(this);
    }

    collection(name : string) : Collection {
        if (!this.collections[name]) {
            throw errors.notFound('No collection found');
        }
        return this.collections[name];
    }
}