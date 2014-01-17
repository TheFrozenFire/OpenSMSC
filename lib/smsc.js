var cluster = require('cluster'),
    events = require('events'),
    redis = require('redis'),
    util = require('util'),
    smpp_worker = require('./smsc/worker/smpp');

var smsc = function() {
    cluster.apply(this, arguments);
};
util.inherits(smsc, cluster);
util.inherits(smsc, events.EventEmitter);
with ({proto: smsc.prototype}) {
    proto.WORKERTYPE_SMPP = 'smpp';
    
    proto.redis = undefined;
    
    proto.mainChannel = 'smsc';
    
    proto.init = function() {
        this.redis = redis.createClient();
        this.redis.on('message', this.handleRedisMessage);
        return this;
    }
    
    proto.run = function() {
        if(this.isMaster) {
            var workers = this.getWorkers();
        
            if(workers.length >= 1) {
                for(var id in workers) {
                    var workerType = workers[id];
                
                    cluster.fork({
                        SMSC_WORKER_ID: id,
                        SMSC_WORKER_TYPE: workerType
                    });
                }
            }
        } else {
            var worker = this.createWorker(process.env.SMSC_WORKER_ID, process.env.SMSC_WORKER_TYPE);
            
            if(worker !== undefined) {
                worker.on('exit', this.stop);
                return worker.run(this.mainChannel + '.workers.' + worker.id);
            }
        }
        
        return 127; // Nothing to execute
    }
    
    proto.stop = function() {
        if(this.isMaster) {
            var workers = this.getWorkers();
            for(var id in workers) {
                this.redis.publish(this.mainChannel + '.workers.' + id + '.command', 'stop');
            }
        }
        this.redis.quit();
        process.exit(0);
    }
    
    proto.getWorkers = function() {
        return this.redis.hgetall(this.mainChannel + '.workers');
    }
    
    proto.createWorker = function(id, type) {
        var worker,
            config = {};
        
        switch(type) {
            case this.WORKERTYPE_SMPP:
                config = this.getWorkerConfig(id);
            
                worker = new smpp_worker(id, this.mainChannel + '.workers.' + id, redis);
                break;
        }
        
        return worker;
    }
    
    proto.parseChannel = function(channel) {
        var channelParts = channel.split('.');
        
        if(channelParts[0] != this.mainChannel) {
            return;
        }
        
        return {
            main_channel: channelParts[0],
            zone: channelParts[1],
            id: channelParts[2],
            type: channelParts[3],
            remainder: channelParts.slice(4)
        };
    }
}

module.exports = smsc;
