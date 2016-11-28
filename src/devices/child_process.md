## EZ Stream wrappers for node child processes

`import * as f from 'f-streams'`

* `reader = ez.devices.child_process.reader(proc, options)`  
  wraps a node.js child process as an EZ reader.  
  For a full description of the options, see `ReadableStream` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
* `writer = ez.devices.child_process.writer(proc, options)`  
  wraps a node.js child process as an EZ writer.  
  For a full description of the options, see `WritableStream` in
  https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md 
