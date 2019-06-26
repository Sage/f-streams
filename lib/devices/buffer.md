## In-memory buffer streams

`import { bufferReader, bufferWriter} from 'f-streams'`

-   `reader = bufferReader(buffer, options)`  
    creates a reader that reads its entries from `buffer`.  
    `reader.read()` will return its entries asynchronously by default.  
    You can force synchronous delivery by setting `options.sync` to `true`.
    The default chunk size is 1024. You can override it by passing
    a `chunkSize` option.
-   `writer = bufferWriter(options)`  
    creates a writer that collects data into an buffer.  
    `writer.write(data)` will write asynchronously by default.  
    You can force synchronous write by setting `options.sync` to `true`.
    `writer.toBuffer()` returns the internal buffer into which the
    chunks have been collected.
