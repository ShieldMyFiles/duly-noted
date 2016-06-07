import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
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
    longCommentCloseRegExp: RegExp;

    constructor(files: string[],
                commentRegExp: RegExp,
                anchorRegExp: RegExp,
                longCommentOpenRegExp: RegExp,
                longCommentCloseRegExp: RegExp) {
        logger.debug("ready");
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
            let i = 1; // Line numbering traditionally starts at 1
            lineReader.eachLine(fileName, (line, last) => {
                logger.info("Parsing line: " + i);

                let longCommentStart = line.search(that.longCommentOpenRegExp);

                if (!insideLongComment && longCommentStart === 0) { // These comments must come at beginning of line.
                    insideLongComment = true;
                }

                that.parseLine(line, fileName, i, insideLongComment)
                .then((anchors) => {
                    if (last) {
                        resolve(null);
                        return false;
                    }
                });

                if (insideLongComment) {
                    let longCommentEnd = line.search(that.longCommentCloseRegExp);
                    if (longCommentEnd > -1) {
                        insideLongComment = false;
                    }
                }

                i++;
            });
        });
    }

    parseLine(line: string, fileName: string, lineNumber: number, insideLongComment: boolean): Q.Promise<{}> {
        let that = this;
        return Q.Promise<string[]>((resolve, reject) => {
            let commentStart = line.search(that.commentRegExp);

            // Not inside a long comment - look for a regular comment.
            if (!insideLongComment) {
                if (commentStart > -1) {
                    logger.debug("found comment: " + line.substr(commentStart));
                    that.parseComment(line.substr(commentStart), fileName, lineNumber)
                    .then(() => {
                        resolve(null);
                    });
                } else {
                    resolve(null);
                }
            } else { // Inside a long comment - parse anchors away!
                logger.debug("Inside long comment: " + line);
                that.parseComment(line, fileName, lineNumber)
                .then(() => {
                    resolve(null);
                });
            }
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
