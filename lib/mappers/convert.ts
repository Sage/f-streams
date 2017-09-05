/// !doc
/// ## Encoding mappers
/// 
/// `import { stringConverter, bufferConverter } from 'f-streams'`  
/// 

/// * `mapper = stringConverter(encoding)`  
///   returns a mapper that converts to string
export function stringify(encoding?: string) {
	encoding = encoding || 'utf8';
	return (data: Buffer) => {
		return data.toString(encoding);
	};
}
/// * `mapper = bufferConverter(encoding)`  
///   returns a mapper that converts to buffer
export function bufferify(encoding?: string) {
	encoding = encoding || 'utf8';
	return (data: string) => {
		return new Buffer(data, encoding);
	};
}