## Stream wrappers for native node streams

`import { nodeReader, nodeWriter } from 'f-streams'`

-   `reader = nodeReader(stream, options)`  
    wraps a node.js stream as a reader.  
    For a full description of the options, see `ReadableStream` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
-   `writer = nodeWriter(stream, options)`  
    wraps a node.js stream as a writer.  
    For a full description of the options, see `WritableStream` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
