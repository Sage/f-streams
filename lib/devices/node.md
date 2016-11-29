## EZ Stream wrappers for native node streams

`import * as f from 'f-streams'`

* `reader = ez.devices.node.reader(stream, options)`  
  wraps a node.js stream as an EZ reader.  
  For a full description of the options, see `ReadableStream` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
* `writer = ez.devices.node.writer(stream, options)`  
  wraps a node.js stream as an EZ writer.  
  For a full description of the options, see `WritableStream` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
