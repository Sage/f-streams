import { assert } from 'chai';
import { setup } from 'f-mocha';
import { sleep, wait } from 'f-promise';
import { IncomingHttpHeaders } from 'http';
import {
    BinaryReader,
    binaryReader,
    bufferReader,
    bufferWriter,
    multipartFormatter,
    multipartParser,
    Reader,
    Writer,
} from '../..';

setup();

const { ok, strictEqual } = assert;

const boundary = '------------myBoundary';

function headers(subType: string) {
    return {
        'content-type': 'multipart/' + subType + ';atb1=val1; boundary=' + boundary + '; atb2=val2',
    };
}

type Part = {
    headers: { [key: string]: string };
    body: string;
};

interface ITestStreamData {
    reader: Reader<Buffer>;
    expectedResult: string;
}

function testStreamMixed(body1?: string, body2?: string): ITestStreamData {
    const parts = [
        {
            headers: {
                A: 'Và1',
                B: 'VB1',
                'Content-Type': 'text/plain',
            },
            body: body1 || 'C1',
        },
        {
            headers: {
                'content-type': 'text/plain',
                A: 'VA2',
                B: 'VB2',
            },
            body: body2 || 'C2',
        },
    ] as { headers: IncomingHttpHeaders; body: string }[];

    function formatPart(part: Part) {
        return (
            Object.keys(part.headers)
                .map(function(name) {
                    return name + ': ' + part.headers[name];
                })
                .join('\n') +
            '\n\n' +
            boundary +
            '\n' +
            part.body +
            '\n' +
            boundary +
            '\n'
        );
    }
    return {
        reader: bufferReader(Buffer.from(parts.map(formatPart).join(''))),
        expectedResult: 'a: Và1\nb: VB1\ncontent-type: text/plain\n\n------------myBoundary\nC1\n------------myBoundary\n' +
            'content-type: text/plain\na: VA2\nb: VB2\n\n------------myBoundary\nC2\n------------myBoundary\n',
    };
}

function testStreamFormData(body1?: string, body2?: string): ITestStreamData {
    const parts = [
        {
            headers: {
                A: 'Và1',
                B: 'VB1',
                'Content-Type': 'text/plain',
                'content-disposition': 'form-data; name="c1";',
            },
            body: body1 || 'C1',
        },
        {
            headers: {
                'content-type': 'text/plain',
                'content-disposition': 'form-data; name="c2";',
                A: 'VA2',
                B: 'VB2',
            },
            body: body2 || 'C2',
        },
    ] as { headers: IncomingHttpHeaders; body: string }[];

    const CR_LF = '\r\n';
    function formatPartWithFormData(part: Part) {
        return (
            CR_LF +
            '--' +
            boundary +
            CR_LF +
            Object.keys(part.headers)
                .map(function(name) {
                    return name + ': ' + part.headers[name];
                })
                .join(CR_LF) +
            CR_LF +
            CR_LF +
            part.body
        );
    }
    return {
        reader: bufferReader(Buffer.from(CR_LF + parts.map(formatPartWithFormData).join('') + CR_LF + '--' + boundary + '--')),
        expectedResult: '--------------myBoundary\r\na: Và1\r\nb: VB1\r\ncontent-type: text/plain\r\n' +
            'content-disposition: form-data; name=\"c1\";\r\n\r\nC1\r\n--------------myBoundary\r\ncontent-type: text/plain\r\n' +
            'content-disposition: form-data; name=\"c2\";\r\na: VA2\r\nb: VB2\r\n\r\nC2\r\n--------------myBoundary--',
    };
}

function yieldMapper(buffer: Buffer) {
    wait(setImmediate);
    return buffer;
}

function binaryToBufferReaderTransformer(reader: BinaryReader, writer: Writer<Buffer>) {
    const chunkSize = 40 * 1024;
    // With our setting:
    // - read the whole stream.
    // - chunkSize always bigger than file size.
    // - trigger multipart hk.notify()
    let r = reader.read(chunkSize);
    while (r) {
        writer.write(r);
        // reread end (undefined)
        // and retrigger multipart hk.notify()
        r = reader.read(chunkSize);
    }
}

