## EZ Streams core writer API

`import * as f from 'f-streams'`

-   `writer = writer.writeAll(val)`  
    writes `val` and ends the writer

-   `writer = writer.stop(err)`  
    stops the writer.  
    by default arg is silently ignored

-   `writer = writer.end()`  
    ends the writer - compatiblity call (errors won't be thrown to caller)
-   `writer = writer.pre.action(fn)`  
    returns another writer which applies `action(fn)` before writing to the original writer.  
    `action` may be any chainable action from the reader API: `map`, `filter`, `transform`, ...
-   `stream = writer.nodify()`  
    converts the writer into a native node Writable stream.
