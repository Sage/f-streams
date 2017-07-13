import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import * as ez from '../..';
setup();

const { equal } = assert;
const csv = ez.transforms.csv;
const strng = ez.devices.string;

const legends = 'firstName,lastName,gender,dob\n' + //
	'Jimi,Hendrix,M,27-11-1942\n' + //
	'Janis,Joplin,F,19-01-1943\n' + //
	'Jim,Morrison,M,08-12-1943\n' + //
	'Kurt,Cobain,M,20-02-1967\n';

describe(module.id, () => {
	it('roundtrip', () => {
		const sink = strng.writer();
		strng.reader(legends).transform(csv.parser()).transform(csv.formatter()).pipe(sink);
		equal(sink.toString(), legends);
	});

	it('binary input', () => {
		const sink = strng.writer();
		ez.devices.buffer.reader(new Buffer(legends, 'utf8')).transform(csv.parser()).transform(csv.formatter()).pipe(sink);
		equal(sink.toString(), legends);
	});
});