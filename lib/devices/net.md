## TCP and socket Streams

`import { sockerServer, socketClient, tcpClient} from 'f-streams'`

* `server = socketServer(serverOptions, listener, streamOptions)`  
  Creates a socket server.  
  The `listener` is called as `listener(stream)`  
  where `stream` is a reader and writer.  
  For a full description of this API, see `NetServer` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
* `client = tcpClient(port, host, options)`  
  Creates a TCP client.  
  The stream returned by `client.connect()`  is a reader and writer.  
  For a full description of this API, see `tcpClient` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
* `client = socketClient(path, options)`  
  Creates a socket client.  
  The stream returned by `client.connect()`  is a reader and writer.  
  For a full description of this API, see `tcpClient` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
