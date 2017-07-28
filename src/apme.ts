import {Collection} from './collection';
import {Context} from './context';
import {ApmeInterface, ResourceDefinition, ContextOptions} from './types';

export class Apme implements ApmeInterface {
    public collections : {[name: string] : Collection} = {};

    define(name : string, options: ResourceDefinition) : void {
        this.collections[name] = new Collection(this, name, options);
    }

    context(options: ContextOptions) : Context {
        return new Context(this, options);
    }

    use(plugin : (apme: ApmeInterface) => any) {
        return plugin(this);
    }
}