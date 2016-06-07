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

    constructor(files: string[], commentRegExp: RegExp, anchorRegExp: RegExp) {
        logger.debug("ready");
        this.files = files;
        this.rootCollection = new ReferenceCollection("root");
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
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
        return Q.Promise((resolve, reject) => {
            // read all lines:
            logger.info("Working on file: " + fileName);
            let i = 1; // Line numbering traditionally starts at 1
            lineReader.eachLine(fileName, (line, last) => {
                console.info("Parseing line: " + i);
                that.parseLine(line, fileName, i)
                .then((anchors) => {
                    if (last) {
                        resolve(null);
                        return false;
                    }
                });
                i++;
            });
        });
    }

    parseLine(line: string, fileName: string, lineNumber: number): Q.Promise<{}> {
        let that = this;
        return Q.Promise<string[]>((resolve, reject) => {
            let commentStart = line.search(that.commentRegExp);
            if (commentStart > -1) {
                logger.debug("found comment: " + line.substr(commentStart));
                that.parseComment(line.substr(commentStart), fileName, lineNumber)
                .then(() => {
                    resolve(null);
                });
            } else {
                resolve(null);
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
