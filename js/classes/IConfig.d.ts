export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    indexFile: string;
    anchorRegExp: string;
    commentRegExp: string;
    longCommentOpenRegExp: string;
    longCommentCloseRegExp: string;
    longCommentLineRegExp: string;
    linkRegExp: string;
    externalReferences: IExternalReference[];
    readme: string;
    generators: string[];
    leaveJSONFiles: boolean;
    markdownGeneratorOptions: {
        gitHubHtmlAnchors: boolean;
        htmlAnchors: boolean;
    };
}
export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
