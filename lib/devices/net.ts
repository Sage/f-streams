import * as streams from '../node-wrappers';
import { fixOptions } from './node';

/// !doc
/// ## TCP and socket Streams
/// 
/// `import { sockerServer, socketClient, tcpClient} from 'f-streams'`
/// 
/// * `server = socketServer(serverOptions, listener, streamOptions)`  
///   Creates a socket server.  
///   The `listener` is called as `listener(stream)`  
///   where `stream` is a reader and writer.  
///   For a full description of this API, see `NetServer` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
export type SocketServer = streams.SocketServer;
export type SocketServerOptions = streams.SocketServerOptions;
export type SocketServerListener = streams.SocketServerListener;
export type SocketOptions = streams.SocketOptions;
export type SocketClient = streams.SocketClient;

export function server(listener: SocketServerListener, streamOptions?: SocketOptions, serverOptions?: SocketServerOptions) {
	// compat hack 
	if (typeof streamOptions === 'function') {
		return streams.createNetServer(arguments[0], arguments[1], fixOptions(arguments[2]));
	}
	return streams.createNetServer(serverOptions!, listener, fixOptions(streamOptions));
}
/// * `client = tcpClient(port, host, options)`  
///   Creates a TCP client.  
///   The stream returned by `client.connect()`  is a reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export function tcpClient(port: number, host?: string, options?: SocketOptions) {
	return streams.tcpClient(port, host, fixOptions(options));
}
/// * `client = socketClient(path, options)`  
///   Creates a socket client.  
///   The stream returned by `client.connect()`  is a reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 

export function socketClient(path: string, options: SocketOptions) {
	return streams.socketClient(path, fixOptions(options));
}
