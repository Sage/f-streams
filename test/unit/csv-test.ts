import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import { bufferReader, csvFormatter, csvParser, stringReader, stringWriter } from '../..';
setup();

const { equal } = assert;

const legends = 'firstName,lastName,gender,dob\n' + //
	'Jimi,Hendrix,M,27-11-1942\n' + //
	'Janis,Joplin,F,19-01-1943\n' + //
	'Jim,Morrison,M,08-12-1943\n' + //
	'Kurt,Cobain,M,20-02-1967\n';

describe(module.id, () => {
	it('roundtrip', () => {
		const sink = stringWriter();
		stringReader(legends).transform(csvParser()).transform(csvFormatter()).pipe(sink);
		equal(sink.toString(), legends);
	});

	it('binary input', () => {
		const sink = stringWriter();
		bufferReader(new Buffer(legends, 'utf8')).transform(csvParser()).transform(csvFormatter()).pipe(sink);
		equal(sink.toString(), legends);
	});
});