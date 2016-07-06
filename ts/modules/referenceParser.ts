/** !ReferenceParser/main
 * # Reference Parser
 * @authors/chris
 * @license
 *
 * This code parse files, build maps of each the code file, 
 * as well as collections of internal and external references. 
 * Examples below:
 *  * Example Code Map: @ReferenceParser/example-output/code-map
 *  * Example Reference Map: @ReferenceParser/example-output/reference-collection
 * 
 * These files are typically deleted at the end of the @Index/run 
 * process, however, you can leave them by setting `leaveJSONFiles = true`
 * in your 'duly-noted.json' file. 
 * 
 * These files are ouput at @ReferenceParser/constants/parseLoc .
 *  
 */

import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IConfig, IExternalReference} from "../classes/IConfig";
import {IFile, ILine} from "../classes/IFile";
import {getFileType} from "../helpers/fileType";
import {writeFileSync, mkdirSync, accessSync, F_OK, openSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import XRegExp = require("xregexp");
import lineReader = require("line-reader");
import Q = require("q");
import {doInOrder, doNext} from "../helpers/helpers";

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceParser");

/** !interfaces/IReferenceParser
 * ## Interface for ReferenceParser
 */
export interface IReferenceParser {
    parse(files: string[]): Q.Promise<IReferenceCollection>;
}

/** !ReferenceParser/constants/parseLoc
 * Location to store output JSON file and reference collection maps.
 */
export const parseLoc = "duly-noted";

/** !ReferenceParser/class
 * ## Reference Parser Class
 */
export class ReferenceParser implements IReferenceParser {
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentPatterns: {}[];
    externalReferences: IExternalReference[];

    /** !ReferenceParser/constructor
     * ### Creates an instance of @ReferenceParser/class
     */
    constructor(config: IConfig, logLevel?: string) {
        this.rootCollection = new ReferenceCollection(parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);

        let commentPatternsFile = path.join(__dirname, "../../bin/comment-patterns.json");
        logger.debug("Loading Comment Patterns from " + commentPatternsFile);
        this.commentPatterns = JSON.parse(readFileSync(commentPatternsFile).toString());
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }

    /** !ReferenceParser/parse
     * ## Parse 
     * Parser all files for anchors - produce a @interfaces/IReferenceCollection
     */
    public parse(files: string[]): Q.Promise<IReferenceCollection> {
        let that = this;
        return Q.Promise<IReferenceCollection>((resolve, reject) => {
            logger.info("Starting parse actions for " + files.length + " files.");

            /** 
             *  Build a collection of parse actions. 
             * 
             *  * If file is Markdown, then use @ReferenceParser/parseAsMarkdown
             *  * Otherwise pass to @ReferenceParser/parseFile 
             */
            let parseActions = [];
            for (let i = 0; i < files.length; i++) {
                let fileName = files[i].split(".");
                let extension = fileName[fileName.length - 1];
                if (extension === "md") {
                    parseActions.push(that.parseAsMarkdown(files[i]));
                } else {
                    parseActions.push(that.parseFile(files[i]));
                }
            }

            Q.all(parseActions)
            .then(() => {
                // Once all parse actions are complete write our the files.
                logger.debug("Saving out internalReferences.json & externalReferences.json");
                writeFileSync(path.join(parseLoc, "internalReferences.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                writeFileSync(path.join(parseLoc, "externalReferences.json"), JSON.stringify(that.externalReferences), { flag: "w" });
                resolve(that.rootCollection);
            })
            .catch((err) => {
                logger.error(err.message + err.stack);
                reject(err);
            });
        });
    }

    /** !ReferenceParser/parseAsMarkdown
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
                            reject(err);
                        });
                    }
                });

                lineNumber++;
            });
        });
    }

    /** !ReferenceParser/parseFile
     * ## Parse File 
     * Parse a file to a file map.
     */
    parseFile(fileName: string): Q.Promise<{}> {
        logger.debug("parsing code file: " + fileName);
        let that = this;
        let file: IFile;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            let commentRegExp;
            let longCommentOpenRegExp;
            let longCommentLineRegExp;
            let longCommentCloseRegExp;

            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: getFileType(fileName)
            };

            // Load comment RegEx based on file type
            if (that.commentPatterns[file.type]) {
                logger.debug("Using comment patten for " + file.type);
                commentRegExp = new RegExp(that.commentPatterns[file.type]["commentRegExp"]);

                // Set RegEx for open a long comment
                if (that.commentPatterns[file.type]["longCommentOpenRegExp"]) longCommentOpenRegExp = new RegExp(that.commentPatterns[file.type]["longCommentOpenRegExp"]);
                else longCommentOpenRegExp = undefined;

                // Set RegEx for continues a long comment
                if (that.commentPatterns[file.type]["longCommentLineRegExp"]) longCommentLineRegExp = new RegExp(that.commentPatterns[file.type]["longCommentLineRegExp"]);
                else longCommentLineRegExp = undefined;

                // Set RegEx for closes a long comment
                if (that.commentPatterns[file.type]["longCommentCloseRegExp"]) longCommentCloseRegExp = new RegExp(that.commentPatterns[file.type]["longCommentCloseRegExp"]);
                else longCommentLineRegExp = undefined;
            } else {
                logger.debug("Using default comment patten.");
                commentRegExp =  new RegExp(that.commentPatterns["default"]["commentRegExp"]);
                longCommentOpenRegExp = new RegExp(that.commentPatterns["default"]["longCommentOpenRegExp"]);
                longCommentLineRegExp = new RegExp(that.commentPatterns["default"]["longCommentLineRegExp"]);
                longCommentCloseRegExp = new RegExp(that.commentPatterns["default"]["longCommentCloseRegExp"]);
            }

            let lineNumber = 0;
            // Read each line of the file.
            lineReader.eachLine(fileName, (line, last) => {

                let thisLine: ILine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);

                // Logic for long comments, either beginning, or already started.
                let longCommentOpenMatch;
                if (longCommentOpenRegExp) {
                    longCommentOpenMatch = XRegExp.exec(line, longCommentOpenRegExp, 0, false);
                } else {
                    longCommentOpenMatch = false;
                }

                if (!insideLongComment && longCommentOpenMatch) {
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }

                // We are not inside a long comment - look for a regular comment.
                if (!insideLongComment) {
                    let match = XRegExp.exec(line, commentRegExp, 0, false);

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
                                        reject(err);
                                    });
                                }
                            });
                    // This is not a comment (code only)
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
                                reject(err);
                            });
                        }
                    }
                // Inside a long comment - so the whole thing is a comment
                } else {

                    file.lines[lineNumber].longComment = true;

                    if (longCommentOpenMatch) {
                        file.lines[lineNumber].comment = longCommentOpenMatch[1];
                    } else {
                        let match = XRegExp.exec(line, longCommentLineRegExp, 0);
                        if (match && match[1]) {
                            file.lines[lineNumber].comment = match[1];
                        } else {
                            file.lines[lineNumber].comment = ""; // Blank Line inside long comment...
                        }
                    }

                    // If this line contains a long comment closing symbol, then next line isn't long comment, and we can remove the closing tag
                    if (XRegExp.exec(line, longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = file.lines[lineNumber].comment.replace(longCommentCloseRegExp, "");
                        insideLongComment = false;
                    };

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
                                    reject(err);
                                });
                        }
                    });

                    // If this is the last line, then we can wrap things up.
                    if (last) {
                        that.writeOutFile(file)
                        .then(() => {
                            resolve(null);
                            return false;
                        })
                        .catch((err) => {
                            logger.fatal(err.message);
                            reject(err);
                        });
                    }
                }

                lineNumber++;
            });
        });
    }

    /** !ReferenceParser/writeOutFile
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

    /** !ReferenceParser/parseComment
     * ## Parse Comment
     * Once a comment is found (see @ReferenceParser/parseFile above for example) this will parse
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

 /** !ReferenceParser/example-output/reference-collection
 * ### Example output JSON file for references
 * ```json
 *  {
 *   "id": "duly-noted",
 *   "anchors": [
 *        {
 *            "id": "license",
 *            "line": 1,
 *            "file": "./license.md"
 *        },
 *        ...
 *    ],
 *    "subcollections": [
 *        {
 *            "id": "Index",
 *            "anchors": [
 *                {
 *                    "id": "main",
 *                    "line": 0,
 *                    "file": "./ts/index.ts"
 *                },
 *                {
 *                    "id": "run",
 *                    "line": 21,
 *                    "file": "./ts/index.ts"
 *                },
 *                {
 *                    "id": "getFiles",
 *                    "line": 162,
 *                    "file": "./ts/index.ts"
 *                },
 *                {
 *                    "id": "deleteDir",
 *                    "line": 175,
 *                    "file": "./ts/index.ts"
 *                }
 *            ],
 *            "subcollections": []
 *        },
 *        ...
 *    }
 * ```
 * 
 * !ReferenceParser/example-output/code-map
 * ## Example Output JSON map for code file.
 * ```json
 * {
 *    "name": "./ts/index.ts",
 *    "lines": [
 *        ...
 *        {
 *            "number": 5,
 *            "longComment": true,
 *            "comment": "This is the entry file to Duly Noted, "
 *        },
 *        {
 *            "number": 6,
 *            "longComment": true,
 *            "comment": "it contains function that launches from the Command Line"
 *        },
 *        {
 *            "number": 7,
 *            "longComment": true,
 *            "comment": ""
 *        },
 *        {
 *            "number": 8,
 *            "code": "import {IConfig} from \"./classes/IConfig\";"
 *        },
 *        ...
 *    ]
 * }
 *
 * ```
 */