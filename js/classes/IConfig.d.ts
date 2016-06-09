export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    anchorRegExp: string;
    commentRegExp: string;
    longCommentOpenRegExp: string;
    longCommentCloseRegExp: string;
    longCommentLineRegExp: string;
    linkRegExp: string;
    externalReferences: IExternalReference[];
    readme: string;
}
export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
