import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IFile, ILine} from "../classes/IFile";
import {writeFileSync, mkdirSync, accessSync, F_OK, openSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import XRegExp = require("xregexp");
import lineReader = require("line-reader");
import Q = require("q");
import {doInOrder, doNext} from "../helpers/helpers";

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceParser");

export interface IReferenceParser {
    files: string[];
    parse(): any;
}

export class ReferenceParser implements IReferenceParser {
    files: string[];
    file: IFile;
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    outputDir: string;

    constructor(files: string[],
                commentRegExp: RegExp,
                anchorRegExp: RegExp,
                longCommentOpenRegExp: RegExp,
                longCommentCloseRegExp: RegExp,
                outputDir: string) {
        logger.debug("ready");
        this.outputDir = outputDir;
        this.files = files;
        this.rootCollection = new ReferenceCollection("root");
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.longCommentOpenRegExp = longCommentOpenRegExp;
        this.longCommentCloseRegExp = longCommentCloseRegExp;
    }

    public parse(): Q.Promise<IReferenceCollection> {
        let that = this;
        return Q.Promise<IReferenceCollection>((resolve, reject) => {
            logger.info("Starting parse actions for " + that.files.length + "files.");

            let parseActions = [];

            for (let i = 0; i < that.files.length; i++) {
                 parseActions.push(that.parseFile(that.files[i]));
            }

            Q.all(parseActions)
            .then(() => {
                resolve(that.rootCollection);
            });
       });
    }

    parseFile(fileName: string): Q.Promise<{}> {
        let that = this;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            // read all lines:
            logger.info("Working on file: " + fileName);
            that.file = {
                name: fileName,
                lines: [],
                type: "notSure"
            };

            let lineNumber = 0; // Line numbering traditionally starts at 1
            lineReader.eachLine(fileName, (line, last) => {
                logger.info("Parsing line: " + lineNumber);

                let thisLine: ILine = {
                    number: lineNumber
                };
                that.file.lines.push(thisLine);

                let longCommentStart = line.search(that.longCommentOpenRegExp);

                if (!insideLongComment && longCommentStart === 0) { // These comments must come at beginning of line.
                    insideLongComment = true;
                    that.file.lines[lineNumber].longComment = true;
                }

                // Not inside a long comment - look for a regular comment.
                if (!insideLongComment) {
                    let commentStart = line.search(that.commentRegExp);

                    // Contains a tradition comment
                    if (commentStart > -1) {

                        that.file.lines[lineNumber].comment = line.substr(commentStart);
                        that.file.lines[lineNumber].code = line.substr(0, commentStart - 1);

                        that.parseComment(line.substr(commentStart), fileName, lineNumber)
                        .then(() => {
                            if (last) {
                                that.writeOutFile()
                                .then(() => {
                                    resolve(null);
                                    return false;
                                })
                                .catch((err) => {
                                    logger.fatal(err.message);
                                });
                            }
                        });
                    // Not a comment (code only)
                    } else {
                        that.file.lines[lineNumber].code = line;
                        if (last) {
                            that.writeOutFile()
                            .then(() => {
                                resolve(null);
                                return false;
                            })
                            .catch((err) => {
                                logger.fatal(err.message);
                            });
                        }
                    }
                } else { // Inside a long comment - so the whole thing is a comment
                    that.file.lines[lineNumber].comment = line;
                    that.parseComment(line, fileName, lineNumber)
                    .then(() => {
                        if (last) {
                            that.writeOutFile()
                            .then(() => {
                                resolve(null);
                                return false;
                            })
                            .catch((err) => {
                                logger.fatal(err.message);
                            });
                        }
                    });
                }

                // If this line contains a long comment closing symbol, then next line isn't long comment.
                if (insideLongComment) {
                    let longCommentEnd = line.search(that.longCommentCloseRegExp);
                    if (longCommentEnd > -1) {
                        insideLongComment = false;
                    }
                }

                lineNumber++;
            });
        });
    }

    writeOutFile() {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            logger.info("Saving output for: " + that.file.name);
            let filePathArray = path.join(that.outputDir, that.file.name + ".json").split("/");
            filePathArray.pop();
            let filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    writeFileSync(path.join(that.outputDir, that.file.name + ".json"), JSON.stringify(that.file), {flag: "w"});
                    resolve(null);
                }
            });
        });
    }

    parseLine(line: string, fileName: string, lineNumber: number, insideLongComment: boolean): Q.Promise<{}> {
        let that = this;
        return Q.Promise<string[]>((resolve, reject) => {
            let commentStart = line.search(that.commentRegExp);
        });
    }

    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}> {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let pos = 0;
            let match;

            while (match = XRegExp.exec(comment, that.anchorRegExp, pos, false)) {
                logger.debug("found anchor: " + match[1]);

                let parts = match[1].split("/");

                that.rootCollection.addAnchorTag(parts, fileName, lineNumber);
                resolve(null);
                pos = match.index + match[0].length;
            }
            resolve(null);
        });
    };
}
