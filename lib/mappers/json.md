## JSON mappers

`import { simpleJsonParser, simpleJsonFormatter } from 'f-streams'`

-   `mapper = simpleJsonParser(options)`  
    returns a mapper that parses JSON string.  
    It assumes that the stream has already been split on boundaries that delimit valid JSON strings,
    with an optional separator at the end.
-   `mapper = simpleJsonFormatter(options)`  
    returns a mapper that converts objects to JSON.
    You can use a the `sep` option to specify a separator that will be added at the end of every item.
    By default, `sep` is `,\n`.
