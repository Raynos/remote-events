var EventEmitter = require('events').EventEmitter
var es = require('event-stream')

module.exports = RemoteEventEmitter

function RemoteEventEmitter (opts) {
  EventEmitter.call(this)
  this.buffer = []
  //XXX RemoteEventEmitters start off disconnected!
  //THIS IS MORE REALISTIC
  //REMEMBER to call connect() !
  this.connected = false
  var self = this
  this.on('connect', this.flush.bind(this))
}

var ree = RemoteEventEmitter.prototype = new EventEmitter ()

ree.flush = function () {
  while(this.buffer.length && this.connected) 
    this.emit.apply(this, this.buffer.shift()) 
}

ree.getStream = function () {
  if (this.stream && !this.stream.ended)
    return this.stream
  var self = this
  this.stream = es.through(function (data) {
   self.localEmit.apply(self, data)
  }, function () {  
    this.emit('end')
    self.disconnect()
  })
  this.stream.once('close', function () {
    self.disconnect()
  })
  var pipe = this.stream.pipe
  this.stream.pipe = function (other, opts) {
    var r = pipe.call(this, other, opts)
    process.nextTick(function () {
      self.connected = true
      self.localEmit('connect')
    })
    return r
  }
  //return es.through()
//  return es.through()
  return this.stream
}

/*
ree.connect = function () {
  if(this.connected) return
  this.localEmit('connect')

*/

ree.disconnect = function () {
  if(!this.connected) return
  this.connected = false
  this.stream.destroy()
  this.stream = null
  this.localEmit('disconnect')
}

ree.emit = function () {
  var args = [].slice.call(arguments)
  if(this.connected)
    return this.stream.emit('data', args)
  else
    this.buffer.push(args)
}

/*
  sometimes you need to access this, so I'm not using
  _emit ... that means this is a part of the API.
  
*/
ree.localEmit = function () {
  var args = [].slice.call(arguments)
  return EventEmitter.prototype.emit.apply(this, args)
}
