import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as generic from './generic';
import * as util from '../util';

/// !doc
/// ## Queue device
/// 
/// The queue device can be used to desynchronize processing between one or several tasks that produce
/// data and a task that consumes queued data.
/// 
/// `import * as f from 'f-streams'`
/// 
/// * `queue = ez.devices.queue.create(options)`  
///   creates a queue device.  
///   The queue device has two properties:  
///   `queue.reader`: a reader from which you can read the data which has been queued.  
///   `queue.writer`:  a writer to which you can write data.  
///   You can also interact with the queue with the following non-streaming API:  
///   `data = queue.get()` gets the next item from the queue.  
///   `ok = queue.put(data)` adds an item to the queue (synchronously).  
///   You can pass a `max` option through the `options` parameter when creating the queue. 
///   If you pass this option, `queue.put(data)` will return true if the data has been queued and false if 
///   the data has been discarded because the queue is full. 
///   Note that `queue.writer will not discard the data but instead will wait for the queue to become available.

export interface Queue<T> {
	read(): T;
	write(item?: T): any;
	put(item: T, force?: boolean): boolean;
	end(): void;
	peek(): T;
	contents(): T[];
	adjust(fn: (oldContents: T[]) => T[]): void;
	length: number;
	reader: Reader<T>;
	writer: Writer<T>;
}

// any and type intersection to the rescuse because queue is not an ES2015 class
export function create<T>(max?: number): Queue<T> {
	var q = _.queue(max);
	const queue = Object.assign({}, q, {
		read() { return util.wait_(_ => q.read(_)); },
		write(item?: T) { util.wait_(_ => q.write(_, item)); },
	}) as Queue<T>;
	queue.reader = generic.reader<T>(queue.read.bind(queue), function () { queue.end.call(queue); })
	queue.writer = generic.writer<T>(queue.write.bind(queue))
	return queue;
}
