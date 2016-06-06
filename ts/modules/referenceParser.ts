import {IReferenceCollection, ReferenceCollection} from "../classes/referenceCollection";
import log4js = require("log4js");
import XRegExp = require("xregexp");
import lineReader = require("line-reader");
import Q = require("q");
import {doInOrder, doNext} from "../helpers/helpers";

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

    anchors: string[];

    constructor(files: string[], commentRegExp: RegExp, anchorRegExp: RegExp) {
        logger.debug("ready");
        this.files = files;
        this.rootCollection = new ReferenceCollection("root");
        this.anchorRegExp = anchorRegExp;
        this.commentRegExp = commentRegExp;
        this.anchors = [];
    }

    public parse(): Q.Promise<any> {
        let that = this;
        return Q.Promise((resolve, reject) => {
            logger.info("Starting parse actions for " + that.files.length + "files.");

            let parseActions = [];

            for (let i = 0; i < that.files.length; i++) {
                 parseActions.push(that.parseFile(that.files[i]));
            }

            Q.all(parseActions)
            .then(() => {
                resolve(that.anchors);
            });
       });
    }

    parseFile(fileName: string): Q.Promise<{}> {
        let that = this;
        return Q.Promise((resolve, reject) => {
            // read all lines:
            logger.info("Working on file: " + fileName);
            let i = 0;
            lineReader.eachLine(fileName, (line, last) => {
                console.info("Parseing line: " + i);
                that.parseLine(line)
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

    parseLine(line: string): Q.Promise<{}> {
        let that = this;
        return Q.Promise<string[]>((resolve, reject) => {
            let commentStart = line.search(that.commentRegExp);
            if (commentStart > -1) {
                logger.debug("found comment: " + line.substr(commentStart));
                that.parseComment(line.substr(commentStart))
                .then(() => {
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    }

    parseComment(comment: string): Q.Promise<{}> {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let pos = 0;
            let match;

            while (match = XRegExp.exec(comment, that.anchorRegExp, pos, false)) {
                logger.debug("found anchor: " + match[0]);
                that.anchors.push(match[0]);
                pos = match.index + match[0].length;
            }

            resolve(null);
        });
    };
}