export interface Options {
	allowEval?: boolean;
}

export type Predicate = (val: any) => boolean;
export type Op = (val: any, parent?: any) => Predicate;

export function converter(options?: Options) {
	const opts = options || {};

	const pfalse: Predicate = obj => false;
	const ptrue: Predicate = obj => true;

	const ops: { [name: string]: Op } = {
		$eq: val => (v => v === val),
		$ne: val => (v => v !== val),
		$gt: val => (v => v > val),
		$gte: val => (v => v >= val),
		$lt: val => (v => v < val),
		$lte: val => (v => v <= val),
		$in: val => (v => val.indexOf(v) >= 0),
		$nin: val => (v => val.indexOf(v) < 0),
		$and: val => and(val.map(cvt)),
		$or: val => or(val.map(cvt)),
		$nor: val => not(or(val.map(cvt))),
		$not: val => not(cvt(val)),
		$exists: val => (v => val in v),
		$type: val => (v => typeof v === val),
		$mod: val => (v => v % val[0] === val[1]),
		$regex: (val, parent) => {
			const re = new RegExp(val, parent.$options || '');
			return v => re.test(v);
		},
		$options: (val, parent) => {
			if (parent.$regex == null) throw new Error('$options without $regex');
			return ptrue;
		},
		/*$text: (val) => {
			throw new Error("$text not supported");
		},*/
		$where: val => {
			if (typeof val !== 'function') {
				if (opts.allowEval) val = new Function('return (' + val + ')');
				else throw new Error('$where value is not a function');
			}
			return v => val.call(v);
		},
		$elemMatch: val => {
			const pred = cvt(val);
			return v => {
				// if v is not array, treat it as single element array
				if (!Array.isArray(v)) return pred(v);
				return v.some(pred);
			};
		},
		$all: val => {
			if (!Array.isArray(val)) throw new Error('$all value is not an array');
			return and(val.map(ops['$elemMatch']));
		},
		$size: val => compose(ops['$eq'](val), deref('length')),

		// geospatial operators not supported
	};

	const reTest = (re: RegExp) => ((val: any) => re.test(val));
	const not = (predicate: Predicate) => ((obj: any) => !predicate(obj));

	const or = (predicates: Predicate[]) => {
		if (predicates.length === 0) return pfalse;
		if (predicates.length === 1) return predicates[0];
		return (obj: any) => predicates.some(predicate => predicate(obj));
	};

	const and = (predicates: Predicate[]) => {
		if (predicates.length === 0) return ptrue;
		if (predicates.length === 1) return predicates[0];
		return (obj: any) => predicates.every(predicate => predicate(obj));
	};

	const compose = (f: Predicate, g: Predicate) => ((obj: any) => f(g(obj)));

	const deref = (key: string) => ((obj: any) => {
		if (obj == null) return undefined;
		const v = obj[key];
		return typeof v === 'function' ? v() : v;
	});

	const walk: (p: string) => Predicate = p => {
		const i = p.indexOf('.');
		if (i >= 0) {
			return compose(walk(p.substring(i + 1)), walk(p.substring(0, i)));
		} else {
			return deref(p);
		}
	};

	const cvt: (val: any) => Predicate = val => {
		if (val instanceof RegExp) {
			return reTest(val);
		} else if (typeof val === 'object' && val) {
			return and(Object.keys(val).map(k => {
				const v = val[k];
				if (k[0] === '$') {
					if (!ops[k]) throw new Error('bad operator: ' + k);
					return ops[k](v, val);
				} else {
					return compose(cvt(v), walk(k));
				}
			}));
		} else {
			return ops['$eq'](val);
		}
	};
	return cvt;
}

export const convert = converter();
