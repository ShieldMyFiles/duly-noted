import { IReferenceCollection } from "../classes/referenceCollection";
import Q = require("q");
export interface IReferenceParser {
    files: string[];
    parse(): any;
}
export declare class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    anchors: string[];
    constructor(files: string[], commentRegExp: RegExp, anchorRegExp: RegExp);
    parse(): Q.Promise<any>;
    parseFile(fileName: string): Q.Promise<{}>;
    parseLine(line: string): Q.Promise<{}>;
    parseComment(comment: string): Q.Promise<{}>;
}
