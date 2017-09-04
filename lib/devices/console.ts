import { Writer } from '../writer';
import * as generic from './generic';

function consoleWriter(fn: (message: string) => void) {
	return generic.writer(function (this: Writer<string>, value: any) {
		if (value !== undefined) fn(value);
		return this;
	});
}

/// !doc
/// ## Console EZ streams
/// 
/// `import { consoleLog, consoleInfo, consoleWarn, consoleError } from 'f-streams'`
/// * `consoleLog`  
/// * `consoleInfo`  
/// * `consoleWarn`  
/// * `consoleError`  
///   Console writers 
export const log: Writer<string> = consoleWriter(console.log);
export const info: Writer<string> = consoleWriter(console.info);
export const warn: Writer<string> = consoleWriter(console.warn);
export const error: Writer<string> = consoleWriter(console.error);
