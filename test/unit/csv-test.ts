import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { setup } from 'f-mocha';
setup();

const { equal } = assert;
const csv = ez.transforms.csv;
const string = ez.devices.string;

const legends = 'firstName,lastName,gender,dob\n' + //
    'Jimi,Hendrix,M,27-11-1942\n' + //
    'Janis,Joplin,F,19-01-1943\n' + //
    'Jim,Morrison,M,08-12-1943\n' + //
    'Kurt,Cobain,M,20-02-1967\n';

describe(module.id, () => {
    it("roundtrip", () => {
        const sink = string.writer();
        string.reader(legends).transform(csv.parser()).transform(csv.formatter()).pipe(sink);
        equal(sink.toString(), legends);
    });

    it("binary input", () => {
        const sink = string.writer();
        ez.devices.buffer.reader(new Buffer(legends, 'utf8')).transform(csv.parser()).transform(csv.formatter()).pipe(sink);
        equal(sink.toString(), legends);
    });
});