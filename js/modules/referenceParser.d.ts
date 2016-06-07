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
    longCommentOpenRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    constructor(files: string[], commentRegExp: RegExp, anchorRegExp: RegExp, longCommentOpenRegExp: RegExp, longCommentCloseRegExp: RegExp);
    parse(): Q.Promise<IReferenceCollection>;
    parseFile(fileName: string): Q.Promise<{}>;
    parseLine(line: string, fileName: string, lineNumber: number, insideLongComment: boolean): Q.Promise<{}>;
    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}>;
}
