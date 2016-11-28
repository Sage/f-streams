import { _ } from 'streamline-runtime';
import { wait } from 'f-promise';

export function nextTick() {
    wait(_.promise(_ => process.nextTick(_ as any)));
}

export function waitCb<T>(fn: (cb: (err: any, result?: T) => void) => void) {
    return wait(_.promise(_ => _.cast(fn)(_)));
}

export function wait_<T>(fn: (_: _) => T): T {
    return (fn as any)['fiberized-0'](true) as T;
}

export function funnel<T>(n: number): (fn: () => T) => T;
export function funnel<T>(n: number): (fn: () => T | undefined) => T | undefined {
    var fun = _.funnel<T>(n);
    return (fn) => wait_(_ => fun(_, _ => fn()));
}