
 <a name="helpers-q-helpers" id="helpers-q-helpers" ></a>[🔗](#user-content-helpers-q-helpers)helpers/q-helpers
# Q Promise Helpers

 [authors/chris](../.././authors.md.md#user-content-authors-chris)
 [license](../.././license.md.md#user-content-license)

See [so/17213297](http://stackoverflow.com/questions/17213297) 

```typescript
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
```