import * as ez from "../..";
import { assert } from 'chai';
import { run, wait } from 'f-promise';
import { setup } from 'f-mocha';
setup();

const { equal, ok, strictEqual, deepEqual } = assert;

var server: ez.devices.http.HttpServer;

describe(module.id, () => {
	it("Echo service test", () => {
		function _test(type: string, message: any) {
			const writer = ez.factory("http://localhost:3004").writer();
			writer.write(message);
			strictEqual(writer.write(undefined), type + ((type === "application/json") ? JSON.stringify(message) : message), "POST result ok for " + type);
		}
		server = ez.devices.http.server(function (req, res) {
			if (req.method === "POST") {
				const text = req.readAll();
				res.statusCode = 201;
				res.end(req.headers["content-type"] + text);
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
		server.listen(3004);
		_test("text/plain", "post test");
		_test("application/json", { test: "post test" });
		_test("text/html", "<!DOCTYPE html>");
		_test("application/xml", "<xml ns");
		//
		const reader = ez.factory("http://localhost:3004").reader();
		strictEqual(reader.read(), "reply for GET", "Get test: reader ok");
		// try not found reader
		try {
			const nf_reader = ez.factory("http://localhost:3004?status=404").reader();
			ok(false, "Reader supposed to throw");
		} catch (ex) {
			ok(/Status 404/.test(ex.message), "Reader throws ok");
		}
	});
});