describe(module.id, () => {
    it('basic multipart/mixed', () => {
        const data = testStreamMixed();
        const stream = data.reader.transform(multipartParser(headers('mixed')));
        let part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'Và1', 'header A');
        strictEqual(part.headers.b, 'VB1', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        let r = part.read();
        strictEqual(r.toString('binary'), 'C1', 'body C1');
        sleep(1); // sleeps are here to let asynchrous operation like hk.notify occure
        r = part.read();
        strictEqual(r, undefined, 'end of part 1');
        sleep(1);
        strictEqual(part.read(), undefined, 'end of part 1 again');

        part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA2', 'header A');
        strictEqual(part.headers.b, 'VB2', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        r = part.read();
        strictEqual(r.toString('binary'), 'C2', 'body C2');
        sleep(1);
        r = part.read();
        strictEqual(r, undefined, 'end of part 2');
        sleep(1);
        strictEqual(part.read(), undefined, 'end of part 2 again');

        part = stream.read();
        assert.isUndefined(part);
    });

    it('multipart/mixed roundtrip', () => {
        const heads = headers('mixed');
        const data = testStreamMixed();
        const writer = bufferWriter();
        data.reader
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer);
        const result = writer.toBuffer();
        strictEqual(result.toString('utf8'), data.expectedResult);
        const writer2 = bufferWriter();
        bufferReader(result)
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer2);
        strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
    });

    it('basic multipart/form-data', () => {
        const data = testStreamFormData();
        const stream = data.reader.transform(multipartParser(headers('form-data')));
        let part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'Và1', 'header A');
        strictEqual(part.headers.b, 'VB1', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        strictEqual(part.headers['content-disposition'], 'form-data; name="c1";', 'content-disposition');
        let r = part.read();
        strictEqual(r.toString('binary'), 'C1', 'body C1');
        sleep(1); // sleeps are here to let asynchrous operation like hk.notify occure
        r = part.read();
        strictEqual(r, undefined, 'end of part 1');
        sleep(1);
        strictEqual(part.read(), undefined, 'end of part 1 again');

        part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA2', 'header A');
        strictEqual(part.headers.b, 'VB2', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        strictEqual(part.headers['content-disposition'], 'form-data; name="c2";', 'content-disposition');
        r = part.read();
        strictEqual(r.toString('binary'), 'C2', 'body C2');
        sleep(1);
        r = part.read();
        strictEqual(r, undefined, 'end of part 2');
        sleep(1);
        strictEqual(part.read(), undefined, 'end of part 2 again');

        part = stream.read();
        assert.isUndefined(part);
    });

    it('multipart/form-data roundtrip', () => {
        const heads = headers('form-data');
        const data = testStreamFormData();
        const writer = bufferWriter();
        data.reader
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer);
        const result = writer.toBuffer();
        strictEqual(result.toString('utf8'), data.expectedResult);
        const writer2 = bufferWriter();
        bufferReader(result)
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer2);
        strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
    });

    it('multipart/form-data with binaryReader and applying transformation', () => {
        const expectedLength = [10 * 1024, 20 * 1024];

        const heads = headers('form-data');
        const data = testStreamFormData(
            Buffer.alloc(expectedLength[0]).toString(),
            Buffer.alloc(expectedLength[1]).toString(),
        );

        const receivedLength = [0, 0];
        data.reader
            // Force stream to not be read in same event loop
            .map(yieldMapper)
            .transform(multipartParser(heads))
            .forEach((partReader: Reader<Buffer>, i) => {
                binaryReader(partReader)
                    // This transform coupled with binaryReader triggers two final reads in part reader
                    .transform(binaryToBufferReaderTransformer)
                    .forEach(b => {
                        receivedLength[i] += b.length;
                    });

                assert.equal(receivedLength[i], expectedLength[i]);
            });
    });

    // Moving handshake does not fix the problem.
    // I suspect a bug inside mixed parser function that does not support multiple read in part last chunk (return undefined),
    // because of binaryReader with transformer
    it('multipart/mixed with binaryReader and applying transformation', () => {
        const expectedLength = [10 * 1024, 20 * 1024];

        const heads = headers('mixed');
        const data = testStreamMixed(
            Buffer.alloc(expectedLength[0]).toString(),
            Buffer.alloc(expectedLength[1]).toString(),
        );

        const receivedLength = [0, 0];
        data.reader
            .map(yieldMapper)
            .transform(multipartParser(heads))
            .forEach((partReader: Reader<Buffer>, i) => {
                binaryReader(partReader)
                    .transform(binaryToBufferReaderTransformer)
                    .forEach(b => {
                        receivedLength[i] += b.length;
                    });

                assert.equal(receivedLength[i], expectedLength[i]);
            });
    });
});
