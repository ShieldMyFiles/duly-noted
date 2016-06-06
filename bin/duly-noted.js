#! /usr/bin/env node

var path = require('path');
var fs = require('fs');
var dir = path.join(path.dirname(fs.realpathSync(__filename)), '../js/');
require(dir + 'index.js').run();