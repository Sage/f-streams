import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal, ok, strictEqual, deepEqual } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}


const sample = __dirname + '/../../test/fixtures/rss-sample.xml';
const zlib = require('zlib');

describe(module.id, () => {
    test("gzip roundtrip", () => {
        const sampleReader1 = ez.devices.file.text.reader(sample);
        var sampleReader2 = ez.devices.file.text.reader(sample);
        const stringify = ez.mappers.convert.stringify();
        const cutter = ez.transforms.cut.transform(10);
        const out = require('fs').createWriteStream(__dirname + '/../../test/fixtures/rss-sample.zip');
        sampleReader2 = sampleReader2.nodeTransform(zlib.createGzip()).nodeTransform(zlib.createGunzip()).map(stringify);
        const cmp = sampleReader1.transform(cutter).compare(sampleReader2.transform(cutter));
        equal(cmp, 0);
    });
    test("writer nodify", () => {
        const sampleReader1 = ez.devices.file.text.reader(sample);
        const sampleReader2 = ez.devices.file.text.reader(sample);
        const dest = ez.devices.string.writer();
        const expected = sampleReader2.toArray().join('');
        const piped = sampleReader1.nodify().pipe(dest.nodify());
        piped.on('finish', function () {
            equal(dest.toString(), expected);
        });
    });
});
