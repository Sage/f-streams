## HTTP Streams

`import { httpServer, httpClient, httpListener } from 'f-streams'`

-   `server = httpServer(listener, options)`  
    Creates an HTTP server.  
    The `listener` is called as `listener(request, response)`  
    where `request` is a reader and `response` a writer.  
    For a full description of this API, see `HttpServerRequest/Response` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
-   `client = httpClient(options)`  
    Creates an HTTP client.  
    `client` is a writer.  
    The response object returned by `client.response()` is a reader.  
    For a full description of this API, see `HttpClientRequest/Response` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
-   `listener = httpListener(listener, options)`  
     wraps an f-streams listener as a vanilla node.js listener
-   `factory = factory("http://user:pass@host:port/...")`
    Use reader for a GET request, writer for POST request
-   `reader = factory.reader()`
-   `writer = factory.writer()`
