var util = require('util'), stream;
try {
  stream = require('readable-stream');
} catch (err) {
  stream = require('stream');
}
var Transform = stream.Transform;

/**
 * A stream dispatcher for orderly dispatch of object-based stream entities.
 *
 * Each registered handler will deceive an equal distribution of incoming stream
 * entities.
 *
 * @constructor
 * @extends Transform
 */
function StreamDispatch() {
  if (!(this instanceof StreamDispatch))
    return new StreamDispatch();

  Transform.call(this, {objectMode: true});

  this.queue = [];
  this.holder = null;
  this.handlers = [];
  this.flushing = null;
  this.resolving = false;
}

util.inherits(StreamDispatch, Transform);

/**
 * Register one handler.
 *
 * @param {function(Object, callback)} handler The handler to register.
 * @public
 */
StreamDispatch.prototype.register = function(handler) {
  this.handlers.push(handler);
  if (this.handlers.length === 1)
    this._write = oneHandler;
  else if (this.handlers.length === 2)
    this._write = manyHandler;
  var holder = this.holder;
  if (holder) {
    this.holder = null;
    this._write.apply(this, holder);
  }
};

/**
 * Unregisters the handler.
 *
 * @param {function(Object, callback)} handler The handler to unregister.
 * @public
 */
StreamDispatch.prototype.unregister = function(handler) {
  var index = this.handlers.indexOf(handler);
  if (~index) {
    this.handlers.splice(index, 1);
    if (this.handlers.length === 0)
      this._write = noHandler;
    else if (this.handlers.length === 1)
      this._write = oneHandler;
  }
};

/**
 * Dispatches the given entry to the handler with a callback.
 *
 * @param {StreamDispatch} self The pseudo-this object.
 * @param {*} entry The stream entry.
 * @param {function(*): Promise} handler The handler which takes the entry and
 * returns a response promise.
 */
function dispatch(self, entry, handler) {
  var res = handler(entry);
  self.queue.push(res);
  resolve(self);
}

/**
 * Resolves the entries in the queue in-order until there are none left.
 *
 * Precondition: the queue has at least one element.
 *
 * @param {StreamDispatch} self The pseudo-this object.
 */
function resolve(self) {
  if (self.resolving)
    return;
  self.resolving = true;
  self.queue.shift().then(function(value) {
    if (self.flushing === true)
      return;
    self.push(value);
    self.resolving = false;
    if (self.queue.length)
      resolve(self);
    else if (self.flushing) {
      self.flushing.call(null);
      self.flushing = true;
    }
  });
}

/**
 * Handle the transform of another data part. Changes based on the number of
 * registered handlers.
 *
 * @param {*} entry The stream entry.
 * @param {null} encoding The null encoding, because no objectMode.
 * @param {function(?Error)} callback The callback function for the data part.
 * @private
 */
StreamDispatch.prototype._transform = noHandler;

/**
 * Handle the flushing of all remaining entities.
 *
 * @param {function()} callback The callback when finished flushing.
 * @private
 */
StreamDispatch.prototype._flush = function(callback) {
  if (this.resolving || this.queue.length)
    this.flushing = callback;
  else {
    this.flushing = true;
    callback();
  }
};

/**
 * Handle the transform of a data part when there are no handlers. Assumes the
 * _transform method of a stream will not be invoked multiple times without
 * callback.
 *
 * @param {*} entry The stream entry.
 * @param {null} encoding The null encoding, because no objectMode.
 * @param {function(?Error)} callback The callback function for the data part.
 * @this {StreamDispatch}
 * @private
 */
function noHandler(entry, encoding, callback) {
  this.holder = arguments;
}

/**
 * Handle the transform of a data part when there is one handler.
 *
 * @param {*} entry The stream entry.
 * @param {null} encoding The null encoding, because no objectMode.
 * @param {function(?Error)} callback The callback function for the data part.
 * @this {StreamDispatch}
 * @private
 */
function oneHandler(entry, encoding, callback) {
  dispatch(this, entry, this.handlers[0]);
  callback();
}

/**
 * Handle the transform of a data part when there are many handlers.
 *
 * @param {*} entry The stream entry.
 * @param {null} encoding The null encoding, because no objectMode.
 * @param {function(?Error)} callback The callback function for the data part.
 * @this {StreamDispatch}
 * @private
 */
function manyHandler(entry, encoding, callback) {
  var handler = this.handlers.shift();
  this.handlers.push(handler);
  dispatch(this, entry, handler);
  callback();
}

module.exports = StreamDispatch;
