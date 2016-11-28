import * as devices from './devices/index';
import * as helpers from './helpers/index';
import * as mappers from './mappers/index';
import * as transforms from './transforms/index';
import * as predicate from './predicate';
import * as stopException from './stop-exception';

import * as EzReader from './reader';
import * as EzWriter from './writer';
import EzFactory from './factory';

export {
	devices, helpers, mappers, transforms,
	predicate, stopException
};

export const factory = EzFactory;

export type Reader<T> = EzReader.Reader<T>;
export type CompareOptions<T> = EzReader.CompareOptions<T>;
export type ParallelOptions = EzReader.ParallelOptions;

export type Writer<T> = EzWriter.Writer<T>;

export function reader(arg: string | any[] | Buffer): Reader<any> {
	if (typeof arg === 'string') {
		const f = factory(arg);
		let reader: Reader<any>;
		return devices.generic.reader(function read() {
			if (!reader) reader = f.reader();
			return reader.read();
		}, function stop(arg) {
			if (!reader) reader = f.reader();
			return reader.stop(arg);
		})
	} else if (Array.isArray(arg)) {
		return devices.array.reader(arg);
	} else if (Buffer.isBuffer(arg)) {
		return devices.buffer.reader(arg);
	} else {
		throw new Error(`invalid argument ${arg && typeof arg}`);
	}
}

export function writer(arg: string | any[] | Buffer): Writer<any> {
	if (typeof arg === 'string') {
		const f = factory(arg);
		let writer: Writer<any>;
		const wrapper = devices.generic.writer(function write(val) {
			if (!writer) writer = f.writer();
			return writer.write(val);
		}, function stop(arg) {
			if (!writer) writer = f.writer();
			return writer.stop(arg);
		});
		Object.defineProperty(wrapper, 'result', {
			get: () => {
				const anyWriter: any = writer;
				return anyWriter.result;
			}
		});
		return wrapper;
	} else if (Array.isArray(arg)) {
		return devices.array.writer(arg);
	} else if (Buffer.isBuffer(arg)) {
		return devices.buffer.writer(arg);
	} else {
		throw new Error(`invalid argument ${arg && typeof arg}`);
	}
}

// compatibility hacks
function anyfy(x: any) { return x; }
var readerHack: any = reader;
readerHack.create = EzReader.create;
readerHack.decorate = anyfy(EzReader).decorate;

var writerHack: any = writer;
writerHack.create = EzWriter.create;
writerHack.decorate = anyfy(EzWriter).decorate;

var transformHack: any = transforms.cut.transform;
(transforms as any).cut = transformHack;
transforms.cut.transform = transformHack;

var queueHack: any = devices.queue.create;
(devices as any).queue = queueHack;
devices.queue.create = queueHack;
