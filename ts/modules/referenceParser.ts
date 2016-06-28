/**
 * # !ReferenceParser
 *  @authors/chris
 *  @license
 */

import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IConfig, IExternalReference} from "../classes/IConfig";
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

/**
 * ## !interfaces/IReferenceParser
 */
export interface IReferenceParser {
    parse(): Q.Promise<IReferenceCollection>;
}

/**
 * ## !constant/parseLoc
 */
export const parseLoc = "duly-noted";

/**
 * ## !classes/ReferenceParser
 */
export class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentLineRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    externalReferences: IExternalReference[];

    /**
     * ### Creates an instance of @classes/ReferenceParser
     */
    constructor(config: IConfig, logLevel?: string) {
        this.files = config.files;
        this.rootCollection = new ReferenceCollection(parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.commentRegExp = new RegExp(config.commentRegExp);
        this.longCommentOpenRegExp = new RegExp(config.longCommentOpenRegExp);
        this.longCommentLineRegExp = new RegExp(config.longCommentLineRegExp);
        this.longCommentCloseRegExp = new RegExp(config.longCommentCloseRegExp);
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }

    /**
     * ## Parse 
     * Parser all files for anchors - produce a @interfaces/IReferenceCollection
     */
    public parse(): Q.Promise<IReferenceCollection> {
        let that = this;
        return Q.Promise<IReferenceCollection>((resolve, reject) => {
            logger.info("Starting parse actions for " + that.files.length + " files.");

            let parseActions = [];

            for (let i = 0; i < that.files.length; i++) {
                let fileName = that.files[i].split(".");
                let extension = fileName[fileName.length - 1];
                if (extension === "md") {
                    parseActions.push(that.parseAsMarkdown(that.files[i]));
                } else {
                    parseActions.push(that.parseFile(that.files[i]));
                }
            }

            Q.all(parseActions)
            .then(() => {
                logger.debug("Saving out internalReferences.json & externalReferences.json");
                writeFileSync(path.join(parseLoc, "internalReferences.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                writeFileSync(path.join(parseLoc, "externalReferences.json"), JSON.stringify(that.externalReferences), { flag: "w" });
                resolve(that.rootCollection);
            });
        });
    }

    /**
     * ## Parse As Markdown
     * When a file is markdown, we parse the whole thing. 
     */
    parseAsMarkdown(fileName: string): Q.Promise<{}> {
        logger.debug("parsing markdown file: " + fileName);
        let that = this;
        let file: IFile = {
            name: fileName,
            type: "markdown",
            lines: []
        };
        let lineNumber = 0; // Line numbering traditionally starts at 1
        return Q.Promise((resolve, reject) => {
            lineReader.eachLine(fileName, (line, last) => {
                let thisLine: ILine = {
                    number: lineNumber
                };

                file.lines.push(thisLine);
                file.lines[lineNumber].comment = line; // In Markdown all lines are considered comments

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

                lineNumber++;
            });
        });
    }

    /**
     * ## Parse File 
     * Parse a file to a file map. !ParseFile
     */
    parseFile(fileName: string): Q.Promise<{}> {
        logger.debug("parsing code file: " + fileName);
        let that = this;
        let file: IFile;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: getFileType(fileName)
            };

            // Line numbering traditionally starts at 1 (not 0)
            let lineNumber = 0;
            // Read each line of the file.
            lineReader.eachLine(fileName, (line, last) => {

                let thisLine: ILine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);

                // Logic for long comments, either beginning, or already started.
                let longCommentOpenMatch = XRegExp.exec(line, that.longCommentOpenRegExp, 0, false);

                if (!insideLongComment && longCommentOpenMatch) { // These comments must come at beginning of line.
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }

                // We are not inside a long comment - look for a regular comment.
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
                // Inside a long comment - so the whole thing is a comment
                // If this line contains a long comment closing symbol, then next line isn't long comment.
                } else {
                    if (XRegExp.exec(line, this.longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = "";
                        insideLongComment = false;
                    // This long comment hasn't been closed, so we should parse it for links.
                    } else {

                        file.lines[lineNumber].longComment = true;

                        if (longCommentOpenMatch) {
                            file.lines[lineNumber].comment = longCommentOpenMatch[1].trim();
                        } else {
                            let match = XRegExp.exec(line, this.longCommentLineRegExp, 0);
                            if (match && match[1]) {
                              file.lines[lineNumber].comment = match[1].trim();
                            } else {
                              file.lines[lineNumber].comment = ""; // Blank Line inside long comment...
                            }
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

                    // If this is the last line, then we can wrap things up.
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

    /**
     * ## Write Out File
     * Writes out a file map
     */
    writeOutFile(file: IFile) {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let filePathArray = path.join(parseLoc, file.name + ".json").split("/");
            filePathArray.pop();
            let filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    logger.debug("Saving output for: " + file.name);
                    writeFileSync(path.join(parseLoc, file.name + ".json"), JSON.stringify(file), { flag: "w" });
                    resolve(null);
                }
            });
        });
    }

    /**
     * ## Parse Comment
     * Once a comment is found (see @ParseFile above for example) this will parse
     * that commant for anchors. It will add those anchors to the @interfaces/IReferenceCollection 
     * for the entire project.
     */
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
