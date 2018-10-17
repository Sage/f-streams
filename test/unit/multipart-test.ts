import { assert } from 'chai';
import { setup } from 'f-mocha';
import { bufferReader, bufferWriter, multipartFormatter, multipartParser } from '../..';
import { IncomingHttpHeaders } from 'http';
setup();

const { equal, ok, strictEqual } = assert;

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

function testStreamFormData() {
    const parts = [{
        headers: {
            A: 'VA1',
            B: 'VB1',
            'Content-Type': 'text/plain',
            'content-disposition': 'form-data; name="c1";',
        },
        body: 'C1',
    }, {
        headers: {
            'content-type': 'text/plain',
            'content-disposition': 'form-data; name="c2";',
            A: 'VA2',
            B: 'VB2',
        },
        body: 'C2',
    }] as { headers: IncomingHttpHeaders; body: string; }[];

    const CR_LF = '\r\n';
    function formatPartWithFormData(part: Part) {
        return CR_LF + '--' + boundary +  CR_LF + Object.keys(part.headers).map(function (name) {
            return  name + ': ' + part.headers[name];
        }).join(CR_LF) + CR_LF + CR_LF + part.body;
    }
    const arrayBuffer = CR_LF + parts.map(formatPartWithFormData).join('') + CR_LF + '--' + boundary + '--';
    //  console.log("HEADER", arrayBuffer, "END");
    return bufferReader(Buffer.from(arrayBuffer, 'binary'));
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
		strictEqual(result.length, 178);
		const writer2 = bufferWriter();
		bufferReader(result).transform(multipartParser(heads)).transform(multipartFormatter(heads)).pipe(writer2);
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
        equal(part, undefined, 'read next part returns undefined');
    });

    it('multipart/form-data roundtrip', () => {
        const heads = headers('form-data');
        const source = testStreamFormData();
        const writer = bufferWriter();
        source.transform(multipartParser(heads)).transform(multipartFormatter(heads)).pipe(writer);
        const result = writer.toBuffer();
        strictEqual(result.length, 262);
        const writer2 = bufferWriter();
        bufferReader(result).transform(multipartParser(heads)).transform(multipartFormatter(heads)).pipe(writer2);
        strictEqual(result.toString('binary'), writer2.toBuffer().toString('binary'));
    });
});
