var events = require('events'),
    util = require('util'),
    smsc = require('../smsc');

var worker = function(id, channel, redis, config) {
    this.super_.call(this);

    this.id = id;
    this.channel = channel;
    this.redis = redis;
    
    this.loadConfig(channel + '.config');
    
    this.redis.on('message', this.message);
    this.on('command', this.command);
    this.on('run', this.run);
    this.on('stop', this.stop);
};
util.inherits(worker, events.EventEmitter);
with(proto: worker.prototype) {
    proto.id = undefined;
    proto.channel = undefined;
    proto.redis = undefined;
    
    proto.loadConfig = function(channel) {
        var config = this.redis.hgetall(channel);
        
        for(var name in config) {
            this[config] = config[name];
        }
    }
    
    proto.command = function(message) {
        switch(message) {
            case 'run':
                this.emit('run');
                break;
            case 'stop':
                this.emit('stop');
                break;
            case 'pause':
                this.emit('pause');
                break;
        }
    
        return this;
    }
    
    proto.run = function() {
        this.subscribe(this.channel);
    
        return this;
    }
    
    proto.stop = function() {
        this.unsubscribe(this.channel);
        this.emit('exit');
    
        return this;
    }
    
    proto.subscribe = function(channel) {
        this.redis.subscribe(channel + '.command');
    }
    
    proto.unsubscribe = function(channel) {
        this.redis.unsubscribe(channel + '.command');
    }
    
    proto.message = function(channel, message) {
        channel = smsc.parseChannel(channel);
        
        if(channel !== undefined) {
            if(channel.zone != 'workers' || channel.id != this.id) {
                return;
            }
            
            if(channel.type !== undefined) {
                this.emit(channel.type, message, channel);
            }
        }
    }
}

module.exports = worker;
