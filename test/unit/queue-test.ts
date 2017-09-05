import { assert } from 'chai';
import { setup } from 'f-mocha';
import { run, wait } from 'f-promise';
import { queue } from '../..';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

describe(module.id, () => {
	it('put (lossy)', () => {
		const q = queue(4);
		for (let i = 0; i < 6; i++) {
			const queued = q.put(i);
			ok(queued === (i < 4), 'put return value: ' + queued);
		}
		q.end();
		const result = q.reader.toArray();
		equal(result.join(','), '0,1,2,3', 'partial queue contents ok');
	});

	it('write (lossless)', () => {
		const q = queue(4);
		const writeTask = run(() => {
			for (let i = 0; i < 6; i++) q.write(i);
			q.write(undefined);
		});
		const readTask = run(() => {
			return q.reader.toArray();
		});

		wait(writeTask);
		equal(wait(readTask).join(','), '0,1,2,3,4,5', 'full queue contents ok');
	});
});