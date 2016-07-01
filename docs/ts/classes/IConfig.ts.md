
 <a name="iconfig" id="iconfig" ></a>[🔗](#user-content-iconfig)IConfig
```typescript

export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    indexFile: string;
    anchorRegExp: string;
```
 <a name="todo-commentregexp" id="todo-commentregexp" ></a>[🔗](#user-content-todo-commentregexp)TODO/commentRegExp
```typescript
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
        gitHubHtmlAnchors: boolean,
        htmlAnchors: boolean
    };
}

export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
```