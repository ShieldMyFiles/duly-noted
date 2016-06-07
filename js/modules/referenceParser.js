"use strict";
var referenceCollection_1 = require("../classes/referenceCollection");
var fs_1 = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var XRegExp = require("xregexp");
var lineReader = require("line-reader");
var Q = require("q");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::ReferenceParser");
var ReferenceParser = (function () {
    function ReferenceParser(files, commentRegExp, anchorRegExp, longCommentOpenRegExp, longCommentCloseRegExp, outputDir) {
        logger.debug("ready");
        this.outputDir = outputDir;
        this.files = files;
        this.rootCollection = new referenceCollection_1.ReferenceCollection("root");
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.longCommentOpenRegExp = longCommentOpenRegExp;
        this.longCommentCloseRegExp = longCommentCloseRegExp;
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
                resolve(that.rootCollection);
            });
        });
    };
    ReferenceParser.prototype.parseFile = function (fileName) {
        var that = this;
        var insideLongComment = false;
        return Q.Promise(function (resolve, reject) {
            logger.info("Working on file: " + fileName);
            that.file = {
                name: fileName,
                lines: [],
                type: "notSure"
            };
            var lineNumber = 0;
            lineReader.eachLine(fileName, function (line, last) {
                logger.info("Parsing line: " + lineNumber);
                var thisLine = {
                    number: lineNumber
                };
                that.file.lines.push(thisLine);
                var longCommentStart = line.search(that.longCommentOpenRegExp);
                if (!insideLongComment && longCommentStart === 0) {
                    insideLongComment = true;
                    that.file.lines[lineNumber].longComment = true;
                }
                if (!insideLongComment) {
                    var commentStart = line.search(that.commentRegExp);
                    if (commentStart > -1) {
                        that.file.lines[lineNumber].comment = line.substr(commentStart);
                        that.file.lines[lineNumber].code = line.substr(0, commentStart - 1);
                        that.parseComment(line.substr(commentStart), fileName, lineNumber)
                            .then(function () {
                            if (last) {
                                that.writeOutFile()
                                    .then(function () {
                                    resolve(null);
                                    return false;
                                })
                                    .catch(function (err) {
                                    logger.fatal(err.message);
                                });
                            }
                        });
                    }
                    else {
                        that.file.lines[lineNumber].code = line;
                        if (last) {
                            that.writeOutFile()
                                .then(function () {
                                resolve(null);
                                return false;
                            })
                                .catch(function (err) {
                                logger.fatal(err.message);
                            });
                        }
                    }
                }
                else {
                    that.file.lines[lineNumber].comment = line;
                    that.parseComment(line, fileName, lineNumber)
                        .then(function () {
                        if (last) {
                            that.writeOutFile()
                                .then(function () {
                                resolve(null);
                                return false;
                            })
                                .catch(function (err) {
                                logger.fatal(err.message);
                            });
                        }
                    });
                }
                if (insideLongComment) {
                    var longCommentEnd = line.search(that.longCommentCloseRegExp);
                    if (longCommentEnd > -1) {
                        insideLongComment = false;
                    }
                }
                lineNumber++;
            });
        });
    };
    ReferenceParser.prototype.writeOutFile = function () {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Saving output for: " + that.file.name);
            var filePathArray = path.join(that.outputDir, that.file.name + ".json").split("/");
            filePathArray.pop();
            var filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    fs_1.writeFileSync(path.join(that.outputDir, that.file.name + ".json"), JSON.stringify(that.file), { flag: "w" });
                    resolve(null);
                }
            });
        });
    };
    ReferenceParser.prototype.parseLine = function (line, fileName, lineNumber, insideLongComment) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            var commentStart = line.search(that.commentRegExp);
        });
    };
    ReferenceParser.prototype.parseComment = function (comment, fileName, lineNumber) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            var pos = 0;
            var match;
            while (match = XRegExp.exec(comment, that.anchorRegExp, pos, false)) {
                logger.debug("found anchor: " + match[1]);
                var parts = match[1].split("/");
                that.rootCollection.addAnchorTag(parts, fileName, lineNumber);
                resolve(null);
                pos = match.index + match[0].length;
            }
            resolve(null);
        });
    };
    ;
    return ReferenceParser;
}());
exports.ReferenceParser = ReferenceParser;
