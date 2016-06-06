"use strict";
var Q = require("q");
function doNext(fn) {
    var args = Array.prototype.splice.call(arguments, 1);
    return function (prevRetVal) {
        return fn.apply(null, args);
    };
}
exports.doNext = doNext;
;
function doInOrder(doNexters, init) {
    return doNexters.reduce(Q.when, init);
}
exports.doInOrder = doInOrder;
;
