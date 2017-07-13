import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { setup } from 'f-mocha';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

const file = ez.devices.file;
const jsonTrans = ez.transforms.json;

const inputFile = require('os').tmpdir() + '/jsonInput.json';
const outputFile = require('os').tmpdir() + '/jsonOutput.json';
const fs = require('mz/fs');
const string = ez.devices.string;

const mixedData = '[' + //
	'{ "firstName": "Jimy", "lastName": "Hendrix" },' + //
	'\n { "firstName": "Jim", "lastName": "Morrison" },' + //
	'\n"\\\"escape\\ttest",' + //
	'\n"people are strange", 27, null,' + //
	'\n { "firstName": "Janis", ' + //
	'\n    "lastName": "Joplin" },' + //
	'\n[1,2, 3, ' + //
	'\n 5, 8, 13],' + //
	'\n true]';

function nodeStream(text: string) {
	wait(fs.writeFile(inputFile, text, "utf8"));
	return file.text.reader(inputFile);
}

describe(module.id, () => {
	it("empty", () => {
		const stream = nodeStream('[]').transform(jsonTrans.parser());
		strictEqual(stream.read(), undefined, "undefined");
	});

	it("mixed data with node node stream", () => {
		const stream = nodeStream(mixedData);
		const expected = JSON.parse(mixedData);
		stream.transform(jsonTrans.parser()).forEach(function (elt, i) {
			deepEqual(elt, expected[i], expected[i]);
		});
	});

	it("fragmented read", () => {
		const stream = string.reader(mixedData, 2).transform(jsonTrans.parser());
		const expected = JSON.parse(mixedData);
		stream.forEach(function (elt, i) {
			deepEqual(elt, expected[i], expected[i]);
		});
	});

	it("binary input", () => {
		const stream = ez.devices.buffer.reader(new Buffer(mixedData, 'utf8')).transform(jsonTrans.parser());
		const expected = JSON.parse(mixedData);
		stream.forEach(function (elt, i) {
			deepEqual(elt, expected[i], expected[i]);
		});
	});

	it("roundtrip", () => {
		const writer = string.writer();
		nodeStream(mixedData).transform(jsonTrans.parser()).map(function (elt) {
			return (elt && elt.lastName) ? elt.lastName : elt;
		}).transform(jsonTrans.formatter()).pipe(writer);
		const result = JSON.parse(writer.toString());
		const expected = JSON.parse(mixedData).map(function (elt: any) {
			return (elt && elt.lastName) ? elt.lastName : elt;
		});
		ok(Array.isArray(result), "isArray");
		equal(result.length, expected.length, "length=" + result.length)
		result.forEach(function (elt: any, i: number) {
			deepEqual(result[i], elt, elt);
		});
	});
});