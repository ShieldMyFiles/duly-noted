
 [IConfig](#IConfig)
```typescript

export interface IConfig {
    projectName: string;
    files: string[];
    outputDir: string;
    indexFile: string;
    anchorRegExp: string;
```
 [TODO/commentRegExp](#TODO/commentRegExp) We should associate comment RegExp with file type - so we can support HTML comments
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
}

export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
```