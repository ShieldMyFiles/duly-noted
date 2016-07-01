// !IConfig
export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    indexFile: string;
    anchorRegExp: string;
    commentRegExp: string; // !TODO/commentRegExp We should associate comment RegExp with file type - so we can support HTML comments
    longCommentOpenRegExp: string;
    longCommentCloseRegExp: string;
    longCommentLineRegExp: string;
    linkRegExp: string;
    externalReferences: IExternalReference[];
    readme: string;
    generators: string[];
    leaveJSONFiles: boolean;
    markdownGeneratorOptions: {
        gitHubMarkdownAnchors: boolean,
        htmlAnchors: boolean
    };
}

export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}