import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal, ok } = assert;

function test(name: string, fn: () => void) {
	it(name, (done) => {
		run(() => (fn(), undefined)).then(done, done);
	});
}

describe(module.id, () => {

	const safeConverter = ez.predicate.convert;
	const unsafeConverter = ez.predicate.converter({
		allowEval: true
	});

	function t(condition: any, obj: any, expected: any, unsafe?: boolean) {
		const got = (unsafe ? unsafeConverter : safeConverter)(condition)(obj);
		equal(got, expected, JSON.stringify(condition) + " with " + JSON.stringify(obj) + " => " + expected);
	}

	test("direct values", () => {
		t(5, 5, true);
		t(5, 6, false);
		t('a', 'a', true);
		t('a', 'aa', false);
		t(true, true, true);
		t(true, false, false);
	});

	test("gt", () => {
		t({
			$gt: 4,
		}, 5, true);

		t({
			$gt: 5,
		}, 5, false);

		t({
			$gt: 6,
		}, 5, false);
	});

	test("gte", () => {
		t({
			$gte: 4,
		}, 5, true);

		t({
			$gte: 5,
		}, 5, true);

		t({
			$gte: 6,
		}, 5, false);
	});

	test("lt", () => {
		t({
			$lt: 4,
		}, 5, false);

		t({
			$lt: 5,
		}, 5, false);

		t({
			$lt: 6,
		}, 5, true);
	});

	test("lte", () => {
		t({
			$lte: 4,
		}, 5, false);

		t({
			$lte: 5,
		}, 5, true);

		t({
			$lte: 6,
		}, 5, true);
	});

	test("ne", () => {
		t({
			$ne: 4,
		}, 5, true);

		t({
			$ne: 5,
		}, 5, false);

		t({
			$ne: 6,
		}, 5, true);
	});

	test("range", () => {
		t({
			$gte: 3,
			$lte: 7,
		}, 2, false);

		t({
			$gte: 3,
			$lte: 7,
		}, 5, true);

		t({
			$gte: 3,
			$lte: 7,
		}, 8, false);
	});

	test("regexp", () => {
		t(/^hel/, 'hello', true);
		t(/^hel/, 'world', false);
	});

	test("and", () => {
		t({
			$and: [2, 5],
		}, 5, false);

		t({
			$and: [5, 5],
		}, 5, true);
	});

	test("empty and", () => {
		t({}, {}, true);

		t({}, {
			a: 5,
		}, true);
	});

	test("or", () => {
		t({
			$or: [2, 5],
		}, 5, true);

		t({
			$or: [2, 6],
		}, 5, false);
	});

	test("empty or", () => {
		t({
			$or: []
		}, {}, false);

		t({
			$or: []
		}, {
				a: 5,
			}, false);
	});

	test("nor", () => {
		t({
			$nor: [2, 5],
		}, 5, false);

		t({
			$nor: [2, 6],
		}, 5, true);
	});

	test("not", () => {
		t({
			$not: {
				$gt: 2
			},
		}, 5, false);

		t({
			$not: {
				$lt: 2
			},
		}, 5, true);
	});

	test("in", () => {
		t({
			$in: [2, 3, 5]
		}, 3, true);

		t({
			$in: [2, 3, 5]
		}, 4, false);

		t({
			$in: [2, 3, 5]
		}, 5, true);
	});

	test("not in", () => {
		t({
			$nin: [2, 3, 5]
		}, 3, false);

		t({
			$nin: [2, 3, 5]
		}, 4, true);

		t({
			$nin: [2, 3, 5]
		}, 5, false);
	});

	test("exists", () => {
		t({
			$exists: "a"
		}, {
				a: 5,
			}, true);

		t({
			$exists: "a"
		}, {
				a: undefined,
			}, true);

		t({
			$exists: "a"
		}, {
				b: 5,
			}, false);
	});

	test("type", () => {
		t({
			$type: "number"
		}, 5, true);

		t({
			$type: "object"
		}, {}, true);

		t({
			$type: "string"
		}, 5, false);
	});

	test("mod", () => {
		t({
			$mod: [3, 2]
		}, 5, true);

		t({
			$mod: [4, 2]
		}, 5, false);
	});

	test("regex", () => {
		t({
			$regex: "^hel",
		}, "hello", true);

		t({
			$regex: "^hel",
		}, "world", false);

		t({
			$regex: "^hel",
		}, "HeLLo", false);

		t({
			$regex: "^hel",
			$options: "i",
		}, "HeLLo", true);
	});

	test("where", () => {
		t({
			$where: "this.a === this.b",
		}, {
				a: 5,
				b: 5,
			}, true, true);

		t({
			$where: "this.a === this.b",
		}, {
				a: 5,
				b: 6,
			}, false, true);

		t({
			$where: function (this: any) {
				return this.a === this.b;
			},
		}, {
				a: 5,
				b: 5,
			}, true);

		t({
			$where: function (this: any) {
				return this.a === this.b;
			},
		}, {
				a: 5,
				b: 6,
			}, false);
	});

	test("elemMatch", () => {
		t({
			$elemMatch: {
				$gte: 2,
				$lt: 5,
			},
		}, [1, 3, 5], true);

		t({
			$elemMatch: {
				$gte: 2,
				$lt: 5,
			},
		}, [1, 5, 6], false);
	});

	test("all", () => {
		t({
			$all: [2, 4],
		}, [1, 2, 3, 4, 5], true);

		t({
			$all: [2, 4],
		}, [1, 2, 3, 5], false);

		t({
			tags: {
				$all: ["appliance", "school", "book"]
			}
		}, {
				tags: ["school", "book", "bag", "headphone", "appliance"],
			}, true);

		t({
			tags: {
				$all: ["appliance", "school", "book"]
			}
		}, {
				tags: ["school", "bag", "headphone", "appliance"],
			}, false);

		const cond = {
			items: {
				$all: [{
					$elemMatch: {
						size: "M",
						num: {
							$gt: 50
						}
					}
				}, {
					$elemMatch: {
						num: 100,
						color: "green"
					}
				}]
			}
		};
		t(cond, {
			items: [{
				size: "S",
				num: 10,
				color: "blue"
			}, {
				size: "M",
				num: 100,
				color: "blue"
			}, {
				size: "L",
				num: 100,
				color: "green"
			}]
		}, true);
		t(cond, {
			items: [{
				size: "S",
				num: 10,
				color: "blue"
			}, {
				size: "M",
				num: 100,
				color: "blue"
			}, {
				size: "L",
				num: 100,
				color: "red"
			}]
		}, false);
	});

	test("size", () => {
		t({
			$size: 2,
		}, [1, 2], true);

		t({
			$size: 2,
		}, [1, 2, 3], false);
	});

	test("single property", () => {
		t({
			a: 5,
		}, {
				a: 5,
				b: 3,
			}, true);

		t({
			a: 6,
		}, {
				a: 5,
				b: 3,
			}, false);
	});

	test("implicit and (multiple properties)", () => {
		t({
			a: 5,
			b: 3,
		}, {
				a: 5,
				b: 3,
			}, true);

		t({
			a: 5,
			b: 3,
		}, {
				a: 5,
			}, false);

	});

	test("walk", () => {
		t({
			'a.b': /^hel/,
		}, {
				a: {
					b: 'hello',
				}
			}, true);

		t({
			'a.b': /^hel/,
		}, {
				a: {
					c: 'hello',
				}
			}, false);

		t({
			'a.c': /^hel/,
		}, {
				b: {
					c: 'hello',
				}
			}, false);

		t({
			'a.b.c': /^hel/,
		}, {
				a: {
					b: {
						c: 'hello',
					}
				}
			}, true);

		t({
			'a.b.c': /^hel/,
		}, {
				a: {
					b: {
						c: 'world',
					}
				}
			}, false);

	});
});
