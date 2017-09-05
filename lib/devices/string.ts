import { Reader } from '../reader';
import { nextTick } from '../util';
import { Writer } from '../writer';

/// !doc
/// ## In-memory string streams
/// 
/// `import { stringReader, stringWriter } from 'f-streams'`
/// 

export interface Options {
	sync?: boolean;
	chunkSize?: number | (() => number);
}

export class StringWriter extends Writer<string> {
	buf: string;
	constructor(options: Options) {
		super((value: string) => {
			if (!options.sync) nextTick();
			if (value !== undefined) this.buf += value;
			return this;
		});
		this.buf = '';
	}
	toString() {
		return this.buf;
	}
	get result() {
		return this.buf;
	}
}

/// * `reader = stringReader(text, options)`  
///   creates a reader that reads its chunks from `text`.  
///   `reader.read()` will return the chunks asynchronously by default.  
///   You can force synchronous delivery by setting `options.sync` to `true`.
///   The default chunk size is 1024. You can override it by passing 
///   a `chunkSize` option.
export function reader(text: string, options?: Options | number) {
	let opts: Options;
	if (typeof options === 'number') {
		opts = {
			chunkSize: options,
		};
	}
	else opts = options || {};
	const chunkSize = opts.chunkSize || 1024;
	let pos = 0;
	return new Reader(function read() {
		if (!opts.sync) nextTick();
		if (pos >= text.length) return;
		const len = typeof chunkSize === 'function' ? chunkSize() : chunkSize;
		const s = text.substring(pos, pos + len);
		pos += len;
		return s;
	});
}
/// * `writer = stringWriter(options)`  
///   creates a writer that collects strings into a text buffer.  
///   `writer.write(data)` will write asynchronously by default.  
///   You can force synchronous write by setting `options.sync` to `true`.
///   `writer.toString()` returns the internal text buffer into which the 
///   strings have been collected.
export function writer(options?: Options) {
	return new StringWriter(options || {});
}

export function factory(url: string) {
	return {
		/// * `reader = factory.reader()`  
		reader: () => {
			return module.exports.reader(url.substring(url.indexOf(':') + 1));
		},
		/// * `writer = factory.writer()`  
		writer: () => {
			return module.exports.writer();
		},
	};
}