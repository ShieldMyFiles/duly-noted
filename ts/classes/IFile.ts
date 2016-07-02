/** !interfaces/ILine
 * ILine
 */
export interface ILine {
    number: number;
    comment?: string;
    code?: string;
    longComment?: boolean;
}

/** !interfaces/IFile
 * IFile
 */
export interface IFile {
    name: string;
    lines: ILine[];
    type?: string;
}