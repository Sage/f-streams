import * as devices from './devices/index';
import * as helpers from './helpers/index';
import * as mappers from './mappers/index';
import * as predicate from './predicate';
import * as stopException from './stop-exception';
import * as transforms from './transforms/index';

import EzFactory from './factory';
import * as EzReader from './reader';
import * as EzWriter from './writer';

export {
	devices, helpers, mappers, transforms,
	predicate, stopException,
};

export const factory = EzFactory;

export type Reader<T> = EzReader.Reader<T>;
export type CompareOptions<T> = EzReader.CompareOptions<T>;
export type ParallelOptions = EzReader.ParallelOptions;

export type Writer<T> = EzWriter.Writer<T>;

export function reader(arg: string | any[] | Buffer): Reader<any> {
	if (typeof arg === 'string') {
		const f = factory(arg);
		let rd: Reader<any>;
		return devices.generic.reader(function read() {
			if (!rd) rd = f.reader();
			return rd.read();
		}, function stop(aarg) {
			if (!rd) rd = f.reader();
			return rd.stop(aarg);
		});
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
		let wr: Writer<any>;
		const wrapper = devices.generic.writer(function write(val) {
			if (!wr) wr = f.writer();
			return wr.write(val);
		}, function stop(aarg) {
			if (!wr) wr = f.writer();
			return wr.stop(aarg);
		});
		Object.defineProperty(wrapper, 'result', {
			get: () => {
				const anyWriter: any = wr;
				return anyWriter.result;
			},
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
const readerHack: any = reader;
readerHack.create = EzReader.create;
readerHack.decorate = anyfy(EzReader).decorate;

const writerHack: any = writer;
writerHack.create = EzWriter.create;
writerHack.decorate = anyfy(EzWriter).decorate;

const transformHack: any = transforms.cut.transform;
(transforms as any).cut = transformHack;
transforms.cut.transform = transformHack;

const queueHack: any = devices.queue.create;
(devices as any).queue = queueHack;
devices.queue.create = queueHack;

export {
	HttpProxyClientRequest,
	HttpClientRequest,
	HttpClientResponse,
	HttpClientOptions,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
	HttpServerOptions,
} from './devices/http';
