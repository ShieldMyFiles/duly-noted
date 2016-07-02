
 <a name="interfaces-iconfig" id="interfaces-iconfig" ></a>[🔗](#user-content-interfaces-iconfig)interfaces/IConfig
# IConfig

This allows for strongly-typed representation of 'duly-noted.json' config file.

```typescript
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
        gitHubHtmlAnchors: boolean,
        htmlAnchors: boolean
    };
}

```
 <a name="interfaces-iexternalreference" id="interfaces-iexternalreference" ></a>[🔗](#user-content-interfaces-iexternalreference)interfaces/IExternalReference
IExternalReference

```typescript
export interface IExternalReference {
    anchorRegExp: string;
    path: string;
}
```