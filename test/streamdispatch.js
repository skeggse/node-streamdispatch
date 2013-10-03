var expect = require('expect.js');
var Dispatch = require('..');

function tosser(error) {
  return function() {
    throw new Error(error);
  }
}

describe('streamdispatch', function() {
  var stream, toss = tosser('not supposed to happen');
  beforeEach(function() {stream = new Dispatch()});

  describe('#write', function() {
    var entries = [{hello: true}, {creamy: 'center'}, {goodbye: true}], id;

    beforeEach(function() {id = 0;});

    function writeAll() {
      for (var i = 0; i < entries.length; ) {
        stream.write(entries[i++]);
      }
    }

    function writeEvery() {
      for (var i = 0; i < entries.length; ) {
        stream.write(entries[i++]);
        expect(id).to.equal(i);
      }
    }

    function register(n) {
      stream.register(function(entry, callback) {
        expect(entry).to.equal(entries[typeof n === 'number' ? n : id]);id++;
      });
    }

    it('should capture in empty-mode', function() {
      writeAll();
      expect(id).to.equal(0);
      register();
      expect(id).to.equal(3);
    });

    it('should dispatch in single-mode', function() {
      register();
      writeEvery();
    });

    it('should dispatch in reverted single-mode', function() {
      register();
      stream.register(toss);
      stream.unregister(toss);
      writeEvery();
    });

    it('should dispatch in multi-mode', function() {
      register(0);
      register(1);
      register(2);
      writeEvery();
    });

    it('should dispatch in reverted multi-mode', function() {
      register(0);
      register(1);
      register(2);
      stream.register(toss);
      stream.unregister(toss);
      writeEvery();
    });
  });

  describe('#read', function() {
    this.timeout(10);

    var entries = [{hello: true}, {creamy: 'center'}, {goodbye: true}];
    var replies = ['ten', 'nine', 'eight'], id;

    beforeEach(function() {id = 0;});

    function writeAll() {
      for (var i = 0; i < entries.length; i++) {
        stream.write(entries[i]);
      }
    }

    function handleEnd(done) {
      stream.on('data', function(reply) {
        expect(reply).to.equal(replies[id++]);
      });
      stream.on('end', function() {
        expect(id).to.equal(3);
        done();
      });
    }

    it('should resolve in-order', function(done) {
      handleEnd(done);
      stream.register(function(entry, callback) {
        callback(replies[entries.indexOf(entry)]);
      });
      writeAll();
      stream.end();
    });

    it('should resolve out-of-order', function(done) {
      var swap = false;
      handleEnd(done);
      stream.register(function(entry, callback) {
        var reply = replies[entries.indexOf(entry)];
        if (swap === false)
          swap = callback.bind(null, reply);
        else if (swap) {
          callback(reply);
          swap();
          swap = null;
        } else
          callback(reply);
      });
      writeAll();
      stream.end();
    });

    it('should resolve in-order asynchronous', function(done) {
      var offset = 0;
      handleEnd(done);
      stream.register(function(entry, callback) {
        var reply = replies[entries.indexOf(entry)];
        setTimeout(function() {
          callback(reply);
        }, ++offset);
      });
      writeAll();
      stream.end();
    });

    it('should resolve out-of-order asynchronous', function(done) {
      var offset = 0, times = [2, 1, 3];
      handleEnd(done);
      stream.register(function(entry, callback) {
        var reply = replies[entries.indexOf(entry)];
        setTimeout(function() {
          callback(reply);
        }, times[offset++]);
      });
      writeAll();
      stream.end();
    });
  });
});
