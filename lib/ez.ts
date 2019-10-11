import * as devices from './devices/index';
import * as helpers from './helpers/index';
import * as mappers from './mappers/index';
import * as stopException from './stop-exception';
import * as transforms from './transforms/index';

import EzFactory from './factory';
import * as EzReader from './reader';
import * as EzWriter from './writer';

export { devices, helpers, mappers, transforms, stopException };

export const factory = EzFactory;

export { Reader, CompareOptions, ParallelOptions } from './reader';
export { Writer } from './writer';

export function reader(arg: string | any[] | Buffer): EzReader.Reader<any> {
    if (typeof arg === 'string') {
        const f = factory(arg);
        let rd: EzReader.Reader<any>;
        return devices.generic.reader(
            function read() {
                if (!rd) rd = f.reader();
                return rd.read();
            },
            function stop(aarg) {
                if (!rd) rd = f.reader();
                return rd.stop(aarg);
            },
        );
    } else if (Array.isArray(arg)) {
        return devices.array.reader(arg);
    } else if (Buffer.isBuffer(arg)) {
        return devices.buffer.reader(arg);
    } else {
        throw new Error(`invalid argument ${arg && typeof arg}`);
    }
}

export function writer(arg: string | any[] | Buffer): EzWriter.Writer<any> {
    if (typeof arg === 'string') {
        const f = factory(arg);
        let wr: EzWriter.Writer<any>;
        const wrapper = devices.generic.writer(
            function write(val) {
                if (!wr) wr = f.writer();
                return wr.write(val);
            },
            function stop(aarg) {
                if (!wr) wr = f.writer();
                return wr.stop(aarg);
            },
        );
        Object.defineProperty(wrapper, 'result', {
            get: () => {
                const anyWriter: any = wr;
                return anyWriter.result;
            },
        });
        return wrapper;
    } else if (Array.isArray(arg)) {
        // warning: arg is ignored here
        return devices.array.writer();
    } else if (Buffer.isBuffer(arg)) {
        // warning: arg is ignored here
        return devices.buffer.writer();
    } else {
        throw new Error(`invalid argument ${arg && typeof arg}`);
    }
}

// compatibility hacks
function anyfy(x: any) {
    return x;
}
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

// more practical imports for devices
export { Options as ArrayOptions, reader as arrayReader, writer as arrayWriter } from './devices/array';

export { Options as BufferOptions, reader as bufferReader, writer as bufferWriter } from './devices/buffer';

export {
    reader as childProcessReader,
    ReaderOptions as ChildProcessReaderOptions,
    writer as childProcessWriter,
    WriterOptions as ChildProcessWriterOptions,
} from './devices/child-process';

export { error as consoleError, info as consoleInfo, log as consoleLog, warn as consoleWarn } from './devices/console';

export const textFileReader = devices.file.text.reader;
export const textFileWriter = devices.file.text.writer;
export const binaryFileReader = devices.file.binary.reader;
export const binaryFileWriter = devices.file.binary.writer;
export {
    ListOptions as DirectoryReaderOptions,
    ListEntry as DirectoryEntry,
    list as directoryReader,
} from './devices/file';

/** @deprecated - use createEmptyReader() instead */
export const emptyReader = devices.generic.empty.reader;
/** @deprecated - this writer is buggy, use createEmptyWriter() instead */
export const emptyWriter = devices.generic.empty.writer;
export const createEmptyReader = devices.generic.empty.createReader;
export const createEmptyWriter = devices.generic.empty.createWriter;
export { reader as genericReader, writer as genericWriter } from './devices/generic';

export {
    HttpProxyClientRequest,
    HttpClientRequest,
    HttpClientResponse,
    HttpClientOptions,
    HttpServer,
    HttpServerRequest,
    HttpServerResponse,
    HttpServerOptions,
    server as httpServer,
    client as httpClient,
    listener as httpListener,
} from './devices/http';

export {
    SocketOptions,
    SocketClient,
    SocketServerOptions,
    SocketServerListener,
    SocketServer,
    server as socketServer,
    socketClient,
    tcpClient,
} from './devices/net';

export { reader as nodeReader, writer as nodeWriter } from './devices/node';

export { QueueOptions, create as queue } from './devices/queue';

export { input as stdInput, output as stdOutput, error as stdError } from './devices/std';

export { Options as StringOptions, reader as stringReader, writer as stringWriter } from './devices/string';

export { create as uturn } from './devices/uturn';

export {
    BinaryReader,
    BinaryWriter,
    ReaderOptions as BinaryReaderOptions,
    WriterOptions as BinaryWriterOptions,
    reader as binaryReader,
    writer as binaryWriter,
} from './helpers/binary';

export { reader as multiplexReader } from './helpers/multiplex';

export { stringify as stringConverter, bufferify as bufferConverter } from './mappers/convert';

export {
    ParserOptions as SimpleJsonParserOptions,
    FormatterOptions as SimpleJsonFormatterOptions,
    parse as simpleJsonParser,
    stringify as simpleJsonFormatter,
} from './mappers/json';

export {
    ParserOptions as CsvParserOptions,
    FormatterOptions as CsvFormatterOptions,
    parser as csvParser,
    formatter as csvFormatter,
} from './transforms/csv';

export {
    ParserOptions as JsonParserOptions,
    FormatterOptions as JsonFormatterOptions,
    parser as jsonParser,
    formatter as jsonFormatter,
} from './transforms/json';

export {
    ParserOptions as LinesParserOptions,
    FormatterOptions as LinesFormatterOptions,
    parser as linesParser,
    formatter as linesFormatter,
} from './transforms/lines';

export { transform as cutter } from './transforms/cut';

export {
    ParserOptions as MultipartParserOptions,
    FormatterOptions as MultipartFormatterOptions,
    parser as multipartParser,
    formatter as multipartFormatter,
} from './transforms/multipart';

export {
    ParserOptions as XmlParserOptions,
    FormatterOptions as XmlFormatterOptions,
    parser as xmlParser,
    formatter as xmlFormatter,
} from './transforms/xml';

export { Options as FilterOptions, convert as predicate, converter as predicateBuilder } from './predicate';
