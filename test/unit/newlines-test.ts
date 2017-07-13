import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { setup } from 'f-mocha';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

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
	it("empty", () => {
		const stream = nodeStream('').transform(lines.parser());
		strictEqual(stream.read(), undefined, "undefined");
	});

	it("non empty line", () => {
		const stream = nodeStream('a').transform(lines.parser());
		strictEqual(stream.read(), 'a', "a");
		strictEqual(stream.read(), undefined, "undefined");
	});

	it("only newline", () => {
		const stream = nodeStream('\n').transform(lines.parser());
		strictEqual(stream.read(), '', "empty line");
		strictEqual(stream.read(), undefined, "undefined");
	});

	it("mixed", () => {
		const stream = nodeStream('abc\n\ndef\nghi').transform(lines.parser());
		strictEqual(stream.read(), 'abc', 'abc');
		strictEqual(stream.read(), '', "empty line");
		strictEqual(stream.read(), 'def', 'def');
		strictEqual(stream.read(), 'ghi', 'ghi');
		strictEqual(stream.read(), undefined, "undefined");
	});

	it("roundtrip", () => {
		const writer = string.writer();
		const text = 'abc\n\ndef\nghi';
		string.reader(text, 2).transform(lines.parser()).transform(lines.formatter()).pipe(writer);
		strictEqual(writer.toString(), text, text);
	});

	it("binary input", () => {
		const writer = string.writer();
		const text = 'abc\n\ndef\nghi';
		ez.devices.buffer.reader(new Buffer(text, 'utf8')).transform(lines.parser()).transform(lines.formatter()).pipe(writer);
		strictEqual(writer.toString(), text, text);
	});
});