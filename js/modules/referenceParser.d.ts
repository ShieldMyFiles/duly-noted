import { IReferenceCollection } from "../classes/referenceCollection";
import { IFile } from "../classes/IFile";
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
    longCommentLineRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    outputDir: string;
    constructor(files: string[], commentRegExp: RegExp, anchorRegExp: RegExp, longCommentOpenRegExp: RegExp, longCommentLineRegExp: RegExp, longCommentCloseRegExp: RegExp, outputDir: string);
    parse(): Q.Promise<IReferenceCollection>;
    parseAsMarkdown(fileName: string): Q.Promise<{}>;
    parseFile(fileName: string): Q.Promise<{}>;
    writeOutFile(file: IFile): Q.Promise<{}>;
    parseLine(line: string, fileName: string, lineNumber: number, insideLongComment: boolean): Q.Promise<{}>;
    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}>;
}
