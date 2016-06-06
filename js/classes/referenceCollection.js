"use strict";
var underscore_1 = require("underscore");
var ReferenceCollection = (function () {
    function ReferenceCollection(id) {
        this.id = id;
        this.anchors = [];
        this.subcollections = [];
    }
    ReferenceCollection.prototype.addAnchor = function (anchor) {
        var existing = underscore_1.findWhere(this.anchors, { id: anchor.id });
        if (existing) {
            throw new Error("Cannot add anchor '" + anchor.id + "' from " + anchor.file + ":" + anchor.line + " to " + this.id + "because it was already defined at " + existing.file + ":" + existing.line);
        }
        this.anchors.push(anchor);
    };
    ReferenceCollection.prototype.addSubcollection = function (collection) {
        var existingAnchor = underscore_1.findWhere(this.anchors, { id: collection.id });
        if (existingAnchor) {
            throw new Error("Cannot add collection '" + collection.id + "because it was already defined as an anchor " + existingAnchor.file + ":" + existingAnchor.line);
        }
        var existingCollection = underscore_1.findWhere(this.anchors, { id: collection.id });
        if (existingCollection) {
            throw new Error("Cannot add collection '" + collection.id + "because it was already defined as a subcollection of '" + collection.id + "'");
        }
        this.subcollections.push(collection);
    };
    return ReferenceCollection;
}());
exports.ReferenceCollection = ReferenceCollection;
