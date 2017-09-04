import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import * as ez from '../..';
setup();

const { strictEqual, deepEqual, equal, ok } = assert;

import { Reader } from '../../lib/reader';

interface TestReader extends Reader<number> {
	stopInfo: { at: number, arg: any };
	finalCheck: () => void;
}

const generic = ez.devices.generic;
const arraySink = ez.devices.array.writer;

function numbers(limit?: number): TestReader {
	let i = 0;
	const source: any = generic.reader(function read() {
		return (limit && i >= limit) ? undefined : i++;
	}, function stop(this: TestReader, arg: number) {
		this.stopInfo = {
			at: i,
			arg: arg,
		};
	});
	source.finalCheck = function (this: TestReader) {
		ok(this.stopInfo || i === limit, 'final check');
	};
	return source;
}

function fail(result?: any) {
	return function (val: any) {
		if (val === 3) throw new Error('FAILED');
		return result;
	};
}

function minJoiner(values: any[]) {
	const min = Math.min.apply(null, values.filter(function (val) { return val !== undefined; }));
	values.forEach(function (val, i) {
		if (val === min) values[i] = undefined;
	});
	return min;
}

describe(module.id, () => {

	it('forEach', () => {
		const results: number[] = [];
		const source = numbers(5);
		source.forEach(function (num) {
			results.push(num);
		});
		strictEqual(results.join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	it('forEach error', () => {
		const source = numbers(5);
		try {
			source.forEach(fail());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('map', () => {
		const source = numbers(5);
		strictEqual(source.map(function (num) {
			return num * num;
		}).pipe(arraySink()).toArray().join(','), '0,1,4,9,16');
		source.finalCheck();
	});

	it('map error', () => {
		const source = numbers(5);
		try {
			source.map(fail(1)).pipe(arraySink());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('every', () => {
		let source: TestReader;
		strictEqual((source = numbers(5)).every(function (num) {
			return num < 5;
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).every(function (num) {
			return num < 4;
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).every(function (num) {
			return num !== 2;
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).every({
			$lt: 5,
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).every({
			$lt: 4,
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).every({
			$ne: 2,
		}), false);
		source.finalCheck();
	});

	it('every error', () => {
		const source = numbers(5);
		try {
			source.every(fail(true));
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('some', () => {
		let source: TestReader;
		strictEqual((source = numbers(5)).some(function (num) {
			return num >= 5;
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).some(function (num) {
			return num >= 4;
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).some(function (num) {
			return num !== 2;
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).some({
			$gte: 5,
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).some({
			$gte: 4,
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).some({
			$ne: 2,
		}), true);
		source.finalCheck();
	});

	it('some error', () => {
		const source = numbers(5);
		try {
			source.some(fail(false));
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('reduce', () => {
		const source = numbers(5);
		strictEqual(source.reduce(function (r, num) {
			return r + '/' + num;
		}, ''), '/0/1/2/3/4');
		source.finalCheck();
	});

	it('reduce error', () => {
		const source = numbers(5);
		try {
			source.reduce(function (r, v) {
				if (v === 3) throw new Error('FAILED');
				return r;
			}, null);
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('toArray', () => {
		const source = numbers(5);
		deepEqual(source.toArray(), [0, 1, 2, 3, 4]);
		source.finalCheck();
	});

	it('pipe', () => {
		const source = numbers(5);
		strictEqual(source.pipe(arraySink()).toArray().join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	// pipe error already tested in map

	it('tee', () => {
		const source = numbers(5);
		const secondary = arraySink();
		strictEqual(source.tee(secondary).pipe(arraySink()).toArray().join(','), '0,1,2,3,4');
		strictEqual(secondary.toArray().join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	it('tee error', () => {
		const source = numbers(5);
		const secondary = arraySink();
		try {
			source.tee(secondary).map(fail(2)).pipe(arraySink());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		strictEqual(secondary.toArray().join(','), '0,1,2,3');
		source.finalCheck();
	});

	it('dup', () => {
		const source = numbers(5);
		const streams = source.dup();
		const f1 = run(() => streams[0].toArray());
		const f2 = run(() => streams[1].toArray());
		strictEqual(wait(f1).join(','), '0,1,2,3,4');
		strictEqual(wait(f2).join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	it('dup error 0', () => {
		const source = numbers(5);
		const streams = source.dup();
		const f1 = run(() => streams[0].map(fail(2)).toArray());
		const f2 = run(() => streams[1].toArray());
		try {
			wait(f1);
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		try {
			wait(f2);
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('dup error 1', () => {
		const source = numbers(5);
		const streams = source.dup();
		const f1 = run(() => streams[0].toArray());
		const f2 = run(() => streams[1].map(fail(2)).toArray());
		try {
			wait(f1);
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		try {
			wait(f2);
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('concat', () => {
		let source: TestReader;
		const rd1 = (source = numbers(5)).concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12));
		strictEqual(rd1.toArray().join(), '0,1,2,3,4,6,7,12,13,14');
		source.finalCheck();
		const rd2 = (source = numbers(5)).concat([numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12)]);
		strictEqual(rd2.toArray().join(), '0,1,2,3,4,6,7,12,13,14');
		source.finalCheck();
	});

	it('concat error', () => {
		const source = numbers(5);
		const rd1 = source.concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(2).map(fail(2)));
		try {
			rd1.toArray();
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('transform - same number of reads and writes', () => {
		const source = numbers(5);
		strictEqual(source.transform(function (reader, writer) {
			let sum = 0, val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				sum += val;
				writer.write(sum);
			}
		}).pipe(arraySink()).toArray().join(','), '0,1,3,6,10');
		source.finalCheck();
	});

	it('transform - more reads than writes', () => {
		const source = numbers(12);
		strictEqual(source.transform(function (reader, writer) {
			let str = '', val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				str += '-' + val;
				if (val % 5 === 4) {
					writer.write(str);
					str = '';
				}
			}
			writer.write(str);
		}).pipe(arraySink()).toArray().join('/'), '-0-1-2-3-4/-5-6-7-8-9/-10-11');
		source.finalCheck();
	});

	it('transform - less reads than writes', () => {
		const source = numbers(5);
		strictEqual(source.transform(function (reader, writer) {
			let val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				for (let i = 0; i < val; i++) writer.write(val);
			}
		}).pipe(arraySink()).toArray().join(','), '1,2,2,3,3,3,4,4,4,4');
		source.finalCheck();
	});

	it('transform error', () => {
		const source = numbers(5);
		try {
			source.transform(function (reader, writer) {
				let val: number | undefined;
				while ((val = reader.read()) !== undefined) {
					fail(2)(val);
					writer.write(val);
				}
			}).pipe(arraySink());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	it('filter', () => {
		let source: TestReader;
		strictEqual((source = numbers(10)).filter(function (val) {
			return val % 2;
		}).pipe(arraySink()).toArray().join(','), '1,3,5,7,9');
		source.finalCheck();
		strictEqual((source = numbers(10)).filter({
			$gt: 2,
			$lt: 6,
		}).pipe(arraySink()).toArray().join(','), '3,4,5');
		source.finalCheck();
	});

	it('while', () => {
		let source: TestReader;
		strictEqual((source = numbers()).while(function (val) {
			return val < 5;
		}).pipe(arraySink()).toArray().join(','), '0,1,2,3,4');
		source.finalCheck();
		strictEqual((source = numbers()).while({
			$lt: 5,
		}).pipe(arraySink()).toArray().join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	it('until', () => {
		let source: TestReader;
		strictEqual((source = numbers()).until(function (val) {
			return val > 5;
		}).pipe(arraySink()).toArray().join(','), '0,1,2,3,4,5');
		source.finalCheck();
		strictEqual((source = numbers()).until({
			$gt: 5,
		}).pipe(arraySink()).toArray().join(','), '0,1,2,3,4,5');
		source.finalCheck();
	});

	it('limit', () => {
		const source = numbers();
		strictEqual(source.limit(5).pipe(arraySink()).toArray().join(','), '0,1,2,3,4');
		source.finalCheck();
	});

	it('skip', () => {
		const source = numbers();
		strictEqual(source.skip(2).limit(5).pipe(arraySink()).toArray().join(','), '2,3,4,5,6');
		source.finalCheck();
	});

	function pow(n: number) {
		return function (val: number) {
			return Math.pow(val, n);
		};
	}

	function sleep(millis: number | (() => number)) {
		return function <T>(val: T) {
			const ms = typeof millis === 'function' ? millis() : millis;
			wait(new Promise(resolve => {
				setTimeout(resolve, ms);
			}));
			return val;
		};
	}

	function rand(min: number, max: number) {
		return function () {
			return min + Math.round(Math.random() * (max - min));
		};
	}

	it('simple chain (no buffer)', () => {
		const source = numbers();
		strictEqual(source.skip(2).limit(5).pipe(arraySink()).toArray().join(','), '2,3,4,5,6');
		source.finalCheck();
	});
	it('buffer in simple chain', () => {
		let source: TestReader;
		strictEqual((source = numbers()).buffer(3).skip(2).limit(5).pipe(arraySink()).toArray().join(','), '2,3,4,5,6');
		source.finalCheck();
		strictEqual((source = numbers()).skip(2).buffer(3).limit(5).pipe(arraySink()).toArray().join(','), '2,3,4,5,6');
		source.finalCheck();
		strictEqual((source = numbers()).skip(2).limit(5).buffer(3).pipe(arraySink()).toArray().join(','), '2,3,4,5,6');
		source.finalCheck();
	});
	it('buffer with slower input', () => {
		const source = numbers();
		strictEqual(source.limit(10).map(sleep(20)).buffer(5).map(sleep(10)).pipe(arraySink()).toArray().join(','), '0,1,2,3,4,5,6,7,8,9');
		source.finalCheck();
	});

	it('buffer with faster input', () => {
		const source = numbers();
		strictEqual(source.limit(10).map(sleep(10)).buffer(5).map(sleep(20)).pipe(arraySink()).toArray().join(','), '0,1,2,3,4,5,6,7,8,9');
		source.finalCheck();
	});

	it('parallel preserve order', () => {
		const t0 = Date.now();
		const source = numbers();
		strictEqual(source.limit(10).parallel(4, function (src) {
			return src.map(sleep(rand(10, 10))).map(pow(2));
		}).pipe(arraySink()).toArray().join(','), '0,1,4,9,16,25,36,49,64,81');
		source.finalCheck();
		const dt = Date.now() - t0;
		//ok(dt < 600, "elapsed: " + dt + "ms");
	});

	it('parallel shuffle', () => {
		const t0 = Date.now();
		const source = numbers();
		strictEqual(source.limit(10).parallel({
			count: 4,
			shuffle: true,
		}, function (src) {
			return src.map(sleep(rand(10, 10))).map(pow(2));
		}).pipe(arraySink()).toArray().sort(function (i: number, j: number) {
			return i - j;
		}).join(','), '0,1,4,9,16,25,36,49,64,81');
		source.finalCheck();
		const dt = Date.now() - t0;
		//ok(dt < 600, "elapsed: " + dt + "ms");
	});

	it('fork/join limit before', () => {
		const source = numbers();
		strictEqual(source.limit(10).fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.buffer(Infinity).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).pipe(arraySink()).toArray().join(','), '0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729');
		source.finalCheck();
	});

	it('fork/join limit after', () => {
		const source = numbers();
		strictEqual(source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.buffer(Infinity).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(12).pipe(arraySink()).toArray().join(','), '0,1,4,8,9,16,25,27,36,49,64,81');
		source.finalCheck();
	});

	it('fork/join limit one branch', () => {
		const source = numbers();
		strictEqual(source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)).limit(3); },
			function (src) { return src.buffer(6).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(10).pipe(arraySink()).toArray().join(','), '0,1,4,8,27,64,125,216,343,512');
		source.finalCheck();
	});

	it('fork slow and fast', () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(3)); },
		]).readers;
		const f1 = run(() => readers[0]!.limit(10).pipe(arraySink()));
		const f2 = run(() => readers[1]!.limit(10).pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), '0,1,4,9,16,25,36,49,64,81');
		strictEqual(wait(f2).toArray().join(','), '0,1,8,27,64,125,216,343,512,729');
		source.finalCheck();
	});

	it('fork slow and fast with different limits (fast ends first)', () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)).limit(10); },
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(3)).limit(4); },
		]).readers;
		const f1 = run(() => readers[0]!.pipe(arraySink()));
		const f2 = run(() => readers[1]!.pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), '0,1,4,9,16,25,36,49,64,81');
		strictEqual(wait(f2).toArray().join(','), '0,1,8,27');
		source.finalCheck();
	});

	it('fork slow and fast with different limits (slow ends first)', () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(2)).limit(10); },
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(3)).limit(4); },
		]).readers;
		const f1 = run(() => readers[0]!.pipe(arraySink()));
		const f2 = run(() => readers[1]!.pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), '0,1,4,9,16,25,36,49,64,81');
		strictEqual(wait(f2).toArray().join(','), '0,1,8,27');
		source.finalCheck();
	});

	it('iterator', () => {
		const results: number[] = [];
		const source = numbers(5);
		for (const num of source) results.push(num);
		strictEqual(results.join(','), '0,1,2,3,4');
		source.finalCheck();
	});
});