import { Queue, QueueOptions } from 'f-promise';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as generic from './generic';

/// !doc
/// ## Queue device
/// 
/// The queue device can be used to desynchronize processing between one or several tasks that produce
/// data and a task that consumes queued data.
/// 
/// `import { queue } from 'f-streams'`
/// 
/// * `q = queue(options)`  
///   creates a queue.  
///   The queue has two properties:  
///   `q.reader`: a reader from which you can read the data which has been queued.  
///   `q.writer`:  a writer to which you can write data.  
///   You can also interact with the queue with the following non-streaming API:  
///   `data = q.get()` gets the next item from the queue.  
///   `ok = q.put(data)` adds an item to the queue (synchronously).  
///   You can pass a `max` option through the `options` parameter when creating the queue. 
///   If you pass this option, `q.put(data)` will return true if the data has been queued and false if 
///   the data has been discarded because the queue is full. 
///   Note that `q.writer will not discard the data but instead will wait for the queue to become available.

export { QueueOptions };
export class StreamedQueue<T> extends Queue<T> {
	reader: Reader<T>;
	writer: Writer<T>;

	constructor(options?: QueueOptions | number) {
		super(options);
		this.reader = generic.reader<T>(() => this.read(), () => this.end());
		this.writer = generic.writer<T>(val => this.write(val));
	}
}

// any and type intersection to the rescuse because queue is not an ES2015 class
export function create<T>(options?: QueueOptions | number) {
	return new StreamedQueue(options);
}
