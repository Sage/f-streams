## Generic stream constructors

`import * as f from 'f-streams'`

* `reader = ez.devices.generic.reader(read[, stop])`  
  creates an EZ reader from a given `read()` function and an optional `stop([arg])` function.
* `writer = ez.devices.generic.writer(write)`  
  creates an ES writer from a given `write(val)` function.
## Special streams

* `ez.devices.generic.empty`  
  The empty stream. `empty.read()` returns `undefined`.
  It is also a null sink. It just discards anything you would write to it.
