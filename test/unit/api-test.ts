import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { strictEqual, deepEqual, equal, ok } = assert;

function test(name: string, fn: () => void) {
	it(name, (done) => {
		run(() => (fn(), undefined)).then(done, done);
	});
}

import { Reader } from "../../lib/reader";


interface TestReader extends Reader<number> {
	stopInfo: { at: number, arg: any };
	finalCheck: () => void;
}

const generic = ez.devices.generic;
const arraySink = ez.devices.array.writer;

function numbers(limit?: number): TestReader {
	var i = 0;
	const source: any = generic.reader(function read() {
		return i >= limit ? undefined : i++;
	}, function stop(this: TestReader, arg: number) {
		this.stopInfo = {
			at: i,
			arg: arg,
		};
	});
	source.finalCheck = function (this: TestReader) {
		ok(this.stopInfo || i == limit, "final check");
	}
	return source;
}

function fail(result?: any) {
	return function (val: any) {
		if (val === 3) throw new Error('FAILED');
		return result;
	}
}

function minJoiner(values: any[]) {
	const min = Math.min.apply(null, values.filter(function (val) { return val !== undefined; }));
	values.forEach(function (val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

describe(module.id, () => {

	test("forEach", () => {
		const results: number[] = [];
		const source = numbers(5);
		source.forEach(function (num) {
			results.push(num);
		});
		strictEqual(results.join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	test("forEach error", () => {
		const source = numbers(5);
		try {
			source.forEach(fail());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	test("map", () => {
		const source = numbers(5);
		strictEqual(source.map(function (num) {
			return num * num;
		}).pipe(arraySink()).toArray().join(','), "0,1,4,9,16");
		source.finalCheck();
	});

	test("map error", () => {
		const source = numbers(5);
		try {
			source.map(fail(1)).pipe(arraySink());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	test("every", () => {
		var source: TestReader;
		strictEqual((source = numbers(5)).every(function (num) {
			return num < 5;
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).every(function (num) {
			return num < 4;
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).every(function (num) {
			return num != 2;
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

	test("every error", () => {
		const source = numbers(5);
		try {
			source.every(fail(true));
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	test("some", () => {
		var source: TestReader;
		strictEqual((source = numbers(5)).some(function (num) {
			return num >= 5;
		}), false);
		source.finalCheck();
		strictEqual((source = numbers(5)).some(function (num) {
			return num >= 4;
		}), true);
		source.finalCheck();
		strictEqual((source = numbers(5)).some(function (num) {
			return num != 2;
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

	test("some error", () => {
		const source = numbers(5);
		try {
			source.some(fail(false));
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		source.finalCheck();
	});

	test("reduce", () => {
		const source = numbers(5);
		strictEqual(source.reduce(function (r, num) {
			return r + '/' + num;
		}, ""), "/0/1/2/3/4");
		source.finalCheck();
	});

	test("reduce error", () => {
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

	test("toArray", () => {
		const source = numbers(5);
		deepEqual(source.toArray(), [0, 1, 2, 3, 4]);
		source.finalCheck();
	});

	test("pipe", () => {
		const source = numbers(5);
		strictEqual(source.pipe(arraySink()).toArray().join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	// pipe error already tested in map

	test("tee", () => {
		const source = numbers(5);
		const secondary = arraySink();
		strictEqual(source.tee(secondary).pipe(arraySink()).toArray().join(','), "0,1,2,3,4");
		strictEqual(secondary.toArray().join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	test("tee error", () => {
		const source = numbers(5);
		const secondary = arraySink();
		try {
			source.tee(secondary).map(fail(2)).pipe(arraySink());
			ok(false);
		} catch (ex) {
			strictEqual(ex.message, 'FAILED');
		}
		strictEqual(secondary.toArray().join(','), "0,1,2,3");
		source.finalCheck();
	});

	test("dup", () => {
		const source = numbers(5);
		const streams = source.dup();
		const f1 = run(() => streams[0].toArray());
		const f2 = run(() => streams[1].toArray());
		strictEqual(wait(f1).join(','), "0,1,2,3,4");
		strictEqual(wait(f2).join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	test("dup error 0", () => {
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

	test("dup error 1", () => {
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

	test("concat", () => {
		var source: TestReader;
		const rd1 = (source = numbers(5)).concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12));
		strictEqual(rd1.toArray().join(), "0,1,2,3,4,6,7,12,13,14");
		source.finalCheck();
		const rd2 = (source = numbers(5)).concat([numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12)]);
		strictEqual(rd2.toArray().join(), "0,1,2,3,4,6,7,12,13,14");
		source.finalCheck();
	});

	test("concat error", () => {
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

	test("transform - same number of reads and writes", () => {
		const source = numbers(5);
		strictEqual(source.transform(function (reader, writer) {
			var sum = 0, val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				sum += val;
				writer.write(sum);
			}
		}).pipe(arraySink()).toArray().join(','), "0,1,3,6,10");
		source.finalCheck();
	});

	test("transform - more reads than writes", () => {
		const source = numbers(12);
		strictEqual(source.transform(function (reader, writer) {
			var str = "", val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				str += "-" + val;
				if (val % 5 === 4) {
					writer.write(str);
					str = "";
				}
			}
			writer.write(str);
		}).pipe(arraySink()).toArray().join('/'), "-0-1-2-3-4/-5-6-7-8-9/-10-11");
		source.finalCheck();
	});

	test("transform - less reads than writes", () => {
		const source = numbers(5);
		strictEqual(source.transform(function (reader, writer) {
			var str = "", val: number | undefined;
			while ((val = reader.read()) !== undefined) {
				for (var i = 0; i < val; i++) writer.write(val);
			}
		}).pipe(arraySink()).toArray().join(','), "1,2,2,3,3,3,4,4,4,4");
		source.finalCheck();
	});

	test("transform error", () => {
		const source = numbers(5);
		try {
			source.transform(function (reader, writer) {
				var str = "", val: number | undefined;
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

	test("filter", () => {
		var source: TestReader;
		strictEqual((source = numbers(10)).filter(function (val) {
			return val % 2;
		}).pipe(arraySink()).toArray().join(','), "1,3,5,7,9");
		source.finalCheck();
		strictEqual((source = numbers(10)).filter({
			$gt: 2,
			$lt: 6,
		}).pipe(arraySink()).toArray().join(','), "3,4,5");
		source.finalCheck();
	});

	test("while", () => {
		var source: TestReader;
		strictEqual((source = numbers()).while(function (val) {
			return val < 5;
		}).pipe(arraySink()).toArray().join(','), "0,1,2,3,4");
		source.finalCheck();
		strictEqual((source = numbers()).while({
			$lt: 5,
		}).pipe(arraySink()).toArray().join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	test("until", () => {
		var source: TestReader;
		strictEqual((source = numbers()).until(function (val) {
			return val > 5;
		}).pipe(arraySink()).toArray().join(','), "0,1,2,3,4,5");
		source.finalCheck();
		strictEqual((source = numbers()).until({
			$gt: 5,
		}).pipe(arraySink()).toArray().join(','), "0,1,2,3,4,5");
		source.finalCheck();
	});

	test("limit", () => {
		const source = numbers();
		strictEqual(source.limit(5).pipe(arraySink()).toArray().join(','), "0,1,2,3,4");
		source.finalCheck();
	});

	test("skip", () => {
		const source = numbers();
		strictEqual(source.skip(2).limit(5).pipe(arraySink()).toArray().join(','), "2,3,4,5,6");
		source.finalCheck();
	});

	function pow(n: number) {
		return function (val: number) {
			return Math.pow(val, n);
		}
	}

	function sleep(millis: number | (() => number)) {
		return function <T>(val: T) {
			const ms = typeof millis === "function" ? millis() : millis;
			wait(new Promise(resolve => {
				setTimeout(() => resolve(), ms);
			}))
			return val;
		}
	}

	function rand(min: number, max: number) {
		return function () {
			return min + Math.round(Math.random() * (max - min));
		};
	}

	test("simple chain (no buffer)", () => {
		const source = numbers();
		strictEqual(source.skip(2).limit(5).pipe(arraySink()).toArray().join(','), "2,3,4,5,6");
		source.finalCheck();
	});
	test("buffer in simple chain", () => {
		var source: TestReader;
		strictEqual((source = numbers()).buffer(3).skip(2).limit(5).pipe(arraySink()).toArray().join(','), "2,3,4,5,6");
		source.finalCheck();
		strictEqual((source = numbers()).skip(2).buffer(3).limit(5).pipe(arraySink()).toArray().join(','), "2,3,4,5,6");
		source.finalCheck();
		strictEqual((source = numbers()).skip(2).limit(5).buffer(3).pipe(arraySink()).toArray().join(','), "2,3,4,5,6");
		source.finalCheck();
	});
	test("buffer with slower input", () => {
		const source = numbers();
		strictEqual(source.limit(10).map(sleep(20)).buffer(5).map(sleep(10)).pipe(arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
		source.finalCheck();
	});

	test("buffer with faster input", () => {
		const source = numbers();
		strictEqual(source.limit(10).map(sleep(10)).buffer(5).map(sleep(20)).pipe(arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
		source.finalCheck();
	});

	test("parallel preserve order", () => {
		const t0 = Date.now();
		const source = numbers();
		strictEqual(source.limit(10).parallel(4, function (source) {
			return source.map(sleep(rand(10, 10))).map(pow(2));
		}).pipe(arraySink()).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
		source.finalCheck();
		const dt = Date.now() - t0;
		//ok(dt < 600, "elapsed: " + dt + "ms");
	});

	test("parallel shuffle", () => {
		const t0 = Date.now();
		const source = numbers();
		strictEqual(source.limit(10).parallel({
			count: 4,
			shuffle: true,
		}, function (source) {
			return source.map(sleep(rand(10, 10))).map(pow(2));
		}).pipe(arraySink()).toArray().sort(function (i: number, j: number) {
			return i - j;
		}).join(','), "0,1,4,9,16,25,36,49,64,81");
		source.finalCheck();
		const dt = Date.now() - t0;
		//ok(dt < 600, "elapsed: " + dt + "ms");
	});

	test("fork/join limit before", () => {
		const source = numbers();
		strictEqual(source.limit(10).fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.buffer(Infinity).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).pipe(arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729");
		source.finalCheck();
	});

	test("fork/join limit after", () => {
		const source = numbers();
		strictEqual(source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.buffer(Infinity).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(12).pipe(arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81");
		source.finalCheck();
	});

	test("fork/join limit one branch", () => {
		const source = numbers();
		strictEqual(source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)).limit(3); },
			function (src) { return src.buffer(6).map(sleep(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(10).pipe(arraySink()).toArray().join(','), "0,1,4,8,27,64,125,216,343,512");
		source.finalCheck();
	});

	test("fork slow and fast", () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)); },
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(3)); },
		]).readers;
		const f1 = run(() => readers[0]!.limit(10).pipe(arraySink()));
		const f2 = run(() => readers[1]!.limit(10).pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
		strictEqual(wait(f2).toArray().join(','), "0,1,8,27,64,125,216,343,512,729");
		source.finalCheck();
	});

	test("fork slow and fast with different limits (fast ends first)", () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(2)).limit(10); },
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(3)).limit(4); },
		]).readers;
		const f1 = run(() => readers[0]!.pipe(arraySink()));
		const f2 = run(() => readers[1]!.pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
		strictEqual(wait(f2).toArray().join(','), "0,1,8,27");
		source.finalCheck();
	});

	test("fork slow and fast with different limits (slow ends first)", () => {
		const source = numbers();
		const readers = source.fork([
			function (src) { return src.map(sleep(rand(10, 10))).map(pow(2)).limit(10); },
			function (src) { return src.map(sleep(rand(20, 20))).map(pow(3)).limit(4); },
		]).readers;
		const f1 = run(() => readers[0]!.pipe(arraySink()));
		const f2 = run(() => readers[1]!.pipe(arraySink()));
		strictEqual(wait(f1).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
		strictEqual(wait(f2).toArray().join(','), "0,1,8,27");
		source.finalCheck();
	});

});