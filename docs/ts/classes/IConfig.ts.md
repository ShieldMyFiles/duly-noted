
 <a name="iconfig" id="iconfig" ></a>[🔗IConfig](#user-content-iconfig)
```typescript

export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    indexFile: string;
    anchorRegExp: string;
```
 <a name="todo-commentregexp" id="todo-commentregexp" ></a>[🔗TODO/commentRegExp](#user-content-todo-commentregexp)
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
        gitHubMarkdownAnchors: boolean,
        htmlAnchors: boolean
    };
}

export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
```