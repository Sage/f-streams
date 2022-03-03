import { assert } from 'chai';
import { setup } from 'f-mocha';

import { binaryFileReader, cutter, Reader, stringConverter, stringWriter, textFileReader, Writer } from '../..';

setup();

const { equal, throws } = assert;

const sample = __dirname + '/../../../test/fixtures/rss-sample.xml';
const zlib = require('zlib');

describe(module.id, () => {
    it('gzip roundtrip', () => {
        const sampleReader1 = textFileReader(sample);
        let sampleReader2 = textFileReader(sample);
        const stringify = stringConverter();
        const cut = cutter(10);
        sampleReader2 = sampleReader2
            .nodeTransform(zlib.createGzip())
            .nodeTransform(zlib.createGunzip())
            .map(stringify);
        const cmp = sampleReader1.transform(cut).compare(sampleReader2.transform(cut));
        equal(cmp, 0);
    });
    it('writer nodify', () => {
        const sampleReader1 = textFileReader(sample);
        const sampleReader2 = textFileReader(sample);
        const dest = stringWriter();
        const expected = sampleReader2.toArray().join('');
        const piped = sampleReader1.nodify().pipe(dest.nodify());
        piped.on('finish', function() {
            equal(dest.toString(), expected);
        });
    });
    it('nodeTransform error chain', () => {
        const tranformFn = (shouldThrow: boolean) => {
            return (reader: Reader<Buffer>, writer: Writer<Buffer>) => {
                if (shouldThrow) throw new Error('Error chain');
                const transformer = zlib.createGzip();
                reader.nodeTransform(transformer).pipe(writer);
            };
        };

        const r1 = binaryFileReader(sample);
        const r3 = r1.transform(tranformFn(true));
        const r4 = r3.transform(tranformFn(false));
        throws(() => r4.readAll(), 'Error chain');
    });
});
