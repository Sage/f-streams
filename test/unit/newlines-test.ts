import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal, ok, strictEqual, deepEqual } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}

const lines = ez.transforms.lines;
const file = ez.devices.file;

const inputFile = require('os').tmpdir() + '/jsonInput.json';
const outputFile = require('os').tmpdir() + '/jsonOutput.json';
const fs = require('mz/fs');
const string = ez.devices.string;

function nodeStream(text: string) {
    wait(fs.writeFile(inputFile, text, "utf8"));
    return file.text.reader(inputFile);
}

describe(module.id, () => {
    test("empty", () => {
        const stream = nodeStream('').transform(lines.parser());
        strictEqual(stream.read(), undefined, "undefined");
    });

    test("non empty line", () => {
        const stream = nodeStream('a').transform(lines.parser());
        strictEqual(stream.read(), 'a', "a");
        strictEqual(stream.read(), undefined, "undefined");
    });

    test("only newline", () => {
        const stream = nodeStream('\n').transform(lines.parser());
        strictEqual(stream.read(), '', "empty line");
        strictEqual(stream.read(), undefined, "undefined");
    });

    test("mixed", () => {
        const stream = nodeStream('abc\n\ndef\nghi').transform(lines.parser());
        strictEqual(stream.read(), 'abc', 'abc');
        strictEqual(stream.read(), '', "empty line");
        strictEqual(stream.read(), 'def', 'def');
        strictEqual(stream.read(), 'ghi', 'ghi');
        strictEqual(stream.read(), undefined, "undefined");
    });

    test("roundtrip", () => {
        const writer = string.writer();
        const text = 'abc\n\ndef\nghi';
        string.reader(text, 2).transform(lines.parser()).transform(lines.formatter()).pipe(writer);
        strictEqual(writer.toString(), text, text);
    });

    test("binary input", () => {
        const writer = string.writer();
        const text = 'abc\n\ndef\nghi';
        ez.devices.buffer.reader(new Buffer(text, 'utf8')).transform(lines.parser()).transform(lines.formatter()).pipe(writer);
        strictEqual(writer.toString(), text, text);
    });
});