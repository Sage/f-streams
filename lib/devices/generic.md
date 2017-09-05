## Generic stream constructors

`import { genericReader, genericWriter } from 'f-streams'`

* `reader = genericReader(read[, stop])`  
  creates a reader from a given `read()` function and an optional `stop([arg])` function.
* `writer = genericWriter(write)`  
  creates a writer from a given `write(val)` function.
