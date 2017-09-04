import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import { bufferConverter, cutter, stringConverter, stringWriter, textFileReader } from '../..';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

const sample = __dirname + '/../../../test/fixtures/rss-sample.xml';
const zlib = require('zlib');

describe(module.id, () => {
	it('gzip roundtrip', () => {
		const sampleReader1 = textFileReader(sample);
		let sampleReader2 = textFileReader(sample);
		const stringify = stringConverter();
		const cut = cutter(10);
		const out = require('fs').createWriteStream(__dirname + '/../../../test/fixtures/rss-sample.zip');
		sampleReader2 = sampleReader2.nodeTransform(zlib.createGzip()).nodeTransform(zlib.createGunzip()).map(stringify);
		const cmp = sampleReader1.transform(cut).compare(sampleReader2.transform(cut));
		equal(cmp, 0);
	});
	it('writer nodify', () => {
		const sampleReader1 = textFileReader(sample);
		const sampleReader2 = textFileReader(sample);
		const dest = stringWriter();
		const expected = sampleReader2.toArray().join('');
		const piped = sampleReader1.nodify().pipe(dest.nodify());
		piped.on('finish', function () {
			equal(dest.toString(), expected);
		});
	});
});
