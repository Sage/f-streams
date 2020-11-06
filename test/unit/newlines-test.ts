import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import * as fs from 'fs';
import { bufferReader, linesFormatter, linesParser, stringReader, stringWriter, textFileReader } from '../..';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

const inputFile = require('os').tmpdir() + '/jsonInput.json';
const outputFile = require('os').tmpdir() + '/jsonOutput.json';

function nodeStream(text: string) {
    wait(cb => fs.writeFile(inputFile, text, 'utf8', cb));
    return textFileReader(inputFile);
}

describe(module.id, () => {
    it('empty', () => {
        const stream = nodeStream('').transform(linesParser());
        strictEqual(stream.read(), undefined, 'undefined');
    });

    it('non empty line', () => {
        const stream = nodeStream('a').transform(linesParser());
        strictEqual(stream.read(), 'a', 'a');
        strictEqual(stream.read(), undefined, 'undefined');
    });

    it('only newline', () => {
        const stream = nodeStream('\n').transform(linesParser());
        strictEqual(stream.read(), '', 'empty line');
        strictEqual(stream.read(), undefined, 'undefined');
    });

    it('mixed', () => {
        const stream = nodeStream('abc\n\ndef\nghi').transform(linesParser());
        strictEqual(stream.read(), 'abc', 'abc');
        strictEqual(stream.read(), '', 'empty line');
        strictEqual(stream.read(), 'def', 'def');
        strictEqual(stream.read(), 'ghi', 'ghi');
        strictEqual(stream.read(), undefined, 'undefined');
    });

    it('roundtrip', () => {
        const writer = stringWriter();
        const text = 'abc\n\ndef\nghi';
        stringReader(text, 2)
            .transform(linesParser())
            .transform(linesFormatter())
            .pipe(writer);
        strictEqual(writer.toString(), text, text);
    });

    it('binary input', () => {
        const writer = stringWriter();
        const text = 'abc\n\ndef\nghi';
        bufferReader(Buffer.from(text, 'utf8'))
            .transform(linesParser())
            .transform(linesFormatter())
            .pipe(writer);
        strictEqual(writer.toString(), text, text);
    });
});
