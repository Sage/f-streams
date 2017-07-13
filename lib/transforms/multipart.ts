/// !doc
/// ## Stream transform for MIME multipart
/// 
/// `import * as f from 'f-streams'`  
/// 
import { handshake, wait } from 'f-promise';
import * as generic from '../devices/generic';
import * as binary from '../helpers/binary';
import { Reader } from '../reader';
import { Writer } from '../writer';

function parseContentType(contentType?: string) {
	if (!contentType) throw new Error('content-type missing');
	const match = /^multipart\/([\w\-]*)/.exec(contentType);
	if (!match) return null;
	const subType = match[1];
	const atbs: any = contentType.split(/\s*;\s*/).reduce((r: any, s: string) => {
		const kv = s.split(/\s*=\s*/);
		r[kv[0]] = kv[1];
		return r;
	}, {});
	return {
		subType: subType,
		boundary: atbs.boundary,
	};
}

/// * `transform = ez.transforms.multipart.parser(options)`  
///   Creates a parser transform.
///   The content type, which includes the boundary,
///   is passed via `options['content-type']`.
export type ParserOptions = {
	[name: string]: string;
};

export function parser(options: ParserOptions) {
	const ct = parseContentType(options && options['content-type']);
	const boundary = ct && ct.boundary;
	if (!boundary) throw new Error('multipart boundary missing');

	return (reader: Reader<Buffer>, writer: Writer<any>) => {
		const binReader = binary.reader(reader);
		const hk = handshake();
		while (true) {
			const buf = binReader.readData(2048);
			if (!buf || !buf.length) return;
			const str = buf.toString('binary');
			let i = str.indexOf(boundary);
			if (i < 0) throw new Error('boundary not found');
			const lines = str.substring(0, i).split(/\r?\n/);
			const headers = lines.slice(0, lines.length - 2).reduce((h: any, l: string) => {
				const kv = l.split(/\s*:\s*/);
				h[kv[0].toLowerCase()] = kv[1];
				return h;
			}, {});
			i = str.indexOf('\n', i);
			binReader.unread(buf.length - i - 1);

			const read = () => {
				const len = Math.max(boundary.length, 256);
				const bbuf = binReader.readData(32 * len);
				if (!bbuf || !bbuf.length) {
					hk.notify();
					return;
				}
				// would be nice if Buffer had an indexOf. Would avoid a conversion to string.
				// I could use node-buffertools but it introduces a dependency on a binary module.
				const s = bbuf.toString('binary');
				const ii = s.indexOf(boundary);
				if (ii === 0) {
					const j = s.indexOf('\n', boundary.length);
					if (j < 0) throw new Error('newline missing after boundary');
					binReader.unread(bbuf.length - j - 1);
					hk.notify();
					return undefined;
				} else if (ii > 0) {
					let j = s.lastIndexOf('\n', ii);
					if (s[j - 1] === '\r') j--;
					binReader.unread(bbuf.length - ii);
					return bbuf.slice(0, j);
				} else {
					binReader.unread(bbuf.length - 31 * len);
					return bbuf.slice(0, 31 * len);
				}
			};
			const partReader = generic.reader(read);
			partReader.headers = headers;
			writer.write(partReader);
			hk.wait();
		}
	};
}

/// * `transform = ez.transforms.multipart.formatter(options)`  
///   Creates a formatter transform.
///   The content type, which includes the boundary,
///   is passed via `options['content-type']`.
export interface FormatterOptions {
	[name: string]: string;
}

export function formatter(options?: FormatterOptions) {
	const ct = parseContentType(options && options['content-type']);
	const boundary = ct && ct.boundary;
	if (!boundary) throw new Error('multipart boundary missing');

	return (reader: Reader<Reader<string>>, writer: Writer<Buffer>) => {
		let part: Reader<any> | undefined;
		while ((part = reader.read()) !== undefined) {
			const headers = part.headers;
			if (!headers) throw new Error('part does not have headers');
			Object.keys(part.headers).forEach(key => {
				writer.write(new Buffer(key + ': ' + headers[key] + '\n', 'binary'));
			});
			writer.write(new Buffer('\n' + boundary + '\n'));
			// cannot use pipe because pipe writes undefined at end.
			part.forEach(data => {
				writer.write(data);
			});
			writer.write(new Buffer('\n' + boundary + '\n'));
		}
	};
}