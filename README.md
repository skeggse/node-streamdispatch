node-streamdispatch
===================

A duplex stream dispatcher which preserves order when processing streamed tasks.

This is the promises version, which is simpler in implementation but less node-like.

Install
=======

```sh
$ npm install streamdispatch
```

Test
====

Any of the following will run the tests.

```sh
$ mocha
$ npm test
$ make test
```

Usage
=====

Pipe data to and from the dispatcher, and it will dispatch each object to a handler, then put the result of the operation back into the stream in-order.

```js
var Dispatch = require('streamdispatch');

var dispatch = new Dispatch();

src.pipe(dispatch).pipe(dest);

dispatch.register(function(data) {
  // use whatever Promises/A framework you want
  var deferred = when.defer();
  // transform the data, synchronously or asynchronously. if the operation is
  // guaranteed synchronous, then this module is probably not for you
  return deferred.promise;
});
```

This stream is an object stream, meaning that it deals not with Buffers and raw data, but instead of contiguous Objects--these Objects will not mutate as part of the stream, but cannot be sent across a raw stream directly.

Multiple Handlers
-----------------

Dispatch will dispatch data fairly to multiple handlers, using a round-robin queue.

If you find a use for this, let me know...it won't slow you down to have this feature, though.

```js
var Dispatch = require('streamdispatch');

var dispatch = new Dispatch();

src.pipe(dispatch).pipe(dest);

dispatch.register(function(data) {
  var deferred = when.defer();
  // handle the data!
  return deferred.promise;
});

dispatch.register(function(data) {
  var deferred = when.defer();
  // handle the data in some other way (will still be from the same stream)
  return deferred.promise;
});
```

Unlicense / Public Domain
=========================

> This is free and unencumbered software released into the public domain.

> Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.

> In jurisdictions that recognize copyright laws, the author or authors of this software dedicate any and all copyright interest in the software to the public domain. We make this dedication for the benefit of the public at large and to the detriment of our heirs and successors. We intend this dedication to be an overt act of relinquishment in perpetuity of all present and future rights to this software under copyright law.

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

> For more information, please refer to <[http://unlicense.org/](http://unlicense.org/)>
