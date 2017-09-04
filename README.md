# Easy Streams for node.js

f-streams is a simple but powerful streaming library for node.js.

F-streams come in two flavors: _readers_ and _writers_. You pull data from _readers_ and you push data into _writers_.

The data that you push or pull may be anything: buffers and strings of course, but also simple values like numbers or Booleans, JavaScript objects, nulls, ... 
There is only one value which has a special meaning: `undefined`. Reading `undefined` means that you have reached the end of a reader stream. 
Writing `undefined` signals that you want to _end_ a writer stream.

F-streams use the [f-promise](https://github.com/Sage/f-promise) library. 

## Installation

``` sh
npm install f-streams
```

## Creating a stream

The `devices` modules let you get or create various kinds of f-streams. For example:

``` javascript
var fst = require('f-streams');
var log = fst.devices.console.log; // console writer
var stdin = fst.devices.std.in('utf8'); // stdin in text mode
var textRd = fst.devices.file.text.reader(path); // text file reader
var binWr = fst.devices.file.binary.writer(path); // binary file writer
var stringRd = fst.devices.string.reader(text); // in memory text reader
```

You can also wrap any node.js stream into an f-stream, with the `node` device. For example:

``` javascript
var reader = fst.devices.node.reader(fs.createReadStream(path)); // same as fst.file.binary.reader
var writer = fst.devices.node.writer(fs.createWriteStream(path)); // same as fst.file.binary.writer
```

The `fst.devices.http` and `fst.devices.net` modules give you wrappers for servers and clients in which the request
and response objects are f readers and writers.

The `fst.devices.generic` module lets you create your own f-streams. For example here is how you would implement a reader that returns numbers from 0 to n

``` javascript
var numberReader = function(n) {
	var i = 0;
	return fst.devices.generic.reader(function read() {
		if (i < n) return i++;
		else return undefined;
	});
};
```

To define your own reader you just need to pass an asynchronous `read() {...}` function to `fst.devices.generic.reader`.

To define your own writer you just need to pass an asynchronous `write(val) {...}` function to `fst.devices.generic.writer`.

So, for example, here is how you can wrap mongodb APIs into f-streams:

``` javascript
import { wait } from 'f-promise';

var reader = function(cursor) {
	return fst.devices.generic.reader(function() {
		var obj = wait(cursor.nextObject());
		return obj == null ? undefined : obj;
	});
}
var writer = function(collection) {
	var done;
	return fst.devices.generic.writer(function(val) {
		if (val === undefined) done = true;
		if (!done) wait(collection.insert(val));
	});
}
```

But you don't have to do it. There are already f-streams _devices_ for MongoDB and popular databases. See [below](#database-support).

## Basic read and write

You can read from a reader by calling its `read` method and you can write to a writer by calling its `write` method:

``` javascript
var val = reader.read();
writer.write(val);
```

The `read` and `write` methods may be asynchronous. If they are, they should be implemented with the `f-promise` library. 

`read` returns `undefined` at the end of a stream. Symmetrically, passing `undefined` to the `write` method of a writer ends the writer.


## Array-like API

You can treat an f-reader very much like a JavaScript array: you can filter it, map it, reduce it, etc. For example you can write:

``` javascript
console.log("pi~=" + 4 * numberReader(10000).filter(function(n) {
	return n % 2; // keep only odd numbers
}).map(function(n) {
	return n % 4 === 1 ? 1 / n : -1 / n;
}).reduce(function(res, val) {
	return res + val;
}, 0));
```

This will compute 4 * (1 - 1/3 + 1/5 - 1/7 ...).

Every step of the chain, except the last one, returns a new reader. 
The first reader produces all integers up to 9999. 
The second one, which is returned by the `filter` call lets only the odd integers go through. 
The third one, returned by the `map` call transforms the odd integers into alternating fractions. 
The `reduce` step at the end combines the alternating fractions to produce the final result.

Rather academic here but in real life you often need to query databases or external services when filtering or mapping stream entries. 
So this is very useful.

The Array-like API also includes `every`, `some` and `forEach`. 
On the other hand it does not include `reduceRight` nor `sort`, as these functions are incompatible with streaming (they would need to buffer the entire stream).

The `forEach`, `every` and `some` functions are reducers and return when the stream has been completely processed, like `reduce` (see example further down).

Note: the `filter`, `every` and `some` methods can also be controlled by a mongodb filter condition rather than a function. 
The following are equivalent:

``` javascript
// filter expressed as a function
reader =  numberReader(1000).filter(function(n) {
	return n >= 10 && n < 20;
});

// mongo-style filter
reader =  numberReader(1000).filter({
	$gte: 10,
	$lt: 20,
});
```

## Iterable interface

Readers implement the `Iterable` interface. You can iterate over a reader with a `for ... of ...` loop:

``` javascript
for (const val of numberReader(1000)) {
	console.log(val);
}
```

## Pipe

Readers have a `pipe` method that lets you pipe them into a writer:

``` javascript
reader.pipe(writer)
```

For example we can output the odd numbers up to 100 to the console by piping the number reader to the console device:

``` javascript
numberReader(100).filter(n => {
	return n % 2; // keep only odd numbers
}).pipe(fst.devices.console.log);
```

Note that `pipe` is also a reducer. So you can schedule operations which will be executed after the pipe has been fully processed.

A major difference with standard node streams is that `pipe` operations only appear once in a chain, at the end, instead of being inserted between processing steps. 
The f-streams `pipe` does not return a reader. 
Instead it returns its writer argument, so that you can chain other operations on the writer itself. 
Here is a typical use:

``` javascript
var result = numberReader(100).map(function(n) {
	return n + ' ';
}).pipe(fst.devices.string.writer()).toString();
```

In this example, the integers are mapped to strings which are written to an in-memory string writer. The string writer is returned by the `pipe` call and we obtain its contents by applying `toString()`.

## Infinite streams

You can easily create an infinite stream. For example, here is a reader stream that will return all numbers (*) in sequence:

``` javascript
var infiniteReader = function() {
	var i = 0;
	return fst.devices.generic.reader(function read() {
		return i++;
	});
};
```
(\*): not quite as `i++` will stop moving when `i` reaches 2**53

F-streams have methods like `skip`, `limit`, `until` and `while` that let you control how many entries you will read, even if the stream is potentially infinite. Here are two examples:

``` javascript
// output 100 numbers after skipping the first 20
infiniteReader().skip(20).limit(100).pipe(fst.devices.console.log);

// output numbers until their square exceeds 1000 
infiniteReader().until(function(n) {
	return n * n > 1000;
}).pipe(fst.devices.console.log);
```

Note: `while` and `until` conditions can also be expressed as mongodb conditions.

## Transformations

The array functions are nice but they have limited power. 
They work well to process stream entries independently from each other but they don't allow us to do more complex operation like combining several entries into a bigger one, or splitting one entry into several smaller ones, or a mix of both. 
This is something we typically do when we parse text streams: we receive chunks of texts; we look for special boundaries and we emit the items that we have isolated between boundaries. 
Usually, there is not a one to one correspondance between the chunks that we receive and the items that we emit.

The `transform` function is designed to handle these more complex operations. 
Typical code looks like:

``` javascript
stream.transform(function(reader, writer) {
	// read items with reader.read()
	// transform them (combine them, split them)
	// write transformation results with writer.write(result)
	// repeat until the end of reader
}).filter(...).map(...).reduce(...);
```

You have complete freedom to organize your read and write calls: you can read several items, combine them and write only one result, you can read one item, split it and write several results, you can drop data that you don't want to transfer, or inject additional data with extra writes, etc.

Also, you are not limited to reading with the `read()` call, you can use any API available on a reader, even another transform. For example, here is how you can implement a simple CSV parser:

``` javascript
var csvParser = function(reader, writer) {
	// get a lines parser from our transforms library
	var linesParser = fst.transforms.lines.parser();
	// transform the raw text reader into a lines reader
	reader = reader.transform(linesParser);
	// read the first line and split it to get the keys
	var keys = reader.read().split(',');
	// read the other lines
	reader.forEach(function(line) {
		// ignore empty line (we get one at the end if file is terminated by newline)
		if (line.length === 0) return;
		// split the line to get the values
		var values = line.split(',');
		// convert it to an object with the keys that we got before
		var obj = {};
		keys.forEach(function(key, i) {
			obj[key] = values[i];
		});
		// send the object downwards.
		writer.write(obj);
	});
};
```

You can then use this transform as:

``` javascript
fst.devices.file.text.reader('mydata.csv').transform(csvParser)
	.pipe(fst.devices.console.log);
```

Note that the transform is written with a `forEach` call which loops through all the items read from the input chain. This may seem incompatible with streaming but it is not. 
This loop advances by executing asynchronous `reader.read()` and `writer.write(obj)` calls. 
So it yields to the event loop and gives it chance to wake up other pending calls at other steps of the chain. 
So, even though the code may look like a tight loop, it is not. 
It gets processed one piece at a time, interleaved with other steps in the chain.

## Transforms library

The `lib/transforms` directory contains standard transforms:

* [`fst.transforms.lines`](lib/transforms/lines.md): simple lines parser and formatter.
* [`fst.transforms.csv`](lib/transforms/csv.md): CSV parser and formatter.
* [`fst.transforms.json`](lib/transforms/json.md): JSON parser and formatter.
* [`fst.transforms.multipart`](lib/transforms/multipart.md): MIME multipart parser and formatter.

For example, you can read from a CSV file, filter its entries and write the output to a JSON file with:

``` javascript
fst.devices.file.text.reader('users.csv').transform(fst.transforms.csv.parser())
	.filter(function(item) {
	return item.gender === 'F';
}).transform(fst.transforms.json.formatter({ space: '\t' }))
	.pipe(fst.devices.file.text.writer('females.json'));
```

The transforms library is rather embryonic at this stage but you can expect it to grow.

## Interoperability with native node.js streams

`f-streams` are fully interoperable with native node.js streams.

You can convert a node.js stream to an _f_ stream:

``` javascript
// converting a node.js readable stream to an f reader
var reader = fst.devices.node.reader(stream);
// converting a node.js writable stream to an f writer
var writer = fst.devices.node.writer(stream);
```

You can also convert in the reverse direction, from an _f_ stream to a node.js stream:

``` javascript
// converting an f reader to a node readable stream
var stream = reader.nodify();
// converting an f writer to a node writable stream
var stream = writer.nodify();
```

And you can transform an _f_ stream with a node duplex stream:

``` javascript
// transforms an f reader into another f reader
reader = reader.nodeTransform(duplexStream)
```

## Lookahead

It is often handy to be able to look ahead in a stream when implementing parsers. 
The reader API does not directly support lookahead but it includes a `peekable()` method which extends the stream with `peek` and `unread` methods:

```
// reader does not support lookahead methods but peekableReader will.
var peekableReader = reader.peekable();
val = peekableReader.peek(); // reads a value without consuming it.
val = peekableReader.read(); // normal read
peekableReader.unread(val); // pushes back val so that it can be read again.
```

## Parallelizing

You can parallelize operations on a stream with the `parallel` call:

``` javascript
reader.parallel(4, function(source) {
	return source.map(fn1).transform(trans1);
}).map(fn2).pipe(writer);
```

In this example the `parallel` call will dispatch the items to 4 identical chains that apply the `fn1` mapping and the `trans1` transform. 
The output of these chains will be merged, passed through the `fn2` mapping and finally piped to `writer`.

You can control the `parallel` call by passing an options object instead of an integer as first parameter. 
The `shuffle` option lets you control if the order of entries is preserved or not. 
By default it is false and the order is preserved but you can get better thoughput by setting `shuffle` to true if order does not matter.

## Fork and join

You can also fork a reader into a set of identical readers that you pass through different chains:

``` javascript
var readers = reader.fork([
	function(source) { return source.map(fn1).transform(trans1); },
	function(source) { return source.map(fn2); },
	function(source) { return source.transform(trans3); },
]).readers;
```

This returns 3 streams which operate on the same input but perform different chains of operations. 
You can then pipe these 3 streams to different outputs. 

Note that you have to use futures (or callbacks) when piping these streams so that they are piped in parallel. 
See the examples in the [`api-test.ts`](https://github.com/Sage/f-streams/blob/master/test/server/api-test.ts) test file for some examples.

You can also `join` the group of streams created by a fork, with a joiner function that defines how entries are dequeued from the group.

``` javascript
var streams = reader.fork([
	function(source) { return source.map(fn1).transform(trans1); },
	function(source) { return source.map(fn2); },
	function(source) { return source.transform(trans3); },
]).join(joinerFn).map(fn4).pipe(writer);
```

This part of the API is still fairly experimental and may change a bit.

## Exception handling

Exceptions are propagated through the chains and you can trap them in the reducer which pulls the items from the chain. 
You can naturally use try/catch:

``` javascript
try {
	fst.devices.file.text.reader('users.csv').transform(fst.transforms.csv.parser())
		.filter(function(item) {
		return item.gender === 'F';
	}).transform(fst.transforms.json.formatter({ space: '\t' }))
		.pipe(fst.devices.file.text.writer('females.json'));
} catch (ex) {
	logger.write(ex);
}
```

## Stopping a stream

Streams are not always consumed in full. 
If a consumer stops reading before it has reached the end of a stream, it must inform the stream that it won't read any further so that the stream can release its resources. 
This is achieved by propagating a `stop` notification upwards, to the source of the stream. 
Streams that wrap node stream will release their event listeners when they receive this notification.

The stop API is a simple `stop` method on readers:

``` javascript
reader.stop(arg); // arg is optional - see below
```

Stopping becomes a bit tricky when a stream has been forked or teed. 
The stop API provides 3 options to stop a branch:

* Stopping only the current branch: the notification will be propagated to the fork but not further upwards, unless the other branches have also been stopped. 
This is the default when `arg` is falsy or omitted.
* Stopping the current branch and closing the other branches silently. 
This is achieved by passing `true` as `arg`. 
The consumers of the other branches will receive the `undefined` end-of-stream marker when reading further.
* Stopping the current branch and closing the other branches with an error. 
This is achieved by passing an error object as `arg`. 
The consumers of the other branches will get this error when reading further.

Note: In the second and third case values which had been buffered in the other branches before the stop call will still be delivered, before the end-of-stream marker or the error. 
So they may not stop _immediately_.

Operations like `limit`, `while` or `until` send a `stop` notification upwards.

A writer may also decide to stop its stream processing chain. 
If its `write` method throws an exception the current branch will be stopped and the exception will be propagated to other branches. 
A writer may also stop the chain silently by throwing a `new StopException(arg)` where `arg` is the falsy or `true` value which will be propagated towards the source of the chain.

Note: writers also have a `stop` method but this method is only used internally to propagate exceptions in a `tee` or `fork`.


## Writer chaining

You can also chain operations on writers via a special `pre` property. 
For example:

``` javascript
// create a binary file writer
var rawWriter = fst.devices.file.binary.writer("data.gzip");
// create another writer that applies a gzip transform before the file writer
var zipWriter = rawWriter.pre.nodeTransform(zlib.createGzip());
```

All the chainable operations available on readers (`map`, `filter`, `transform`, `nodeTransform`, ...) 
can also be applied to writers through this `pre` property.

Note: the `pre` property was introduced to stress the fact that the operation is applied _before_ 
writing to the original writer, even though it appears _after_ in the chain.

## Backpressure

Backpressure is a non-issue. The f-streams plumbing takes care of the low level pause/resume dance on the reader side, and of the write/drain dance on the write side. 
The event loop takes care of the rest. 
So you don't have to worry about backpressure when writing f-streams code.

Instead of worrying about backpressure, you should worry about buffering. 
You can control buffering on the source side by passing special options to `fst.devices.node.reader(nodeStream, options)`. 
See the [`node-wrappers`](https://github.com/Sage/f-streams/blob/master/lib/node-wrappers.md) documentation (`ReadableStream`) for details. 
You can also control buffering by injecting `buffer(max)` calls into your chains. 
The typical pattern is:

``` javascript
reader.transform(T1).buffer(N).transform(T2).pipe(writer);
```

## Database support

It is easy to interface f-streams with node.js database drivers. 
Database support was bundled with f-streams until version 0.1.6 but it is now provided through separate node.js packages. 
The following packages are published to NPM:

* [f-mongodb](https://github.com/Sage/f-mongodb): MongoDB native driver
* [f-mysql](https://github.com/Sage/f-mysql): MySQL driver
* [f-oracle](https://github.com/Sage/f-oracle): node-oracle driver
* [f-tedious](https://github.com/Sage/f-tedious): Microsoft SQL Server _tedious_ driver

## API

See the [API reference](API.md).

## More information

The following blog article gives background information on this API design:

* [Easy node.js streams](http://bjouhier.wordpress.com/2013/12/17)

# License

This work is licensed under the terms of the [MIT license](http://en.wikipedia.org/wiki/MIT_License).
