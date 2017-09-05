## Stream transform for line-oriented text streams

`import { linesParser, linesFormatter } from 'f-streams'`  

* `transform = linesParser(options)`  
  creates a parser transform.
  `options` is reserved for future use.
* `transform = linesFormatter(options)`  
  creates a formatter transform.
  `options.eol` defines the line separator. It is set to `\n` by default.
  `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
