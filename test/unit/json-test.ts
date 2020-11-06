import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import * as fs from 'fs';
import { bufferReader, jsonFormatter, jsonParser, stringReader, stringWriter, textFileReader } from '../..';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

const inputFile = require('os').tmpdir() + '/jsonInput.json';
const outputFile = require('os').tmpdir() + '/jsonOutput.json';

const mixedData =
    '[' + //
    '{ "firstName": "Jimy", "lastName": "Hendrix" },' + //
    '\n { "firstName": "Jim", "lastName": "Morrison" },' + //
    '\n"\\"escape\\ttest",' + //
    '\n"people are strange", 27, null,' + //
    '\n { "firstName": "Janis", ' + //
    '\n    "lastName": "Joplin" },' + //
    '\n[1,2, 3, ' + //
    '\n 5, 8, 13],' + //
    '\n true]';

function nodeStream(text: string) {
    wait(cb => fs.writeFile(inputFile, text, 'utf8', cb));
    return textFileReader(inputFile);
}

describe(module.id, () => {
    it('empty', () => {
        const stream = nodeStream('[]').transform(jsonParser());
        strictEqual(stream.read(), undefined, 'undefined');
    });

    it('mixed data with node node stream', () => {
        const stream = nodeStream(mixedData);
        const expected = JSON.parse(mixedData);
        stream.transform(jsonParser()).forEach(function(elt, i) {
            deepEqual(elt, expected[i], expected[i]);
        });
    });

    it('fragmented read', () => {
        const stream = stringReader(mixedData, 2).transform(jsonParser());
        const expected = JSON.parse(mixedData);
        stream.forEach(function(elt, i) {
            deepEqual(elt, expected[i], expected[i]);
        });
    });

    it('binary input', () => {
        const stream = bufferReader(Buffer.from(mixedData, 'utf8')).transform(jsonParser());
        const expected = JSON.parse(mixedData);
        stream.forEach(function(elt, i) {
            deepEqual(elt, expected[i], expected[i]);
        });
    });

    it('roundtrip', () => {
        const writer = stringWriter();
        nodeStream(mixedData)
            .transform(jsonParser())
            .map(function(elt) {
                return elt && elt.lastName ? elt.lastName : elt;
            })
            .transform(jsonFormatter())
            .pipe(writer);
        const result = JSON.parse(writer.toString());
        const expected = JSON.parse(mixedData).map(function(elt: any) {
            return elt && elt.lastName ? elt.lastName : elt;
        });
        ok(Array.isArray(result), 'isArray');
        equal(result.length, expected.length, 'length=' + result.length);
        result.forEach(function(elt: any, i: number) {
            deepEqual(result[i], elt, elt);
        });
    });
});
