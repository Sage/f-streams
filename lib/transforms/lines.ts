/// !doc
/// ## Stream transform for line-oriented text streams
/// 
/// `import { linesParser, linesFormatter } from 'f-streams'`  
/// 
/// * `transform = linesParser(options)`  
///   creates a parser transform.
///   `options` is reserved for future use.
import { Reader } from '../reader';
import { Writer } from '../writer';

export interface ParserOptions {
	sep?: string;
	encoding?: string;
}

export function parser(options?: ParserOptions): (reader: Reader<string | Buffer>, writer: Writer<string>) => void {
	const opts = options || {};

	function clean(line: string) {
		return (!opts.sep && line[line.length - 1] === '\r') ? line.substring(0, line.length - 1) : line;
	}
	return (reader: Reader<string | Buffer>, writer: Writer<string>) => {
		let remain = '';
		reader.forEach(chunk => {
			let str: string;
			if (typeof chunk === 'string') str = chunk;
			else if (Buffer.isBuffer(chunk)) str = chunk.toString(opts.encoding || 'utf8');
			else if (chunk === undefined) return;
			else throw new Error('bad input: ' + typeof chunk);
			const lines = str.split(opts.sep || '\n');
			if (lines.length > 1) {
				writer.write(clean(remain + lines[0]));
				let i = 1;
				for (; i < lines.length - 1; i++) writer.write(clean(lines[i]));
				remain = lines[i];
			} else {
				remain += lines[0];
			}
		});
		if (remain) writer.write(remain);
	};
}

/// * `transform = linesFormatter(options)`  
///   creates a formatter transform.
///   `options.eol` defines the line separator. It is set to `\n` by default.
///   `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
export interface FormatterOptions {
	eol?: string;
	extra?: boolean;
}

export function formatter(options?: FormatterOptions) {
	const opts = options || {};
	const eol = opts.eol || '\n';
	return (reader: Reader<string>, writer: Writer<string>) => {
		if (opts.extra) {
			reader.forEach(line => {
				writer.write(line + eol);
			});
		} else {
			reader.forEach((line, i) => {
				writer.write(i > 0 ? eol + line : line);
			});
		}
	};
}