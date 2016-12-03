import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { setup } from 'f-mocha';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

var server: ez.devices.http.HttpServer;

describe(module.id, () => {
    it("start echo server", () => {
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

    it("http test", () => {
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

    it("http readers and writers", () => {
        const writer = ez.writer("http://localhost:3005");
        const result = writer.writeAll("hello world").result;
        strictEqual(result, "text/plain: hello world");
    });

    it("http JSON", () => {
        const writer = ez.writer("http://localhost:3005");
        const result = writer.writeAll([2, 4]).result;
        deepEqual(result, { echo: [2, 4] });
    });

    it("array test", () => {
        const reply = ez.reader([2, 3, 4]).readAll();
        deepEqual(reply, [2, 3, 4]);
    });

    it("array readers and writers", () => {
        const writer = ez.writer([]);
        ez.reader([2, 3, 4]).pipe(writer);
        deepEqual(writer.result, [2, 3, 4]);
    });

    it("string test", () => {
        const reply = ez.reader("string:hello world").readAll();
        deepEqual(reply, "hello world");
    });

    it("string readers and writers", () => {
        const writer = ez.writer("string:");
        ez.reader("string:hello world").pipe(writer);
        deepEqual(writer.result, "hello world");
    });

    it("buffer test", () => {
        const buf = new Buffer('hello world', 'utf8');
        const reply = ez.reader(buf).transform(ez.transforms.cut.transform(2)).readAll() as Buffer;
        deepEqual(reply.toString('utf8'), buf.toString('utf8'));
    });

    it("buffer reader and writer", () => {
        const buf = new Buffer('hello world', 'utf8');
        const writer = ez.writer(new Buffer(0));
        const reply = ez.reader(buf).pipe(writer);
        deepEqual(writer.result.toString('utf8'), buf.toString('utf8'));
    });
});