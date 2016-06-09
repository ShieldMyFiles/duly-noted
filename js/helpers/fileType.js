"use strict";
function getFileType(fileName) {
    var parsed = fileName.split(".");
    var extension = parsed[parsed.length - 1];
    switch (extension) {
        case "ts":
            return "typescript";
        case "js":
            return "javascript";
        default:
            return "plain/text";
    }
}
exports.getFileType = getFileType;
