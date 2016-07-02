/** !helpers/q-helpers
 * # Q Promise Helpers
 * 
 * @authors/chris
 * @license
 * 
 * See @so/17213297
 */
import Q = require("q");

export function doNext(fn) {
    let args = Array.prototype.splice.call(arguments, 1);
    return function(prevRetVal) {
        return fn.apply(null, args);
    };
};

export function doInOrder(doNexters, init?) {
    return doNexters.reduce(Q.when, init);
};