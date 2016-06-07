"use strict";
var lineReader = require("line-reader");
var Q = require("q");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::FileParser");
var FileParser = (function () {
    function FileParser(file, commentRegExp, longCommentOpenRegExp, longCommentCloseRegExp) {
        logger.debug("ready");
        this.fileMap = {
            name: file,
            lines: []
        };
    }
    FileParser.prototype.parse = function () {
        var _this = this;
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Starting parse actions for: " + _this.fileMap.name);
            var i = 1;
            lineReader.eachLine(_this.fileMap.name, function (line, last) {
                logger.info("Parsing line: " + i);
                var longCommentStart = line.search(that.longCommentOpenRegExp);
                if (!insideLongComment && longCommentStart === 0) {
                    insideLongComment = true;
                }
                that.parseLine(line, fileName, i, insideLongComment)
                    .then(function (anchors) {
                    if (last) {
                        resolve(null);
                        return false;
                    }
                });
                if (insideLongComment) {
                    var longCommentEnd = line.search(that.longCommentCloseRegExp);
                    if (longCommentEnd > -1) {
                        insideLongComment = false;
                    }
                }
                i++;
            });
        });
    };
    return FileParser;
}());
exports.FileParser = FileParser;
