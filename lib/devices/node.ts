/// 
/// ## Native node.js streams
/// 
import * as streams from '../node-wrappers';
import { Reader } from '../reader';
import { Writer } from '../writer';

require('../reader').decorate(streams.ReadableStream.prototype);
require('../writer').decorate(streams.WritableStream.prototype);

/// !doc
/// ## Stream wrappers for native node streams
/// 
/// `import { nodeReader, nodeWriter } from 'f-streams'`
/// 
/// * `reader = nodeReader(stream, options)`  
///   wraps a node.js stream as a reader.  
///   For a full description of the options, see `ReadableStream` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export interface NodeReaderOptions extends streams.ReadableOptions {
	encoding?: string;
}

export function fixOptions(options: NodeReaderOptions | string | undefined) {
	let opts: NodeReaderOptions;
	if (typeof options === 'string') {
		opts = {
			encoding: options,
		};
	} else {
		opts = options || {};
	}
	return opts;
}

export function reader<T>(emitter: NodeJS.ReadableStream, options?: NodeReaderOptions | string) {
	const opts = fixOptions(options);
	const rd = new streams.ReadableStream(emitter, opts);
	if (opts.encoding) rd.setEncoding(opts.encoding);
	return rd.reader as Reader<T>;
}
/// * `writer = nodeWriter(stream, options)`  
///   wraps a node.js stream as a writer.  
///   For a full description of the options, see `WritableStream` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export interface NodeWriterOptions { }

export function writer<T>(emitter: NodeJS.WritableStream, options?: NodeWriterOptions) {
	const wr = new streams.WritableStream(emitter, fixOptions(options));
	return wr.writer as Writer<T>;
}
