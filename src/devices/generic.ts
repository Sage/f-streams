"use strict";
import { Reader } from '../reader';
import { Writer } from '../writer';

/// ## Special streams
/// 
/// * `ez.devices.generic.empty`  
///   The empty stream. `empty.read()` returns `undefined`.
///   It is also a null sink. It just discards anything you would write to it.
export const empty = {
	reader: new Reader(function (this: Reader<any>) { }),
	writer: new Writer(function (this: Writer<any>, value: any) { }),
};

/// !doc
/// ## Generic stream constructors
/// 
/// `import * as f from 'f-streams'`
/// 
/// * `reader = ez.devices.generic.reader(read[, stop])`  
///   creates an EZ reader from a given `read()` function and an optional `stop([arg])` function.
export function reader<T>(read: () => T, stop?: (arg?: any) => void) {
	return new Reader(read, stop);
}

/// * `writer = ez.devices.generic.writer(write)`  
///   creates an ES writer from a given `write(val)` function.
export function writer<T>(write: (value: T) => void, stop?: (arg?: any) => void) {
	return new Writer(write, stop);
}
