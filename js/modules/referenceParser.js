"use strict";
var referenceCollection_1 = require("../classes/referenceCollection");
var fileType_1 = require("../helpers/fileType");
var fs_1 = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var XRegExp = require("xregexp");
var lineReader = require("line-reader");
var Q = require("q");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::ReferenceParser");
exports.parseLoc = "duly-noted";
var ReferenceParser = (function () {
    function ReferenceParser(config, logLevel) {
        this.files = config.files;
        this.rootCollection = new referenceCollection_1.ReferenceCollection(exports.parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.commentRegExp = new RegExp(config.commentRegExp);
        this.longCommentOpenRegExp = new RegExp(config.longCommentOpenRegExp);
        this.longCommentLineRegExp = new RegExp(config.longCommentLineRegExp);
        this.longCommentCloseRegExp = new RegExp(config.longCommentCloseRegExp);
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }
    ReferenceParser.prototype.parse = function () {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Starting parse actions for " + that.files.length + " files.");
            var parseActions = [];
            for (var i = 0; i < that.files.length; i++) {
                var fileName = that.files[i].split(".");
                var extension = fileName[fileName.length - 1];
                if (extension === "md") {
                    parseActions.push(that.parseAsMarkdown(that.files[i]));
                }
                else {
                    parseActions.push(that.parseFile(that.files[i]));
                }
            }
            Q.all(parseActions)
                .then(function () {
                logger.debug("Saving out internalReferences.json & externalReferences.json");
                fs_1.writeFileSync(path.join(exports.parseLoc, "internalReferences.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                fs_1.writeFileSync(path.join(exports.parseLoc, "externalReferences.json"), JSON.stringify(that.externalReferences), { flag: "w" });
                resolve(that.rootCollection);
            });
        });
    };
    ReferenceParser.prototype.parseAsMarkdown = function (fileName) {
        logger.debug("parsing markdown file: " + fileName);
        var that = this;
        var file = {
            name: fileName,
            type: "markdown",
            lines: []
        };
        var lineNumber = 0;
        return Q.Promise(function (resolve, reject) {
            lineReader.eachLine(fileName, function (line, last) {
                var thisLine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);
                file.lines[lineNumber].comment = line;
                that.parseComment(file.lines[lineNumber].comment, fileName, lineNumber)
                    .then(function () {
                    if (last) {
                        that.writeOutFile(file)
                            .then(function () {
                            resolve(null);
                            return false;
                        })
                            .catch(function (err) {
                            logger.fatal(err.message);
                        });
                    }
                });
                lineNumber++;
            });
        });
    };
    ReferenceParser.prototype.parseFile = function (fileName) {
        var _this = this;
        logger.debug("parsing code file: " + fileName);
        var that = this;
        var file;
        var insideLongComment = false;
        return Q.Promise(function (resolve, reject) {
            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: fileType_1.getFileType(fileName)
            };
            var lineNumber = 0;
            lineReader.eachLine(fileName, function (line, last) {
                var thisLine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);
                var longCommentOpenMatch = XRegExp.exec(line, that.longCommentOpenRegExp, 0, false);
                if (!insideLongComment && longCommentOpenMatch) {
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }
                if (!insideLongComment) {
                    var match = XRegExp.exec(line, that.commentRegExp, 0, false);
                    if (match) {
                        file.lines[lineNumber].comment = match[1];
                        file.lines[lineNumber].code = line.substr(0, match.index - 1);
                        that.parseComment(file.lines[lineNumber].comment, fileName, lineNumber)
                            .then(function () {
                            if (last) {
                                that.writeOutFile(file)
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
                        file.lines[lineNumber].code = line;
                        if (last) {
                            that.writeOutFile(file)
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
                    if (XRegExp.exec(line, _this.longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = "";
                        insideLongComment = false;
                    }
                    else {
                        file.lines[lineNumber].longComment = true;
                        if (longCommentOpenMatch) {
                            file.lines[lineNumber].comment = longCommentOpenMatch[1].trim();
                        }
                        else {
                            var match = XRegExp.exec(line, _this.longCommentLineRegExp, 0);
                            file.lines[lineNumber].comment = " " + match[1].trim() || line;
                        }
                        that.parseComment(line, fileName, lineNumber)
                            .then(function () {
                            if (last) {
                                that.writeOutFile(file)
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
                    if (last) {
                        that.writeOutFile(file)
                            .then(function () {
                            resolve(null);
                            return false;
                        })
                            .catch(function (err) {
                            logger.fatal(err.message);
                        });
                    }
                }
                lineNumber++;
            });
        });
    };
    ReferenceParser.prototype.writeOutFile = function (file) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            var filePathArray = path.join(exports.parseLoc, file.name + ".json").split("/");
            filePathArray.pop();
            var filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    logger.debug("Saving output for: " + file.name);
                    fs_1.writeFileSync(path.join(exports.parseLoc, file.name + ".json"), JSON.stringify(file), { flag: "w" });
                    resolve(null);
                }
            });
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
