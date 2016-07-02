import { IReferenceCollection } from "../classes/referenceCollection";
import { IConfig, IExternalReference } from "../classes/IConfig";
import { IFile } from "../classes/IFile";
import Q = require("q");
export interface IReferenceParser {
    parse(): Q.Promise<IReferenceCollection>;
}
export declare const parseLoc: string;
export declare class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentPatterns: {}[];
    externalReferences: IExternalReference[];
    constructor(config: IConfig, logLevel?: string);
    parse(): Q.Promise<IReferenceCollection>;
    parseAsMarkdown(fileName: string): Q.Promise<{}>;
    parseFile(fileName: string): Q.Promise<{}>;
    writeOutFile(file: IFile): Q.Promise<{}>;
    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}>;
}
