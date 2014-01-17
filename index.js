#!/bin/env node

var smsc = require('smsc'),
    optimist = require('optimist');

var args = optimist
    .usage('Usage: $0 [--verbose]')
    .describe('verbose', 'Output all log messages')
    .default('verbose', false)
    .argv;

return smsc.init()
    .run();
