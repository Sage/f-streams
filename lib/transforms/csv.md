## Stream transform for CSV files

`import { csvParser, csvFormatter } from 'f-streams'`  

* `transform = csvParser(options)`  
  creates a parser transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
* `transform = csvFormatter(options)`  
  creates a formatter transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
  - `eol`: the end of line marker (`\n`  or `\r\n`)  
