var util = require('util'), stream;
try {
  stream = require('readable-stream');
} catch (err) {
  stream = require('stream');
}
var Transform = stream.Transform;

/**
 * An entry in a sorted array.
 *
 * @param {*} item The item.
 * @param {number} value The value.
 * @constructor
 */
function Entry(item, value) {
  this.item = item;
  this.value = value;
}

/**
 * Inserts the provided into the array as an Entry, assuming the array contains
 * only entries.
 *
 * @param {Array.<Entry>} array The array to insert into.
 * @param {*} item The item to insert.
 * @param {number} value The value to sort by.
 */
function sortedInsert(array, item, value) {
  var low = 0, mid, high = array.length;
  while (low < high) {
    mid = (low + high) >>> 1;
    array[mid].value < value ? low = mid + 1 : high = mid;
  }
  array.splice(low, 0, new Entry(item, value));
}

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
  this.nextId = 0;
  this.prevId = 0;
  this.holder = null;
  this.waiting = 0;
  this.handlers = [];
  this.flushing = null;
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
 * @param {function(*, function(*))} handler The handler which takes the entry
 *   and a callback.
 */
function dispatch(self, entry, handler) {
  var id = self.nextId++, done = false;
  self.waiting++;
  handler(entry, function(res) {
    if (self.flushing === true || done)
      return; // could cause some problems
    done = true;
    self.waiting--;
    sortedInsert(self.queue, res, id);
    while (self.queue.length && self.queue[0].value === self.prevId) {
      self.prevId++;
      self.push(self.queue.shift().item);
    }
    if (self.flushing && self.queue.length === 0 && self.waiting === 0) {
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
  if (this.waiting || this.queue.length)
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
