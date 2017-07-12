import {Collection} from './collection';
import {Context} from './context';
import {ContextOptions, ResourceDefinition} from './types';

export class Apme /*implements IApme*/ {
    public collections : {[name: string] : Collection} = {};

    define(name : string, options: ResourceDefinition) : void {
        this.collections[name] = new Collection(this, name, options);
    }

    context(options: ContextOptions) : Context {
        return new Context(this, options);
    }

    use(plugin : (apme: Apme) => any) {
        return plugin(this);
    }
}