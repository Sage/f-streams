## File based EZ streams

`import { textFileReader, textFileWriter, binaryFileReader, binaryFileWriter, directoryReader} from 'f-streams'`

-   `reader = textFileReader(path, encoding)`  
    creates a reader that reads from a text file.  
    `encoding` is optional. It defaults to `'utf8'`.
-   `writer = textFileWriter(path, encoding)`  
    creates a writer that writes to a text file.  
    `encoding` is optional. It defaults to `'utf8'`.
-   `reader = binaryFileReader(path)`  
    creates a reader that reads from a binary file.
-   `writer = binaryFileWriter(path)`  
    creates a writer that writes to a binary file.
-   `reader = directoryReader(path, options)`  
    `reader = directoryReader(path, recurse, accept)`  
    creates a reader that enumerates (recursively) directories and files.  
    Returns the entries as `{ path: path, name: name, depth: depth, stat: stat }` objects.  
    Two `options` may be specified: `recurse` and `accept`.  
    If `recurse` is falsy, only the entries immediately under `path` are returned.  
    If `recurse` is truthy, entries at all levels (including the root entry) are returned.  
    If `recurse` is `"postorder"`, directories are returned after their children.  
    `accept` is an optional function which will be called as `accept(entry)` and
    will control whether files or subdirectories will be included in the stream or not.
