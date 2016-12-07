/**
 * Simple version of node.js's EventEmiter class
 */
export class EventEmitter {
    
    /**
     * Add event handler of givent type
     */
    on (type, fn) {
        if (this['_on' + type] === undefined) {
            this['_on' + type] = [];
        }

        this['_on' + type].push(fn);
    }

    /**
     * Emit event of type.
     * 
     * All arguments will be applay to callback, preserve context of object this.
     */
    emit (type, ...args) {
        if (this['_on' + type]) {
            this['_on' + type].forEach((fn) => fn.apply(this, args));
        }
    }
} 
