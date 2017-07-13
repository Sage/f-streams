import { wait } from 'f-promise';

export function nextTick() {
	wait(cb => process.nextTick(cb));
}
