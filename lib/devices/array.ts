import { Reader } from '../reader';
import { nextTick } from '../util';
import { Writer } from '../writer';

export interface Options {
    sync?: boolean;
}

export class ArrayWriter<T> extends Writer<T> {
    values: T[];
    constructor(options: Options) {
        super((value: T) => {
            if (!options.sync) nextTick();
            if (value !== undefined) this.values.push(value);
            return this;
        });
        this.values = [];
    }
    toArray(): T[] {
        return this.values;
    }
    get result(): T[] {
        return this.values;
    }
}

/// !doc
/// ## Array readers and writers
///
/// `import { arrayReader, arrayWriter } from 'f-streams'`
///
/// * `reader = arrayReader(array, options)`
///   creates a reader that reads its entries from `array`.
///   `reader.read()` will return its entries asynchronously by default.
///   You can force synchronous delivery by setting `options.sync` to `true`.
export function reader<T>(array: T[], options?: Options) {
    const opts = options || {};
    const values = array.slice(0);
    return new Reader<T>(function() {
        if (!opts.sync) nextTick();
        return values.shift();
    });
}

/// * `writer = arrayWriter(options)`
///   creates a writer that collects its entries into an array.
///   `writer.write(value)` will write asynchronously by default.
///   You can force synchronous write by setting `options.sync` to `true`.
///   `writer.toArray()` returns the internal array into which the
///   entries have been collected.
export function writer<T>(options?: Options) {
    const opts = options || {};
    return new ArrayWriter<T>(opts);
}
