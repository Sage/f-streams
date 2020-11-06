import { assert } from 'chai';
import { setup } from 'f-mocha';
import { binaryReader, binaryWriter, bufferReader, bufferWriter, cutter, genericReader, genericWriter } from '../..';

setup();

const { equal } = assert;

const TESTBUF = Buffer.from([1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);

function eqbuf(b1: Buffer | undefined, b2: Buffer, msg: string) {
    if (!b1) throw new Error('unexpected EOF');
    equal(b1.toString('hex'), b2.toString('hex'), msg);
}

describe(module.id, () => {
    it('roundtrip', () => {
        [1, 4, 11, 1000].forEach(function(size) {
            const dst = bufferWriter();
            const writer = binaryWriter(dst, {
                bufSize: size,
            });
            writer.write(TESTBUF);
            writer.writeInt8(1);
            writer.writeUInt8(254);
            writer.writeInt16(2);
            writer.writeInt32(3);
            writer.writeFloat(0.5);
            writer.writeDouble(0.125);
            writer.writeInt8(5);
            writer.write();
            const result = dst.toBuffer();

            const src = bufferReader(result).transform<Buffer>(cutter(5));
            const reader = binaryReader(src);
            eqbuf(reader.read(7), TESTBUF.slice(0, 7), 'read 7 (size=' + size + ')');
            reader.unread(3);
            eqbuf(reader.peek(5), TESTBUF.slice(4, 9), 'unread 3 then peek 5');
            eqbuf(reader.read(6), TESTBUF.slice(4), 'read 6');
            equal(reader.readInt8(), 1, 'int8 roundtrip');
            equal(reader.readUInt8(), 254, 'uint8 roundtrip');
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
        });
    });

    describe('peekAll should not consume the reader', () => {
        it('buffer is empty', () => {
            const originalBuffer = Buffer.from([]);
            const reader = binaryReader(bufferReader(originalBuffer));
            equal(reader.peekAll(), undefined, 'peekAll');
            equal(reader.readAll(), undefined, 'readAll');
        });

        it('buffer length smaller than chunk size', () => {
            const originalBuffer = Buffer.allocUnsafe(256);
            const reader = binaryReader(bufferReader(originalBuffer));
            eqbuf(reader.peekAll(), originalBuffer, 'peekAll');
            eqbuf((reader.readAll() as Buffer), originalBuffer, 'readAll');
        });

        it('buffer length equal to chunk size', () => {
            const originalBuffer = Buffer.allocUnsafe(1024);
            const reader = binaryReader(bufferReader(originalBuffer));
            eqbuf(reader.peekAll(), originalBuffer, 'peekAll');
            eqbuf((reader.readAll() as Buffer), originalBuffer, 'readAll');
        });

        it('buffer length greater than chunk size', () => {
            const originalBuffer = Buffer.allocUnsafe(1600);
            const reader = binaryReader(bufferReader(originalBuffer));
            eqbuf(reader.peekAll(), originalBuffer, 'peekAll');
            eqbuf((reader.readAll() as Buffer), originalBuffer, 'readAll');
        });
    });

    it('should stop underlying reader', () => {
        const stopError = new Error('stop read stream');
        let foundError: Error | undefined;
        binaryReader(genericReader<Buffer>(() => {
            return Buffer.allocUnsafe(1);
        }, (e: Error) => {
            foundError = e;
        })).stop(stopError);
        assert.equal(foundError, stopError);
    });

    it('should stop underlying writer', () => {
        const stopError = new Error('stop write stream');
        let foundError: Error | undefined;
        binaryWriter(genericWriter<Buffer>(() => {
            return ;
        }, (e: Error) => {
            foundError = e;
        })).stop(stopError);
        assert.equal(foundError, stopError);
    });
});
