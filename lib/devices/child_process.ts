/// !doc
/// ## EZ Stream wrappers for node child processes
/// 
/// `import * as f from 'f-streams'`
/// 
import { ChildProcess } from 'child_process';
import { wait } from 'f-promise';
import { stringify } from '../mappers/convert';
import { Reader } from '../reader';
import { parser as linesParser } from '../transforms/lines';
import { Writer } from '../writer';
import * as generic from './generic';
import * as node from './node';

/// * `reader = ez.devices.child_process.reader(proc, options)`  
///   wraps a node.js child process as an EZ reader.  
///   For a full description of the options, see `ReadableStream` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
export interface ReaderOptions {
	acceptCode?: (code: number) => boolean;
	encoding?: string;
	dataHandler?: (reader: Reader<string | Buffer>) => Reader<string | Buffer>;
	errorHandler?: (reader: Reader<string | Buffer>) => Reader<string | Buffer>;
	errorPrefix?: string;
	errorThrow?: boolean;
}

export function reader(proc: ChildProcess, options?: ReaderOptions) {
	const opts = options || {};
	let err: NodeJS.ErrnoException, closeCb: ((err: Error) => void) | null, closed: boolean;
	proc.on('close', (ec: number) => {
		closed = true;
		if (ec === -1) {
			proc.stdout.emit('end');
			proc.stderr.emit('end');
		}
		if (ec && !(opts.acceptCode && opts.acceptCode(ec))) {
			err = new Error('process exited with code:' + ec);
			err.errno = ec;
			// compat code
			const anyErr: any = err;
			anyErr.code = ec;
		}
		if (closeCb) closeCb(err);
		closeCb = null;
	});
	proc.on('error', (e: NodeJS.ErrnoException) => {
		err = err || e;
	});
	let stdout: Reader<string | Buffer> = node.reader(proc.stdout, opts);
	let stderr: Reader<string | Buffer> = node.reader(proc.stderr, opts);
	// node does not send close event if we remove all listeners on stdin and stdout
	// so we disable the stop methods and we call stop explicitly after the close.
	const stops = [stdout.stop.bind(stdout), stderr.stop.bind(stderr)];
	stdout.stop = stderr.stop = () => { };
	function stopStreams(arg?: any) {
		stops.forEach(stop => {
			stop(arg);
		});
	}
	if (opts.encoding !== 'buffer') {
		stdout = stdout.map(stringify()).transform(linesParser());
		stderr = stderr.map(stringify()).transform(linesParser());
	}
	if (opts.dataHandler) stdout = opts.dataHandler(stdout);
	if (opts.errorHandler) stderr = opts.errorHandler(stderr);
	if (opts.errorPrefix || opts.errorThrow) {
		stderr = stderr.map(function (data) {
			if (opts.errorThrow) throw new Error((opts.errorPrefix || '') + data);
			return opts.errorPrefix! + data;
		});
	}
	const rd = stdout.join(stderr);
	return generic.reader(function read() {
		if (err) throw err;
		const data = rd.read();
		if (data !== undefined) return data;
		// reached end of stream - worry about close event now.
		if (closed) {
			// already got close event
			if (err) throw err;
		} else {
			// wait for the close event
			wait(cb => { closeCb = cb; });
			stopStreams();
		}
		return undefined;
	}, stopStreams);
}
/// * `writer = ez.devices.child_process.writer(proc, options)`  
///   wraps a node.js child process as an EZ writer.  
///   For a full description of the options, see `WritableStream` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export function writer(proc: ChildProcess, options: node.NodeWriterOptions) {
	return node.writer(proc.stdin, options);
}
