"use strict";
const fs = require("fs");
const f = require('f-streams');

function bench(name, fn) {
	var max = 1;
	while (true) {
		var t0 = Date.now();
		var result = fn(max);
		if (result !== dummy(max - 1)) throw new Error(name + ": bad result: " + result);
		var dt = (Date.now() - t0);
		if (dt > 100) {
			dt = Math.round(dt * 1000 * 1000 / max);
			var s = dt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			console.log(name + "\t" + s + " ns");
			return;
		}
		max *= 2;
	}
}

function dummy(i) {
	return 3 * i;
}

function myReader(max) {
	var i = 0;
	return ez.devices.generic.reader(function read() {
		return i++ < max ? dummy(i - 1) : undefined;
	});
}

const benches = {
	'streamline dummy loop': {
		fn: function (max) {
			var result;
			for (var i = 0; i < max; i++) result = dummy(i);
			return result;
		},
		time: 2
	},
	'streamline bound dummy loop': {
		fn: function (max) {
			var result;
			for (var i = 0; i < max; i++) result = [dummy][0](i);
			return result;
		},
		time: 24
	},
	'callbacks loop nextTick': {
		fn: function (cb, max) {
			var i = 0;

			function next() {
				if (++i < max) process.nextTick(next);
				else dummy(cb, i - 1);
			}
			next();
		},
		time: 24
	},
	'callbacks loop setImmediate': {
		fn: function (cb, max) {
			var i = 0;

			function next() {
				if (++i < max) setImmediate(next);
				else dummy(cb, i - 1);
			}
			next();
		},
		time: 24
	},
	'streamline loop nextTick': {
		fn: function (max) {
			var i = 0;
			for (i = 0; i < max; i++) process.nextTick();
			return dummy(i - 1);
		},
		time: 681
	},
	'streamline loop setImmediate': {
		fn: function (max) {
			var i = 0;
			for (i = 0; i < max; i++) setImmediate();
			return dummy(i - 1);
		},
		time: 681
	},
	'reader with read loop': {
		fn: function (max) {
			const rd = myReader(max * 2);
			var result;
			for (var i = 0; i < max; i++) result = rd.read();
			return result;
		},
		time: 10
	},
	'reader with limit': {
		fn: function (max) {
			var result;
			myReader(max * 2).limit(max).forEach(function (val) {
				result = val;
			});
			return result;
		},
		time: 3326
	},
	'reader with filter': {
		fn: function (max) {
			var result;
			myReader(max).filter(() => true).forEach(function (val) {
				result = val;
			});
			return result;
		},
		time: 1735
	},
	'reader with limit and filter': {
		fn: function (max) {
			var result;
			myReader(max * 2).limit(max).filter(() => true).forEach(function (val) {
				result = val;
			});
			return result;
		},
		time: 3724
	},
	'reader with transform': {
		fn: function (max) {
			var result;
			myReader(max).transform((reader, writer) => reader.pipe(writer)).forEach(function (val) {
				result = val;
			});
			return result;
		},
		time: 3724
	},
};

Object.keys(benches).forEach_(function (name) {
	bench(name, benches[name].fn)
});