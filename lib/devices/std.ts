import * as streams from '../node-wrappers';
import { Reader } from '../reader';
import { Writer } from '../writer';

/// !doc
/// ## Wrappers for standard I/O streams
///
/// `import { stdInput, stdOutput, stdError } from 'f-streams'`
///
/// * `reader = stdInput(encoding)`
/// * `writer = stdOutput(encoding)`
/// * `writer = stdError(encoding)`
export const input: Input = function(encoding?: string) {
    const st = new streams.ReadableStream(process.stdin, {});
    st.setEncoding(encoding || null);
    process.stdin.resume();
    return st.reader;
};

export const output: Output = function(encoding?: string) {
    return new streams.WritableStream(process.stdout, {
        encoding: encoding,
    }).writer;
};

export const error: Output = function(encoding?: string) {
    return new streams.WritableStream(process.stderr, {
        encoding: encoding,
    }).writer;
};

export interface Input {
    (encoding: string): Reader<string>;
    (): Reader<Buffer>;
}
export interface Output {
    (encoding: string): Writer<string>;
    (): Writer<Buffer>;
}

// compat API (cannot export 'in' to TS because reserved word)
exports.in = input;
exports.out = output;
exports.err = error;
