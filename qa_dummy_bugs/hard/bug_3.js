// Hard Bug 3
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
myEmitter.emit('error', new Error('EADDRINUSE: address already in use :::8080'));