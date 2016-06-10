import { IReferenceCollection } from "../classes/referenceCollection";
import { Config, IExternalReference } from "../classes/IConfig";
import { IFile } from "../classes/IFile";
import Q = require("q");
export interface IReferenceParser {
    files: string[];
    parse(): any;
}
export declare const parseLoc: string;
export declare class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentLineRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    externalReferences: IExternalReference[];
    constructor(config: Config);
    parse(): Q.Promise<IReferenceCollection>;
    parseAsMarkdown(fileName: string): Q.Promise<{}>;
    parseFile(fileName: string): Q.Promise<{}>;
    writeOutFile(file: IFile): Q.Promise<{}>;
    parseLine(line: string, fileName: string, lineNumber: number, insideLongComment: boolean): Q.Promise<{}>;
    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}>;
}
