import { assert } from 'chai';
import { setup } from 'f-mocha';
import { cutter, emptyReader, HttpServer, httpServer, reader as fReader, writer as fWriter } from '../..';
import { createEmptyReader, createEmptyWriter } from '../../lib';

setup();

const { ok, strictEqual, deepEqual } = assert;

let server: HttpServer;

describe(module.id, () => {
    it('start echo server', () => {
        server = httpServer(function(req, res) {
            if (req.method === 'POST') {
                const text = req.readAll();
                const ct = req.headers['content-type'];
                if (ct === 'application/json') {
                    res.writeHead(201, {
                        'content-type': ct,
                    });
                    res.end('{"echo":' + text + '}');
                } else {
                    res.writeHead(201);
                    res.end(ct + ': ' + text);
                }
            }
            if (req.method === 'GET') {
                // query parameters
                const query = (req.url.split('?')[1] || '').split('&').reduce(
                    function(prev, crt) {
                        const parts = crt.split('=');
                        if (parts[0]) prev[parts[0]] = parts[1];
                        return prev;
                    },
                    {} as any,
                );
                res.writeHead(query.status || 200, {});
                res.end('reply for GET');
            }
        });
        server.listen(3005);
        ok(true, 'server started');
    });

    it('http test', () => {
        const reply = fReader('http://localhost:3005').readAll();
        strictEqual(reply, 'reply for GET', 'Get test: reader ok');
        // try not found reader
        try {
            const reply404 = fReader('http://localhost:3005?status=404').readAll();
            ok(false, 'Reader supposed to throw');
        } catch (ex) {
            ok(/Status 404/.test(ex.message), 'Reader throws ok');
        }
    });

    it('http readers and writers', () => {
        const writer = fWriter('http://localhost:3005');
        const result = writer.writeAll('hello world').result;
        strictEqual(result, 'text/plain: hello world');
    });

    it('http JSON', () => {
        const writer = fWriter('http://localhost:3005');
        const result = writer.writeAll([2, 4]).result;
        deepEqual(result, { echo: [2, 4] });
    });

    it('array test', () => {
        const reply = fReader([2, 3, 4]).readAll();
        deepEqual(reply, [2, 3, 4]);
    });

    it('array readers and writers', () => {
        const writer = fWriter([]);
        fReader([2, 3, 4]).pipe(writer);
        deepEqual(writer.result, [2, 3, 4]);
    });

    it('string test', () => {
        const reply = fReader('string:hello world').readAll();
        deepEqual(reply, 'hello world');
    });

    it('string readers and writers', () => {
        const writer = fWriter('string:');
        fReader('string:hello world').pipe(writer);
        deepEqual(writer.result, 'hello world');
    });

    it('buffer test', () => {
        const buf = Buffer.from('hello world', 'utf8');
        const reply = fReader(buf)
            .transform(cutter(2))
            .readAll() as Buffer;
        deepEqual(reply.toString('utf8'), buf.toString('utf8'));
    });

    it('buffer reader and writer', () => {
        const buf = Buffer.from('hello world', 'utf8');
        const writer = fWriter(Buffer.alloc(0));
        const reply = fReader(buf).pipe(writer);
        deepEqual(writer.result.toString('utf8'), buf.toString('utf8'));
    });

    it('emptyReader should be usable many times', () => {
        assert.isUndefined(emptyReader.readAll());
        assert.isUndefined(emptyReader.readAll());
    });

    it('createEmptyReader() should be usable many times', () => {
        assert.isUndefined(createEmptyReader().readAll());
        assert.isUndefined(createEmptyReader().readAll());
    });

    it('createEmptyWriter() should be usable many times', () => {
        assert.doesNotThrow(() => {
            fReader('string:hello world').pipe(createEmptyWriter());
            fReader([2, 3, 4]).pipe(createEmptyWriter());
        });
    });
});
