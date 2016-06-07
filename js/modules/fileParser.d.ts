import { IFile } from "../classes/IFile";
import Q = require("q");
export interface IFileParser {
    fileMap: IFile;
}
export declare class FileParser implements IFileParser {
    fileMap: IFile;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    constructor(file: string, commentRegExp: RegExp, longCommentOpenRegExp: RegExp, longCommentCloseRegExp: RegExp);
    parse(): Q.Promise<IFile>;
}
