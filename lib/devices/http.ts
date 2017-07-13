import * as http from 'http';
import {
	createHttpServer,
	HttpClientOptions,
	HttpClientRequest,
	HttpClientResponse,
	httpListener,
	HttpProxyClientRequest,
	httpRequest,
	HttpServer,
	HttpServerOptions,
	HttpServerRequest,
	HttpServerResponse,
} from '../node-wrappers';
import { Reader } from '../reader';
import { Writer } from '../writer';
import { fixOptions } from './node';

export {
	HttpProxyClientRequest,
	HttpClientRequest,
	HttpClientResponse,
	HttpClientOptions,
	HttpServer,
	HttpServerRequest,
	HttpServerResponse,
	HttpServerOptions,
};

function endWrite(cli: HttpClientRequest) {
	const resp = cli.end().response();
	if (resp.statusCode !== 201) throw new Error('Request return status code: ' + resp.statusCode); // TODO: better manage errors
	const data = resp.readAll();
	return (typeof data === 'string' && /^application\/json/.test(resp.headers['content-type'])) ? JSON.parse(data) : data;
}

function guessType(data: any) {
	if (!data) return null;
	if (Buffer.isBuffer(data)) return 'application/octet-stream';
	if (typeof data === 'object') return 'application/json';
	if (typeof data !== 'string') throw new TypeError('invalid data type: ' + typeof data);
	const text = data;
	if (text[0] === '<') {
		if (text.slice(0, 9).toLowerCase() === '<!doctype') return 'text/html';
		else return 'application/xml';
	}
	return 'text/plain';
}

/// !doc
/// ## HTTP EZ Streams
/// 
/// `import * as f from 'f-streams'`
/// 
/// * `server = ez.devices.http.server(listener, options)`  
///   Creates an EZ HTTP server.  
///   The `listener` is called as `listener(request, response)`  
///   where `request` is an EZ reader and `response` an EZ writer.  
///   For a full description of this API, see `HttpServerRequest/Response` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export function server(listenr: (request: HttpServerRequest, response: HttpServerResponse) => void, options?: HttpServerOptions) {
	return createHttpServer(listenr, fixOptions(options));
}
/// * `client = ez.devices.http.client(options)`  
///   Creates an EZ HTTP client.  
///   `client` is an EZ writer.  
///   The response object returned by `client.response()`  is an EZ reader.  
///   For a full description of this API, see `HttpClientRequest/Response` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export function client(options?: HttpClientOptions) {
	return httpRequest(fixOptions(options));
}
/// * `listener = ez.devices.http.listener(listener, options)`  
///    wraps an f-streams listener as a vanilla node.js listener
export interface HttpListenerOption {

}
export function listener(listenr: (request: HttpServerRequest, response: HttpServerResponse) => void, options?: HttpListenerOption) {
	return httpListener(listenr, fixOptions(options));
}
/// * `factory = ez.factory("http://user:pass@host:port/...")` 
///    Use reader for a GET request, writer for POST request
export type FactoryWriter = Writer<any> & { _result: any };

export function factory(url: string) {
	return {
		/// * `reader = factory.reader()`  
		reader() {
			const response = module.exports.client({
				url: url,
				method: 'GET',
			}).end().response();
			if (response.statusCode !== 200) {
				const payload = response.readAll();
				throw new Error("Error reading '" + url + "'; Status " + response.statusCode + ': ' + payload);
			}
			return response;
		},
		/// * `writer = factory.writer()`  
		writer() {
			let cli: HttpClientRequest;
			let type: string | null;
			return {
				write(this: FactoryWriter, data: any) {
					const opt: HttpClientOptions = {
						url: url,
						method: 'POST',
						headers: {},
					};
					if (!cli) {
						type = guessType(data);
						if (type) opt.headers!['content-type'] = type;
						cli = client(opt).proxyConnect();
					}
					if (data === undefined) return this._result = endWrite(cli);
					else return cli.write(type === 'application/json' ? JSON.stringify(data) : data);
				},
				get result(this: FactoryWriter) { return this._result; },
			};
		},
	};
}