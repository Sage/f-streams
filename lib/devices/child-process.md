## EZ Stream wrappers for node child processes

`import { childProcessReader, childProcessWriter} from 'f-streams'`

-   `reader = childProcessReader(proc, options)`  
    wraps a node.js child process as a reader.  
    For a full description of the options, see `ReadableStream` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
-   `writer = childProcessWriter(proc, options)`  
    wraps a node.js child process as a writer.  
    For a full description of the options, see `WritableStream` in
    https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md
