import * as generic from './generic';
import * as stopException from '../stop-exception';
import { Reader } from '../reader';
import { Writer } from '../writer';
import { nextTick, waitCb } from '../util';
import { wait } from 'f-promise';

var lastId = 0;
var tracer: (...args: any[]) => void; // = console.error;

/// !doc
/// ## Special device that transforms a writer into a reader
/// 
/// `import * as f from 'f-streams'`
/// 
/// * `uturn = ez.devices.uturn.create()`  
///   creates a uturn device.  
///   The device has two properties: a `uturn.writer` to which you can write,   
///   and a `uturn.reader` from which you can read. 
export interface Uturn<T> {
	reader: Reader<T>;
	writer: Writer<T>;
	end(err: Error): void;
}

export function create<T>(): Uturn<T> {
	var state = 'idle', pendingData: T | undefined, error: any;
	const id = ++lastId;

	var pendingReaderCb: ((err: Error, value: (T | undefined)) => void) | null;
	function bounceReader(err?: any, val?: T) {
		const lcb = pendingReaderCb;
		pendingReaderCb = null;
		if (lcb) lcb(err, val);
	}

	var pendingWriterCb: ((err: Error, value?: Writer<T>) => void) | null;
	function bounceWriter(err?: any, val?: Writer<T>) {
		const lcb = pendingWriterCb;
		pendingWriterCb = null;
		if (lcb) lcb(err, val);
	}

	var pendingStopCb: ((err: Error, value?: any) => void) | null;
	function bounceStop(err?: any, val?: any) {
		const lcb = pendingStopCb;
		pendingStopCb = null;
		if (lcb) lcb(err, val);
	}

	const uturn = {
		reader: new Reader(() => waitCb<T>(cb => {
			nextTick();
			tracer && tracer(id, "READ", state, pendingData);
			const st = state;
			switch (st) {
				case 'writing':
					state = pendingData === undefined ? 'done' : 'idle';
					// acknowledge the write
					bounceWriter(null, uturn.writer);
					// return the data posted by the write
					cb(null, pendingData);
					pendingData = undefined;
					break;
				case 'idle':
					// remember it
					state = 'reading';
					pendingReaderCb = cb;
					break;
				case 'readStopping':
				case 'writeStopping':
					state = 'done';
					const arg = stopException.unwrap(error);
					// acknowledge the stop
					bounceStop();
					// return undefined or throw
					cb(arg && arg !== true ? arg : null);
					break;
				case 'done':
					cb(error);
					break;
				default:
					state = 'done';
					cb(error || new Error('invalid state ' + st));
					break;
			}
		}), arg => waitCb<void>(cb => {
			nextTick();
			error = error || stopException.make(arg);
			tracer && tracer(id, "STOP READER", state, arg);
			const st = state;
			switch (st) {
				case 'reading':
					state = 'done';
					// send undefined or exception to read
					bounceReader(arg && arg !== 1 ? arg : null);
					// acknowledge the stop
					cb(undefined);
					break;
				case 'writing':
					state = 'done';
					// send to write
					bounceWriter(error, uturn.writer);
					// acknowledge the stop
					cb(undefined);
					break;
				case 'idle':
					// remember it
					state = 'readStopping';
					pendingStopCb = cb;
					break;
				case 'done':
					cb(error);
					break;
				default:
					state = 'done';
					cb(error || new Error('invalid state ' + st));
					break;
			}
		})),
		writer: new Writer<T>(data => waitCb(cb => {
			nextTick();
			tracer && tracer(id, "WRITE", state, data);
			const st = state;
			switch (st) {
				case 'reading':
					state = data === undefined ? 'done' : 'idle';
					// acknowledge the read
					bounceReader(error, data);
					// return the data posted by the write
					cb(null);
					break;
				case 'idle':
					// remember it
					state = 'writing';
					pendingWriterCb = cb;
					pendingData = data;
					break;
				case 'readStopping':
					state = 'done';
					// acknowledge the stop
					bounceStop();
					// throw the error
					cb(error);
					break;
				case 'done':
					cb(error || 'invalid state ' + st);
					break;
				default:
					state = 'done';
					cb(new Error('invalid state ' + st));
					break;
			}
		}), arg => waitCb<void>(cb => {
			nextTick();
			tracer && tracer(id, "STOP WRITER", state, arg);
			error = error || stopException.make(arg);
			const st = state;
			switch (st) {
				case 'reading':
					// send undefined or exception to read
					state = 'done';
					bounceReader(arg && arg !== 1 ? arg : null);
					// acknowledge the stop
					cb(undefined);
					break;
				case 'idle':
					// remember it
					state = 'writeStopping';
					pendingStopCb = cb;
					break;
				case 'done':
					cb(error);
					break;
				default:
					state = 'done';
					cb(new Error('invalid state ' + st));
					break;
			}
		})),
		end(err: Error) {
			tracer && tracer(id, "END", state, err);
			err = stopException.unwrap(err);
			error = error || err;
			state = 'done';
			// at most one of the pending callbacks should be active but we can safely bounce to all.
			bounceReader(error);
			bounceWriter(error, uturn.writer)
			bounceStop(error);
		},
	};
	return uturn;
}