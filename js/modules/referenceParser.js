"use strict";
var referenceCollection_1 = require("../classes/referenceCollection");
var log4js = require("log4js");
var XRegExp = require("xregexp");
var lineReader = require("line-reader");
var Q = require("q");
var logger = log4js.getLogger("duly-noted::ReferenceParser");
var ReferenceParser = (function () {
    function ReferenceParser(files, commentRegExp, anchorRegExp) {
        logger.debug("ready");
        this.files = files;
        this.rootCollection = new referenceCollection_1.ReferenceCollection("root");
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.anchors = [];
    }
    ReferenceParser.prototype.parse = function () {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Starting parse actions for " + that.files.length + "files.");
            var parseActions = [];
            for (var i = 0; i < that.files.length; i++) {
                parseActions.push(that.parseFile(that.files[i]));
            }
            Q.all(parseActions)
                .then(function () {
                resolve(that.anchors);
            });
        });
    };
    ReferenceParser.prototype.parseFile = function (fileName) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Working on file: " + fileName);
            var i = 0;
            lineReader.eachLine(fileName, function (line, last) {
                console.info("Parseing line: " + i);
                that.parseLine(line)
                    .then(function (anchors) {
                    if (last) {
                        resolve(null);
                        return false;
                    }
                });
                i++;
            });
        });
    };
    ReferenceParser.prototype.parseLine = function (line) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            var commentStart = line.search(that.commentRegExp);
            if (commentStart > -1) {
                logger.debug("found comment: " + line.substr(commentStart));
                that.parseComment(line.substr(commentStart))
                    .then(function () {
                    resolve(null);
                });
            }
            else {
                resolve(null);
            }
        });
    };
    ReferenceParser.prototype.parseComment = function (comment) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            var pos = 0;
            var match;
            while (match = XRegExp.exec(comment, that.anchorRegExp, pos, false)) {
                logger.debug("found anchor: " + match[0]);
                that.anchors.push(match[0]);
                pos = match.index + match[0].length;
            }
            resolve(null);
        });
    };
    ;
    return ReferenceParser;
}());
exports.ReferenceParser = ReferenceParser;
