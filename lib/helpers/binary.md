## helpers for binary streams

`import * as f from 'f-streams'`  

----

* `reader = ez.helpers.binary.reader(reader, options)`  
  Wraps a raw buffer reader and returns a reader with additional API to handle binary streams.  
  By default the reader is configured as big endian.  
  You can configure it as little endian by setting the `endian` option to `"little"`.

* `buf = reader.read(len)`  
  returns the `len` next bytes of the stream.  
  returns a buffer of length `len`, except at the end of the stream.  
  The last chunk of the stream may have less than `len` bytes and afterwards the call
  returns `undefined`.  
  If the `len` parameter is omitted, the call returns the next available chunk of data.

* `buf = reader.peek(len)`  
  Same as `read` but does not advance the read pointer.  
  Another `read` would read the same data again.

* `reader.unread(len)`  
  Unread the last `len` bytes read.  
  `len` cannot exceed the size of the last read.

* `val = reader.readInt8()`  
* `val = reader.readUInt8()`  
* `val = reader.readInt16()`  
* `val = reader.readUInt16()`  
* `val = reader.readInt32()`  
* `val = reader.readUInt32()`  
* `val = reader.readFloat()`  
* `val = reader.readDouble()`  
  Specialized readers for numbers.

* `val = reader.peekInt8()`  
* `val = reader.peekUInt8()`  
* `val = reader.peekInt16()`  
* `val = reader.peekUInt16()`  
* `val = reader.peekInt32()`  
* `val = reader.peekUInt32()`  
* `val = reader.peekFloat()`  
* `val = reader.peekDouble()`  
  Specialized peekers for numbers.
* `val = reader.unreadInt8()`  
* `val = reader.unreadUInt8()`  
* `val = reader.unreadInt16()`  
* `val = reader.unreadUInt16()`  
* `val = reader.unreadInt32()`  
* `val = reader.unreadUInt32()`  
* `val = reader.unreadFloat()`  
* `val = reader.unreadDouble()`  
  Specialized unreaders for numbers.

----

* `writer = ez.helpers.binary.writer(writer, options)`  
  Wraps a raw buffer writer and returns a writer with additional API to handle binary streams.
  By default the writer is configured as big endian.  
  You can configure it as little endian by setting the `endian` option to `"little"`.  
  The `bufSize` option controls the size of the intermediate buffer.

* `writer.flush()`  
  Flushes the buffer to the wrapped writer.

* `writer.write(buf)`  
  Writes `buf`.  
  Note: writes are buffered.  
  Use the `flush()` call if you need to flush before the end of the stream.

* `writer.writeInt8(val)`  
* `writer.writeUInt8(val)`  
* `writer.writeInt16(val)`  
* `writer.writeUInt16(val)`  
* `writer.writeInt32(val)`  
* `writer.writeUInt32(val)`  
* `writer.writeFloat(val)`  
* `writer.writeDouble(val)`  
  Specialized writers for numbers.
