## Stream transform for MIME multipart

`import { multipartParser, multipartFormatter }from 'f-streams'`

-   `transform = multipartParser(options)`  
    Creates a parser transform.
    The content type, which includes the boundary,
    is passed via `options['content-type']`.
-   `transform = multipartFormatter(options)`  
    Creates a formatter transform.
    The content type, which includes the boundary,
    is passed via `options['content-type']`.
