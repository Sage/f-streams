import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}

const TESTBUF = new Buffer([1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);

function eqbuf(b1: Buffer | undefined, b2: Buffer, msg: string) {
    if (!b1) throw new Error('unexpected EOF');
    equal(b1.toString('hex'), b2.toString('hex'), msg);
}

describe(module.id, () => {
    test("roundtrip", () => {
        [1, 4, 11, 1000].forEach(function (size) {
            const dst = ez.devices.buffer.writer();
            const writer = ez.helpers.binary.writer(dst, {
                bufSize: size
            });
            writer.write(TESTBUF);
            writer.writeInt8(1);
            writer.writeInt16(2);
            writer.writeInt32(3);
            writer.writeFloat(0.5);
            writer.writeDouble(0.125);
            writer.writeInt8(5);
            writer.write();
            const result = dst.toBuffer();

            const src = ez.devices.buffer.reader(result).transform<Buffer>(ez.transforms.cut.transform(5));
            const reader = ez.helpers.binary.reader(src);
            eqbuf(reader.read(7), TESTBUF.slice(0, 7), 'read 7 (size=' + size + ')');
            reader.unread(3);
            eqbuf(reader.peek(5), TESTBUF.slice(4, 9), 'unread 3 then peek 5');
            eqbuf(reader.read(6), TESTBUF.slice(4), 'read 6');
            equal(reader.readInt8(), 1, 'int8 roundtrip');
            equal(reader.peekInt16(), 2, 'int16 roundtrip (peek)');
            equal(reader.readInt16(), 2, 'int16 roundtrip');
            equal(reader.readInt32(), 3, 'int32 roundtrip');
            equal(reader.readFloat(), 0.5, 'float roundtrip');
            equal(reader.peekDouble(), 0.125, 'double roundtrip (peek)');
            equal(reader.readDouble(), 0.125, 'double roundtrip');
            reader.unreadDouble();
            equal(reader.readDouble(), 0.125, 'double roundtrip (after unread)');
            equal(reader.readInt8(), 5, 'int8 roundtrip again');
            equal(reader.read(), undefined, 'EOF roundtrip');
        })
    });
});