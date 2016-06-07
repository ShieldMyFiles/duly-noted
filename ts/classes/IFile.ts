export interface ILine {
    number: number;
    comment?: string;
    code?: string;
    longComment?: boolean;
}

export interface IFile {
    name: string;
    lines: ILine[];
    type?: string;
}