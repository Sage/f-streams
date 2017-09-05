/**
 * Copyright (c) 2013 Bruno Jouhier <bruno.jouhier@sage.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
/// !doc
/// ## EZ Streams core reader API
/// 
/// `import * as f from 'f-streams'`  
/// 
import { Callback, funnel, run, wait } from 'f-promise';
import * as nodeStream from 'stream';
import { convert as predicate } from './predicate';
import * as stopException from './stop-exception';
import { nextTick } from './util';
import { Writer } from './writer';

function tryCatch<R>(that: any, fn: () => R) {
	try {
		return fn.call(that);
	} catch (ex) {
		that.stop(ex);
		throw ex;
	}
}

export interface ParallelOptions {
	count?: number;
	shuffle?: boolean;
}

export interface CompareOptions<T> {
	compare?: (v1: T, v2: T) => number;
}

export interface Stoppable {
	stop: (arg?: any) => void;
}

function resolvePredicate<T>(fn: ((value: T) => boolean) | {}): (value: T) => boolean {
	const f: any = fn;
	if (typeof fn !== 'function') return predicate(fn);
	else return f;
}

export class Reader<T> {
	parent?: Stoppable;
	read: (this: Reader<T>) => T | undefined;
	_stop: (this: Reader<T>, arg?: any) => void;
	stopped: boolean;
	headers: { [name: string]: string }; // experimental
	constructor(read: () => T | undefined, stop?: (arg: any) => void, parent?: Stoppable) {
		if (typeof read !== 'function') throw new Error('invalid reader.read: ' + (read && typeof read));
		this.parent = parent;
		this.read = read;
		this.stopped = false;
		if (stop) this._stop = stop;
	}

	/// * `count = reader.forEach(fn)`  
	///   Similar to `forEach` on arrays.  
	///   The `fn` function is called as `fn(elt, i)`.  
	///   This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
	forEach(fn: (value: T, index: number) => void) {
		return tryCatch(this, () => {
			let i: number, val: any;
			for (i = 0; (val = this.read()) !== undefined; i++) {
				fn.call(null, val, i);
			}
			return i;
		});
	}

	/// * `reader = reader.map(fn)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	map<U>(fn: (value: T, index: number) => U): Reader<U> {
		return new Reader(() => {
			let count = 0;
			const val = this.read();
			if (val === undefined) return undefined;
			return fn.call(null, val, count++);
		}, undefined, this);
	}

	/// * `result = reader.every(fn)`  
	///   Similar to `every` on arrays.  
	///   The `fn` function is called as `fn(elt)`.  
	///   Returns true at the end of stream if `fn` returned true on every entry.  
	///   Stops streaming and returns false as soon as `fn` returns false on an entry.
	every(fn: ((value: T) => boolean) | {}) {
		const f = resolvePredicate(fn);
		return tryCatch(this, () => {
			while (true) {
				const val = this.read();
				if (val === undefined) return true;
				if (!f.call(null, val)) {
					this.stop();
					return false;
				}
			}
		});
	}

	/// * `result = reader.some(fn)`  
	///   Similar to `some` on arrays.  
	///   The `fn` function is called as `fn(elt)`.  
	///   Returns false at the end of stream if `fn` returned false on every entry.  
	///   Stops streaming and returns true as soon as `fn` returns true on an entry.
	some(fn: ((value: T) => boolean) | {}) {
		const f = resolvePredicate(fn);
		return tryCatch(this, () => {
			while (true) {
				const val = this.read();
				if (val === undefined) return false;
				if (f.call(null, val)) {
					this.stop();
					return true;
				}
			}
		});
	}

	/// * `result = reader.reduce(fn, initial)`  
	///   Similar to `reduce` on arrays.  
	///   The `fn` function is called as `fn(current, elt)` where `current` is `initial` on the first entry and
	///   the result of the previous `fn` call otherwise.
	///   Returns the value returned by the last `fn` call.
	reduce<U>(fn: (prev: U, value: T) => U, v: U): U {
		return tryCatch(this, () => {
			while (true) {
				const val = this.read();
				if (val === undefined) return v;
				v = fn.call(null, v, val);
			}
		});
	}

	/// * `writer = reader.pipe(writer)`  
	///   Pipes from `stream` to `writer`.
	///   Returns the writer for chaining.
	// should be pipe<R extends Writer<T>>(writer: R) 
	// but transform-flow-comments plugin does not understand this syntax
	// so I relax the return type.
	pipe(writer: Writer<T>): any {
		tryCatch(this, () => {
			let val: T | undefined;
			do {
				val = this.read();
				try {
					writer.write(val);
				} catch (ex) {
					const arg = stopException.unwrap(ex);
					if (arg && arg !== true) {
						this.stop(arg);
						throw arg;
					} else {
						this.stop(arg);
						break;
					}
				}

			} while (val !== undefined);
		});
		return writer;
	}

	/// * `reader = reader.tee(writer)`  
	///   Branches another writer on the chain`.  
	///   Returns another reader on which other operations may be chained.
	tee(writer: Writer<T>) {
		const parent = this;
		let writeStop: [any];
		let readStop: [any];
		const stopResult: (arg: any) => T | undefined = arg => {
			if (!arg || arg === true) return undefined;
			else throw arg;
		};
		const readDirect = () => {
			let val = parent.read();
			if (!writeStop) {
				try {
					writer.write(val);
				} catch (ex) {
					const arg = stopException.unwrap(ex);
					writeStop = [arg];
					if (readStop) {
						// both outputs are now stopped
						// stop parent if readStop was a soft stop
						if (!readStop[0]) parent.stop(arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					} else if (arg) {
						// direct output was not stopped and received a full stop
						readStop = writeStop;
						parent.stop(arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					}
				}
			}
			return val;
		};

		return new Reader(function read() {
			if (readStop) return stopResult(readStop[0]);
			return readDirect();
		}, function stop(arg) {
			if (readStop) return;
			readStop = [arg];
			if (arg && !writeStop) {
				// full stop - writer output still running
				// stop writer and parent
				writeStop = readStop;
				writer.stop(arg);
				parent.stop(arg);
			} else if (writeStop && !writeStop[0]) {
				// only writer was stopped before
				// stop parent
				parent.stop(arg);
			} else if (!writeStop) {
				// direct output is stopped.
				// we continue to read it, to propagate to the secondary output
				run(() => {
					while (readDirect() !== undefined);
				}).catch(err => { throw err; });
			}
		}, parent);
	}

	/// * `readers = reader.dup()`  
	///   Duplicates a reader and returns a pair of readers which can be read from independently.
	dup(): [Reader<T>, Reader<T>] {
		const uturn = require('./devices/uturn').create();
		return [this.tee(uturn.writer), uturn.reader];
	}

	/// * `reader = reader.concat(reader1, reader2)`  
	///   Concatenates reader with one or more readers.  
	///   Works like array.concat: you can pass the readers as separate arguments, or pass an array of readers.  
	concat(...readers: (Reader<T> | Reader<T>[])[]) {
		const streams: Reader<T>[] = Array.prototype.concat.apply([], arguments);
		let stream: Reader<T> | undefined = this;
		return new Reader(function read() {
			let val: T | undefined;
			while (stream && (val = stream.read()) === undefined) stream = streams.shift();
			return val;
		}, function stop(arg) {
			while (stream) {
				stream.stop(arg);
				stream = streams.shift();
			}
		}, this);
	}

	/// * `result = reader.toArray()`  
	///   Reads all entries and returns them to an array.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	toArray(): T[] {
		return this.reduce((arr, elt) => {
			arr.push(elt);
			return arr;
		}, [] as T[]);
	}

	/// * `result = reader.readAll()`  
	///   Reads all entries and returns them as a single string or buffer. Returns undefined if nothing has been read.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	readAll(): string | Buffer | T[] | undefined {
		const arr = this.toArray();
		if (typeof arr[0] === 'string') return arr.join('');
		if (Buffer.isBuffer(arr[0])) {
			const bufs: any = arr;
			return Buffer.concat(bufs);
		}
		return arr.length > 0 ? arr : undefined;
	}

	/// * `reader = reader.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another reader on which other operations may be chained.
	transform<U>(fn: (reader: Reader<T>, writer: Writer<U>) => void): Reader<U> {
		const parent = this;
		const uturn = require('./devices/uturn').create();
		function afterTransform(err?: any) {
			// stop parent at end
			run(() => parent.stop()).then(() => uturn.end(err), e => uturn.end(err || e));
		}
		run(() => fn.call(null, parent, uturn.writer)).then(afterTransform, afterTransform);
		return uturn.reader;
	}

	/// * `result = reader.filter(fn)`  
	///   Similar to `filter` on arrays.  
	///   The `fn` function is called as `fn(elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	filter(fn: ((value: T, index: number) => boolean) | {}) {
		const f = resolvePredicate(fn);
		const parent = this;
		let i = 0, done = false;
		return new Reader(function () {
			while (!done) {
				const val = parent.read();
				done = val === undefined;
				if (done || f.call(null, val, i++)) return val;
			}
			return undefined;
		}, undefined, parent);
	}

	/// * `result = reader.until(fn, testVal, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes true.  
	///   The `fn` function is called as `fn(elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes true.  
	///   Returns another reader on which other operations may be chained.
	until(fn: ((value: T, index: number) => boolean) | {}, stopArg?: any) {
		const f = resolvePredicate(fn);
		const parent = this;
		let i = 0;
		return new Reader(function () {
			const val = parent.read();
			if (val === undefined) return undefined;
			if (!f.call(null, val, i++)) return val;
			parent.stop(stopArg);
			return undefined;
		}, undefined, parent);
	}

	/// * `result = reader.while(fn, testVal, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries.
	///   The `fn` function is called as `fn(elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes false.  
	///   Returns another reader on which other operations may be chained.
	while(fn: ((value: T, index: number) => boolean) | {}, stopArg?: any) {
		const f = resolvePredicate(fn);
		return this.until((val, i) => !f.call(null, val, i), stopArg);
	}

	/// * `result = reader.limit(count, stopArg)`  
	///   Limits the stream to produce `count` results.  
	///   `stopArg` is an optional argument which is passed to `stop` when the limit is reached.  
	///   Returns another reader on which other operations may be chained.
	limit(n: number, stopArg?: any) {
		return this.until((val, i) => i >= n, stopArg);
	}

	/// * `result = reader.skip(count)`  
	///   Skips the first `count` entries of the reader.  
	///   Returns another reader on which other operations may be chained.
	skip(n: number) {
		return this.filter((val, i) => i >= n);
	}

	/// * `group = reader.fork(consumers)`  
	///   Forks the steam and passes the values to a set of consumers, as if each consumer
	///   had its own copy of the stream as input.  
	///   `consumers` is an array of functions with the following signature: `reader = consumer(source)`
	///   Returns a `StreamGroup` on which other operations can be chained.
	fork(consumers: ((source: any) => Reader<T>)[]) {
		// simple implementation with repeated dup.
		const parent: Reader<T> = this;
		const readers: Reader<T>[] = [];
		if (consumers.length === 1) {
			readers.push(consumers[0](parent));
		} else {
			let source = parent;
			for (let i = 0; i < consumers.length - 1; i++) {
				const dup = source.dup();
				readers.push(consumers[i](dup[0]));
				source = dup[1];
			}
			readers.push(consumers[consumers.length - 1](source));
		}
		return new StreamGroup(readers);
	}

	/// * `group = reader.parallel(count, consumer)`  
	///   Parallelizes by distributing the values to a set of  `count` identical consumers.  
	///   `count` is the number of consumers that will be created.  
	///   `consumer` is a function with the following signature: `reader = consumer(source)`  
	///   Returns a `StreamGroup` on which other operations can be chained.  
	///   Note: transformed entries may be delivered out of order.
	parallel(options: ParallelOptions | number, consumer: (source: any) => Reader<T>) {
		let opts: ParallelOptions;
		if (typeof options === 'number') opts = { count: options };
		else opts = options || {};

		const parent = this;
		const streams: Reader<T>[] = [];
		const fun = funnel(1);
		let inside = 0;
		let stopArg: any;
		for (let i = 0; i < (opts.count || 1); i++) {
			((ii: number) => { // i for debugging
				streams.push(consumer(new Reader(function read() {
					if (stopArg) {
						if (stopArg === true) return undefined;
						else throw stopArg;
					}
					return fun(() => {
						if (inside++ !== 0) throw new Error('funnel error: ' + inside);
						const val = parent.read();
						inside--;
						return val;
					});
				}, function stop(arg) {
					if (stopArg) return;
					stopArg = arg;
					parent.stop(arg);
				}, parent)));
			})(i);
		}
		const group = new StreamGroup(streams);
		return opts.shuffle ? group.dequeue() : group.rr();
	}

	/// * `reader = reader.peekable()`  
	///   Returns a stream which has been extended with two methods to support lookahead.  
	///   The lookahead methods are:
	///   - `reader.peek()`: same as `read()` but does not consume the item. 
	///   - `reader.unread(val)`: pushes `val` back so that it will be returned by the next `read()`
	peekable(): PeekableReader<T> {
		const that: Reader<T> = this;
		return new PeekableReader(that);
	}

	/// * `reader = reader.buffer(max)`  
	///   Returns a stream which is identical to the original one but in which up to `max` entries may have been buffered.  
	buffer(max: number) {
		const parent = this;
		const buffered: (T | undefined)[] = [];
		let resume: ((err: any, val?: T) => void) | undefined;
		let err: any;
		let pending = false;

		const fill = () => {
			if (pending) return;
			pending = true;
			const afterRead = (e: any, v?: T) => {
				pending = false;
				if (e) err = err || e;
				else buffered.push(v);

				if (resume) {
					const cb = resume;
					resume = undefined;
					if (buffered.length > 0) {
						v = buffered.shift();
						setImmediate(fill);
						cb(null, v);
					} else {
						cb(err);
					}
				} else if (buffered.length < max) {
					if (!err && v !== undefined) setTimeout(fill, 2);
				}
			};
			run(() => parent.read()).then(v => afterRead(null, v), afterRead);
		};
		fill();

		return new Reader(() => wait((cb: Callback<T>) => {
			if (buffered.length > 0) {
				const val = buffered.shift();
				fill();
				cb(null, val);
			} else {
				resume = cb;
			}
		}), undefined, parent);
	}

	join(streams: Reader<T>[] | Reader<T>) {
		const that: Reader<T> = this;
		const sts = Array.isArray(streams) ? streams : [streams];
		return new StreamGroup([that].concat(sts)).dequeue();
	}

	/// * `stream = reader.nodify()`  
	///   converts the reader into a native node Readable stream.  
	nodify() {
		const stream = new (require('stream').Readable)();
		let pending = false;
		const end = () => {
			stream.push(null);
		};
		const more = () => {
			if (pending) return;
			let sync = true;
			pending = true;
			run(() => this.read()).then(result => {
				pending = false;
				if (result === undefined) {
					if (sync) {
						nextTick();
						end();
					}
					else end();
				} else {
					if (stream.push(result)) {
						if (sync) {
							nextTick();
							more();
						}
						else more();
					}
				}
			}, err => {
				pending = false;
				stream.emit('error', err);
			});
			sync = false;
		};
		stream._read = () => {
			more();
		};
		return stream;
	}

	/// * `reader = reader.nodeTransform(duplex)`  
	///   pipes the reader into a node duplex stream. Returns another reader. 
	nodeTransform<U>(duplex: nodeStream.Duplex): Reader<U> {
		return require('./devices/node').reader(this.nodify().pipe(duplex));
	}

	/// * `cmp = reader1.compare(reader2)`  
	///   compares reader1 and reader2 return 0 if equal,  
	compare(other: Reader<T>, options?: CompareOptions<T>) {
		const opts = options || {};
		let compare = opts.compare;
		if (!compare) compare = (a, b) => a === b ? 0 : a < b ? -1 : +1;
		let cmp = 0;
		while (true) {
			const data1 = this.read();
			const data2 = other.read();
			if (data1 === undefined) return data2 === undefined ? 0 : -1;
			if (data2 === undefined) return +1;
			// for now, only strings
			cmp = compare(data1, data2);
			if (cmp !== 0) return cmp;
		}
	}

	/// * `reader.stop(arg)`  
	///   Informs the source that the consumer(s) has(ve) stopped reading.  
	///   The source should override this method if it needs to free resources when the stream ends.  
	///   `arg` is an optional argument.  
	///   If `arg` is falsy and the reader has been forked (or teed) upstream, only this reader stops (silently).  
	///   If `arg` is true, readers that have been forked upstream are stopped silently (their `read` returns undefined).  
	///   Otherwise `arg` should be an error object which will be thrown when readers that have been forked upstream try to read.  
	///   The default `stop` function is a no-op.  
	///   Note: `stop` is only called if reading stops before reaching the end of the stream.  
	///   Sources should free their resources both on `stop` and on end-of-stream.  
	stop(arg?: any) {
		if (this.stopped) return;
		this.stopped = true;
		if (this._stop) this._stop(arg);
		else if (this.parent) this.parent.stop(arg);
	}

	// Iterable interface
	[Symbol.iterator](): Iterator<T> {
		return {
			next: () => {
				const val = this.read();
				return {
					value: val!,
					done: val === undefined,
				};
			},
		};
	}
}

export class PeekableReader<T> extends Reader<T> {
	buffered: (T | undefined)[];
	constructor(parent: Reader<T>) {
		super(() => {
			return this.buffered.length > 0 ? this.buffered.pop() : parent.read();
		}, undefined, parent);
		this.buffered = [];
	}

	unread(val: T | undefined) {
		this.buffered.push(val);
		return this; // for chaining
	}
	peek() {
		const val = this.read();
		this.unread(val);
		return val;
	}
}

// * `freader.decorate(proto)`  
//   Adds the EZ streams reader API to an object. 
//   Usually the object is a prototype but it may be any object with a `read()` method.  
//   Returns `proto` for convenience.
exports.decorate = function (proto: any) {
	const readerProto: any = Reader.prototype;
	Object.getOwnPropertyNames(Reader.prototype).forEach(k => {
		if (k !== 'constructor' && !proto[k]) proto[k] = readerProto[k];
	});
	return proto;
};

export function create<T>(read: () => T, stop?: (arg: any) => void) {
	return new Reader(read, stop, undefined);
}

/// ## StreamGroup API

export class StreamGroup<T> implements Stoppable {
	readers: (Reader<T> | null)[];
	constructor(readers: Reader<T>[]) {
		this.readers = readers;
	}
	stop(arg?: any) {
		this.readers.forEach(rd => {
			if (rd) rd.stop(arg);
		});
	}

	/// * `reader = group.dequeue()`  
	///   Dequeues values in the order in which they are delivered by the readers.
	///   Returns a stream on which other operations may be chained.
	dequeue() {
		interface Result {
			i: number;
			e: any | undefined;
			v: T | undefined;
			next: () => void;
		}
		const results: Result[] = [];
		let alive = this.readers.length;
		let resume: ((err: any, val?: T) => void) | undefined;
		this.readers.forEach((stream, i) => {
			if (!stream) return;
			const next = () => {
				if (alive === 0) return;
				const afterRead = (e: any, v?: T) => {
					if (!e && v === undefined) alive--;
					if (e || v !== undefined || alive === 0) {
						if (resume) {
							const cb = resume;
							resume = undefined;
							cb(e, v);
							next();
						} else {
							results.push({
								i: i,
								e: e,
								v: v,
								next: next,
							});
						}
					}
				};
				run(() => stream.read()).then(v => afterRead(null, v), afterRead);
			};
			next();
		});
		return new Reader(() => wait((cb: Callback<T>) => {
			if (alive <= 0) return cb(null), void 0;
			const res = results.shift();
			if (res) {
				if (res.next) res.next();
				return cb(res.e, res.v);
			} else {
				resume = cb;
			}
		}), undefined, this);
	}
	/// * `reader = group.rr()`  
	///   Dequeues values in round robin fashion.
	///   Returns a stream on which other operations may be chained.
	rr() {
		interface Entry {
			i: number;
			stream: Reader<T>;
			read: () => Promise<T | undefined>;
		}
		const entry = (stream: Reader<T>, i: number) => ({
			i: i,
			stream: stream,
			read: () => run(() => stream.read()),
		});
		const q = this.readers.map(entry);
		return new Reader(function () {
			let elt: Entry | undefined;
			while (elt = q.shift()) {
				const val = wait(elt.read());
				if (val !== undefined) {
					q.push(entry(elt.stream, elt.i));
					return val;
				}
			}
			return undefined;
		}, undefined, this);
	}

	/// * `reader = group.join(fn)`  
	///   Combines the values read from the readers to produce a single value.
	///   `fn` is called as `fn(values)` where `values` is the set of values produced by 
	///   all the readers that are still active.  
	///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
	///   that it has consumed. The next `read()` on the joined stream will fetch these values. 
	///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
	///   Returns a stream on which other operations may be chained.
	join(fn: (values: (T | undefined)[]) => T | undefined) {
		let last = 0; // index of last value read by default fn 
		if (!fn) {
			fn = (vals => {
				let i = last;
				do {
					i = (i + 1) % vals.length;
					const v = vals[i];
					if (v !== undefined) {
						vals[i] = undefined;
						last = i;
						return v;
					}
				} while (i !== last);
				return undefined;
			});
		}

		const values: (T | undefined)[] = [];
		let active = this.readers.length;
		let done = false;
		let reply: ((err?: any, val?: T) => void) | undefined;
		const callbacks = this.readers.map((reader, i) => ((err: any, data?: T | undefined) => {
			if (active === 0) return reply && reply();
			if (err) {
				done = true;
				return reply && reply(err);
			}
			values[i] = data;
			if (data === undefined) {
				this.readers[i] = null;
				if (--active === 0) return reply && reply();
			}
			const vals = values.filter(val => val !== undefined);
			if (vals.length === active) {
				run(() => fn.call(null, values)).then(val => {
					// be careful with re-entrancy
					const rep = reply;
					reply = undefined;
					if (rep) rep(null, val);
				}, e => {
					done = true;
					reply && reply(e);
				});
			}
		}));

		const refill = () => {
			let count = 0;
			this.readers.forEach((rd, j) => {
				if (rd && values[j] === undefined) {
					count++;
					run(() => rd.read()).then(v => callbacks[j](null, v), e => callbacks[j](e));
				}
			});
			if (count === 0) throw new Error('bad joiner: must pick and reset at least one value');
		};
		return new Reader<T>(() => wait(cb => {
			if (done) {
				cb(undefined);
				return;
			}
			reply = cb;
			refill();
		}), undefined, this);
	}
}
