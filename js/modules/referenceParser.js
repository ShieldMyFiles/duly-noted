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
var ReferenceParser = (function () {
    function ReferenceParser(files, commentRegExp, anchorRegExp, longCommentOpenRegExp, longCommentLineRegExp, longCommentCloseRegExp, outputDir) {
        logger.debug("ready");
        this.outputDir = outputDir;
        this.files = files;
        this.rootCollection = new referenceCollection_1.ReferenceCollection(path.basename(this.outputDir));
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.longCommentOpenRegExp = longCommentOpenRegExp;
        this.longCommentLineRegExp = longCommentLineRegExp;
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
                logger.info("Saving out references.json");
                fs_1.writeFileSync(path.join(that.outputDir, "references.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                resolve(that.rootCollection);
            });
        });
    };
    ReferenceParser.prototype.parseFile = function (fileName) {
        var _this = this;
        var that = this;
        var file;
        var insideLongComment = false;
        return Q.Promise(function (resolve, reject) {
            logger.info("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: fileType_1.getFileType(fileName)
            };
            var lineNumber = 0;
            lineReader.eachLine(fileName, function (line, last) {
                logger.info("Parsing line: " + lineNumber);
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
                            file.lines[lineNumber].comment = match[1].trim() || line;
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
            var filePathArray = path.join(that.outputDir, file.name + ".json").split("/");
            filePathArray.pop();
            var filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    logger.info("Saving output for: " + file.name);
                    fs_1.writeFileSync(path.join(that.outputDir, file.name + ".json"), JSON.stringify(file), { flag: "w" });
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
