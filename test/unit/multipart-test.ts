import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import { bufferReader, bufferWriter, multipartFormatter, multipartParser } from '../..';
import { IncomingHttpHeaders } from 'http';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

const boundary = '-- my boundary --';

function headers(subType: string) {
	return {
		'content-type': 'multipart/' + subType + ';atb1=val1; boundary=' + boundary + '; atb2=val2',
	};
}

type Part = {
	headers: { [key: string]: string };
	body: string;
};

function testStream() {
	const parts = [{
		headers: {
			A: 'VA1',
			B: 'VB1',
			'Content-Type': 'text/plain',
		},
		body: 'C1',
	}, {
		headers: {
			'content-type': 'text/plain',
			A: 'VA2',
			B: 'VB2',
		},
		body: 'C2',
	}] as { headers: IncomingHttpHeaders; body: string; }[];

	function formatPart(part: Part) {
		return Object.keys(part.headers).map(function (name) {
			return name + ': ' + part.headers[name];
		}).join('\n') + '\n\n' + boundary + '\n' + part.body + '\n' + boundary + '\n';
	}
	return bufferReader(Buffer.from(parts.map(formatPart).join(''), 'binary'));
}

describe(module.id, () => {
	it('basic multipart/mixed', () => {
		const source = testStream();
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
		equal(part, undefined, 'read next part returns undefined');
	});

	it('multipart/mixed roundtrip', () => {
		const heads = headers('mixed');
		const source = testStream();
		const writer = bufferWriter();
		source.transform(multipartParser(heads)).transform(multipartFormatter(heads)).pipe(writer);
		const result = writer.toBuffer();
		strictEqual(result.length, 158);
		const writer2 = bufferWriter();
		bufferReader(result).transform(multipartParser(heads)).transform(multipartFormatter(heads)).pipe(writer2);
		strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
	});
});