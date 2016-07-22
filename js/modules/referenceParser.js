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
        this.rootCollection = new referenceCollection_1.ReferenceCollection(exports.parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        var commentPatternsFile = path.join(__dirname, "../../bin/comment-patterns.json");
        logger.debug("Loading Comment Patterns from " + commentPatternsFile);
        this.commentPatterns = JSON.parse(fs_1.readFileSync(commentPatternsFile).toString());
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }
    ReferenceParser.prototype.parse = function (files) {
        var that = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Starting parse actions for " + files.length + " files.");
            var parseActions = [];
            for (var i = 0; i < files.length; i++) {
                var fileName = files[i].split(".");
                var extension = fileName[fileName.length - 1];
                if (extension === "md") {
                    parseActions.push(that.parseAsMarkdown(files[i]));
                }
                else {
                    parseActions.push(that.parseFile(files[i]));
                }
            }
            Q.all(parseActions)
                .then(function () {
                logger.debug("Saving out internalReferences.json & externalReferences.json");
                fs_1.writeFileSync(path.join(exports.parseLoc, "internalReferences.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                fs_1.writeFileSync(path.join(exports.parseLoc, "externalReferences.json"), JSON.stringify(that.externalReferences), { flag: "w" });
                resolve(that.rootCollection);
            })
                .catch(function (err) {
                logger.error(err.message + err.stack);
                reject(err);
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
                            reject(err);
                        });
                    }
                });
                lineNumber++;
            });
        });
    };
    ReferenceParser.prototype.parseFile = function (fileName) {
        logger.debug("parsing code file: " + fileName);
        var that = this;
        var file;
        var insideLongComment = false;
        return Q.Promise(function (resolve, reject) {
            var commentRegExp;
            var longCommentOpenRegExp;
            var longCommentLineRegExp;
            var longCommentCloseRegExp;
            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: fileType_1.getFileType(fileName)
            };
            if (that.commentPatterns[file.type]) {
                logger.debug("Using comment pattern for " + file.type);
                commentRegExp = new RegExp(that.commentPatterns[file.type]["commentRegExp"]);
                if (that.commentPatterns[file.type]["longCommentOpenRegExp"])
                    longCommentOpenRegExp = new RegExp(that.commentPatterns[file.type]["longCommentOpenRegExp"]);
                else
                    longCommentOpenRegExp = undefined;
                if (that.commentPatterns[file.type]["longCommentLineRegExp"])
                    longCommentLineRegExp = new RegExp(that.commentPatterns[file.type]["longCommentLineRegExp"]);
                else
                    longCommentLineRegExp = undefined;
                if (that.commentPatterns[file.type]["longCommentCloseRegExp"])
                    longCommentCloseRegExp = new RegExp(that.commentPatterns[file.type]["longCommentCloseRegExp"]);
                else
                    longCommentLineRegExp = undefined;
            }
            else {
                logger.debug("Using default comment pattern.");
                commentRegExp = new RegExp(that.commentPatterns["default"]["commentRegExp"]);
                longCommentOpenRegExp = new RegExp(that.commentPatterns["default"]["longCommentOpenRegExp"]);
                longCommentLineRegExp = new RegExp(that.commentPatterns["default"]["longCommentLineRegExp"]);
                longCommentCloseRegExp = new RegExp(that.commentPatterns["default"]["longCommentCloseRegExp"]);
            }
            var lineNumber = 0;
            lineReader.eachLine(fileName, function (line, last) {
                var thisLine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);
                var longCommentOpenMatch;
                if (longCommentOpenRegExp) {
                    longCommentOpenMatch = XRegExp.exec(line, longCommentOpenRegExp, 0, false);
                }
                else {
                    longCommentOpenMatch = false;
                }
                if (!insideLongComment && longCommentOpenMatch) {
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }
                if (!insideLongComment) {
                    var match = XRegExp.exec(line, commentRegExp, 0, false);
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
                                    reject(err);
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
                                reject(err);
                            });
                        }
                    }
                }
                else {
                    file.lines[lineNumber].longComment = true;
                    if (longCommentOpenMatch) {
                        file.lines[lineNumber].comment = longCommentOpenMatch[1];
                    }
                    else {
                        var match = XRegExp.exec(line, longCommentLineRegExp, 0);
                        if (match && match[1]) {
                            file.lines[lineNumber].comment = match[1];
                        }
                        else {
                            file.lines[lineNumber].comment = "";
                        }
                    }
                    if (XRegExp.exec(line, longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = file.lines[lineNumber].comment.replace(longCommentCloseRegExp, "");
                        insideLongComment = false;
                    }
                    ;
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
                                reject(err);
                            });
                        }
                    });
                    if (last) {
                        that.writeOutFile(file)
                            .then(function () {
                            resolve(null);
                            return false;
                        })
                            .catch(function (err) {
                            logger.fatal(err.message);
                            reject(err);
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
