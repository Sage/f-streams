import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal, ok, deepEqual } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}

import * as cp from "child_process";
import * as fsp from "path";
import * as os from "os";

describe(module.id, () => {

    test("echo ok", () => {
        if (os.type() === 'Windows_NT') {
            ok("Ignore on Windows");
        } else {
            const proc = cp.spawn('echo', ['hello\nworld']);
            const got = ez.devices.child_process.reader(proc).toArray();
            deepEqual(got, ['hello', 'world']);
        }
    });

    test("bad command", () => {
        const proc = cp.spawn(fsp.join(__dirname, 'foobar.zoo'), ['2']);
        try {
            const got = ez.devices.child_process.reader(proc).toArray();
            ok(false);
        } catch (ex) {
            ok(ex.code < 0); // -1 on node 0.10 but -2 on 0.12
        }
    });

    test("exit 2", () => {
        const cmd = 'exit2' + (os.type() === 'Windows_NT' ? '.cmd' : '.sh');
        const proc = cp.spawn(fsp.join(__dirname, '../../../test/fixtures', cmd), ['2']);
        try {
            const got = ez.devices.child_process.reader(proc).toArray();
            ok(false);
        } catch (ex) {
            equal(ex.code, 2);
        }
    });
});