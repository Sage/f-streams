"use strict";
/// !doc
/// ## Transform to cut string and binary streams
/// 
/// `import * as f from 'f-streams'`  
import { Reader } from "../reader";
import { Writer } from "../writer";
/// 
/// * `transform = ez.transforms.cut(options)`  
///   cuts a string or binary stream in chunks of equal size  
export interface Options {
	size?: number;
}

export function transform<T>(options?: Options) {
	options = options || {};
	const size = typeof options === 'number' ? options : options.size;
	return (reader: Reader<T>, writer: Writer<T>) => {
		if (!size) return reader.pipe(writer);
		var data: any = reader.read();
		while (data !== undefined) {
			if (data.length < size) {
				var d = reader.read();
				if (d === undefined) {
					if (data.length > 0) writer.write(data);
					data = d;
				} else {
					if (typeof data === 'string') data += d;
					else if (Buffer.isBuffer(data) && Buffer.isBuffer(d)) data = Buffer.concat([data, d]);
					else if (Array.isArray(data)) data = data.concat(d);
					else throw new Error("Cannot cut: bad data type: " + typeof data);
				}
			} else {
				writer.write(data.slice(0, size));
				data = data.slice(size);
			}
		}
	};
}
