import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';

const { equal, ok, strictEqual, deepEqual } = assert;

function test(name: string, fn: () => void) {
    it(name, (done) => {
        run(() => (fn(), undefined)).then(done, done);
    });
}

var server: ez.devices.http.HttpServer;

describe(module.id, () => {
    test("start echo server", () => {
        server = ez.devices.http.server(function (req, res) {
            if (req.method === "POST") {
                const text = req.readAll();
                const ct = req.headers["content-type"];
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
            if (req.method === "GET") {
                // query parameters
                var query = (req.url.split("?")[1] || "").split("&").reduce(function (prev, crt) {
                    var parts = crt.split("=");
                    if (parts[0]) prev[parts[0]] = parts[1];
                    return prev;
                }, {} as any);
                res.writeHead(query.status || 200, {});
                res.end("reply for GET");
            }
        });
        server.listen(3005);
        ok(true, "server started");
    });

    test("http test", () => {
        const reply = ez.reader("http://localhost:3005").readAll();
        strictEqual(reply, "reply for GET", "Get test: reader ok");
        // try not found reader
        try {
            const reply404 = ez.reader("http://localhost:3005?status=404").readAll();
            ok(false, "Reader supposed to throw");
        } catch (ex) {
            ok(/Status 404/.test(ex.message), "Reader throws ok");
        }
    });

    test("http readers and writers", () => {
        const writer = ez.writer("http://localhost:3005");
        const result = writer.writeAll("hello world").result;
        strictEqual(result, "text/plain: hello world");
    });

    test("http JSON", () => {
        const writer = ez.writer("http://localhost:3005");
        const result = writer.writeAll([2, 4]).result;
        deepEqual(result, { echo: [2, 4] });
    });

    test("array test", () => {
        const reply = ez.reader([2, 3, 4]).readAll();
        deepEqual(reply, [2, 3, 4]);
    });

    test("array readers and writers", () => {
        const writer = ez.writer([]);
        ez.reader([2, 3, 4]).pipe(writer);
        deepEqual(writer.result, [2, 3, 4]);
    });

    test("string test", () => {
        const reply = ez.reader("string:hello world").readAll();
        deepEqual(reply, "hello world");
    });

    test("string readers and writers", () => {
        const writer = ez.writer("string:");
        ez.reader("string:hello world").pipe(writer);
        deepEqual(writer.result, "hello world");
    });

    test("buffer test", () => {
        const buf = new Buffer('hello world', 'utf8');
        const reply = ez.reader(buf).transform(ez.transforms.cut.transform(2)).readAll() as Buffer;
        deepEqual(reply.toString('utf8'), buf.toString('utf8'));
    });

    test("buffer reader and writer", () => {
        const buf = new Buffer('hello world', 'utf8');
        const writer = ez.writer(new Buffer(0));
        const reply = ez.reader(buf).pipe(writer);
        deepEqual(writer.result.toString('utf8'), buf.toString('utf8'));
    });
});