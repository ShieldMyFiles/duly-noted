import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IFile, ILine} from "../classes/IFile";
import {getFileType} from "../helpers/fileType";
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
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentLineRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    outputDir: string;

    constructor(files: string[],
        commentRegExp: RegExp,
        anchorRegExp: RegExp,
        longCommentOpenRegExp: RegExp,
        longCommentLineRegExp: RegExp,
        longCommentCloseRegExp: RegExp,
        outputDir: string) {
        logger.debug("ready");
        this.outputDir = outputDir;
        this.files = files;
        this.rootCollection = new ReferenceCollection(path.basename(this.outputDir));
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.longCommentOpenRegExp = longCommentOpenRegExp;
        this.longCommentLineRegExp = longCommentLineRegExp;
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
                logger.info("Saving out references.json");
                writeFileSync(path.join(that.outputDir, "references.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                resolve(that.rootCollection);
            });
        });
    }

    parseFile(fileName: string): Q.Promise<{}> {
        let that = this;
        let file: IFile;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            // read all lines:
            logger.info("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: getFileType(fileName)
            };

            let lineNumber = 0; // Line numbering traditionally starts at 1
            lineReader.eachLine(fileName, (line, last) => {
                logger.info("Parsing line: " + lineNumber);

                let thisLine: ILine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);

                let longCommentOpenMatch = XRegExp.exec(line, that.longCommentOpenRegExp, 0, false);

                if (!insideLongComment && longCommentOpenMatch) { // These comments must come at beginning of line.
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }

                // Not inside a long comment - look for a regular comment.
                if (!insideLongComment) {
                    let match = XRegExp.exec(line, that.commentRegExp, 0, false);

                    // Contains a tradition comment
                    if (match) {

                        file.lines[lineNumber].comment = match[1];
                        file.lines[lineNumber].code = line.substr(0, match.index - 1);

                        that.parseComment(file.lines[lineNumber].comment, fileName, lineNumber)
                            .then(() => {
                                if (last) {
                                    that.writeOutFile(file)
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
                        file.lines[lineNumber].code = line;
                        if (last) {
                            that.writeOutFile(file)
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
                    // If this line contains a long comment closing symbol, then next line isn't long comment.
                    // let longCommentEnd = line.search(that.longCommentCloseRegExp);
                    if (XRegExp.exec(line, this.longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = "";
                        insideLongComment = false;
                    } else {

                        file.lines[lineNumber].longComment = true;

                        if (longCommentOpenMatch) {
                            file.lines[lineNumber].comment = longCommentOpenMatch[1].trim();
                        } else {
                            let match = XRegExp.exec(line, this.longCommentLineRegExp, 0);
                            file.lines[lineNumber].comment = match[1].trim() || line;
                        }

                        that.parseComment(line, fileName, lineNumber)
                        .then(() => {
                            if (last) {
                                that.writeOutFile(file)
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

                    if (last) {
                        that.writeOutFile(file)
                        .then(() => {
                            resolve(null);
                            return false;
                        })
                        .catch((err) => {
                            logger.fatal(err.message);
                        });
                    }
                }

                lineNumber++;
            });
        });
    }

    writeOutFile(file: IFile) {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let filePathArray = path.join(that.outputDir, file.name + ".json").split("/");
            filePathArray.pop();
            let filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    logger.info("Saving output for: " + file.name);
                    writeFileSync(path.join(that.outputDir, file.name + ".json"), JSON.stringify(file), { flag: "w" });
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
