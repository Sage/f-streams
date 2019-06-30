import { assert } from 'chai';
import { IncomingHttpHeaders } from 'http';
import { setup } from 'f-mocha';
import { wait } from 'f-promise';
import {
    bufferReader,
    bufferWriter,
    multipartFormatter,
    multipartParser,
    Reader,
    Writer,
    BinaryReader,
    binaryReader,
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

function testStreamMixed(body1?: string, body2?: string) {
    const parts = [
        {
            headers: {
                A: 'VA1',
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
    return bufferReader(Buffer.from(parts.map(formatPart).join(''), 'binary'));
}

function testStreamFormData(body1?: string, body2?: string): Reader<Buffer> {
    const parts = [
        {
            headers: {
                A: 'VA1',
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
    const arrayBuffer = CR_LF + parts.map(formatPartWithFormData).join('') + CR_LF + '--' + boundary + '--';
    //  console.log("HEADER", arrayBuffer, "END");
    return bufferReader(Buffer.from(arrayBuffer, 'binary'));
}

function yieldMapper(buffer: Buffer) {
    wait(cb => setImmediate(cb));
    return buffer;
}

function binaryToBufferReaderTransformer(reader: BinaryReader, writer: Writer<Buffer>) {
    let chunkSize = 40 * 1024;
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
        const source = testStreamMixed();
        const stream = source.transform(multipartParser(headers('mixed')));
        let part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA1', 'header A');
        strictEqual(part.headers.b, 'VB1', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        let r = part.read();
        strictEqual(r.toString('binary'), 'C1', 'body C1');
        r = part.read();
        strictEqual(r, undefined, 'end of part 1');

        part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA2', 'header A');
        strictEqual(part.headers.b, 'VB2', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        r = part.read();
        strictEqual(r.toString('binary'), 'C2', 'body C2');
        r = part.read();
        strictEqual(r, undefined, 'end of part 2');

        part = stream.read();
        assert.isUndefined(part);
    });

    it('multipart/mixed roundtrip', () => {
        const heads = headers('mixed');
        const source = testStreamMixed();
        const writer = bufferWriter();
        source
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer);
        const result = writer.toBuffer();
        strictEqual(result.length, 178);
        const writer2 = bufferWriter();
        bufferReader(result)
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer2);
        strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
    });

    it('basic multipart/form-data', () => {
        const source = testStreamFormData();
        const stream = source.transform(multipartParser(headers('form-data')));
        let part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA1', 'header A');
        strictEqual(part.headers.b, 'VB1', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        strictEqual(part.headers['content-disposition'], 'form-data; name="c1";', 'content-disposition');
        let r = part.read();
        strictEqual(r.toString('binary'), 'C1', 'body C1');
        r = part.read();
        strictEqual(r, undefined, 'end of part 1');

        part = stream.read();
        ok(part != null, 'part != null');
        strictEqual(part.headers.a, 'VA2', 'header A');
        strictEqual(part.headers.b, 'VB2', 'header B');
        strictEqual(part.headers['content-type'], 'text/plain', 'content-type');
        strictEqual(part.headers['content-disposition'], 'form-data; name="c2";', 'content-disposition');
        r = part.read();
        strictEqual(r.toString('binary'), 'C2', 'body C2');
        r = part.read();
        strictEqual(r, undefined, 'end of part 2');

        part = stream.read();
        assert.isUndefined(part);
    });

    it('multipart/form-data roundtrip', () => {
        const heads = headers('form-data');
        const source = testStreamFormData();
        const writer = bufferWriter();
        source
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer);
        const result = writer.toBuffer();
        strictEqual(result.length, 262);
        const writer2 = bufferWriter();
        bufferReader(result)
            .transform(multipartParser(heads))
            .transform(multipartFormatter(heads))
            .pipe(writer2);
        strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
    });

    it('mutlipart/form-data with binaryReader and applying transformation', () => {
        const expectedLength = [10 * 1024, 20 * 1024];

        const heads = headers('form-data');
        const source = testStreamFormData(
            Buffer.alloc(expectedLength[0]).toString(),
            Buffer.alloc(expectedLength[1]).toString(),
        );

        const receivedLength = [0, 0];
        source
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
    it.skip('mutlipart/mixed with binaryReader and applying transformation', () => {
        const expectedLength = [10 * 1024, 20 * 1024];

        const heads = headers('mixed');
        const source = testStreamMixed(
            Buffer.alloc(expectedLength[0]).toString(),
            Buffer.alloc(expectedLength[1]).toString(),
        );

        const receivedLength = [0, 0];
        source
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
