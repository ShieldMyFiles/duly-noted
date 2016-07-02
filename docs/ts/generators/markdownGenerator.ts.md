

# <a name="markdowngenerator" id="markdowngenerator" ></a>[🔗](#user-content-markdowngenerator)MarkdownGenerator
 [authors/chris](../.././authors.md.md#user-content-authors-chris)
 [license](../.././license.md.md#user-content-license)

```typescript

import {IReferenceCollection, IAnchor, ITag, ReferenceCollection} from "../classes/referenceCollection";
import {parseLoc} from "../modules/referenceParser";
import {IConfig, IExternalReference} from "../classes/IConfig";
import {readFiles, files} from "node-dir";
import {IFile, ILine} from "../classes/IFile";
import XRegExp = require("xregexp");
import {writeFileSync, mkdirSync, accessSync, F_OK, unlinkSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import _ = require("underscore");
import lineReader = require("line-reader");
import Q = require("q");

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::MarkdownGenerator");


```

<a name="interfaces-imarkdowngenerator" id="interfaces-imarkdowngenerator" ></a>[🔗](#user-content-interfaces-imarkdowngenerator)interfaces/IMarkdownGenerator

```typescript
export interface IMarkdownGenerator {
    generate(): void;
}

```

## <a name="classes-markdowngenerator" id="classes-markdowngenerator" ></a>[🔗](#user-content-classes-markdowngenerator)classes/MarkdownGenerator

```typescript
export class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    indexFile: string;
    externalReferences: IExternalReference[];
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    referenceCollection: ReferenceCollection;
    tags: ITag[] = [];
    readme: string;
    projectName: string;
    outputFiles: string[] = [];
    htmlAnchors: boolean;
    gitHubHtmlAnchors: boolean;

```

### Creates an instance of [classes/MarkdownGenerator](../.././ts/generators/markdownGenerator.ts.md#user-content-classes-markdowngenerator)

```typescript
    constructor(config: IConfig, logLevel?: string) {
        logger.setLevel(logLevel || "DEBUG");
        this.outputDir = config.outputDir;
        this.externalReferences = JSON.parse(readFileSync(path.join(parseLoc, "externalReferences.json")).toString());
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.linkRegExp = new RegExp(config.linkRegExp);
        this.referenceCollection = new ReferenceCollection("").inflate(JSON.parse(readFileSync(path.join(parseLoc, "internalReferences.json")).toString()));
        this.tags = this.referenceCollection.getAllTags();
        this.readme = config.readme;
        this.projectName = config.projectName;
        this.indexFile = config.indexFile;

```
 For a discussion anchors in markdown see [issue/4](https://github.com/ShieldMyFiles/duly-noted/issues/::) 
```typescript
       
        this.htmlAnchors = config.markdownGeneratorOptions.htmlAnchors;
        this.gitHubHtmlAnchors = config.markdownGeneratorOptions.gitHubHtmlAnchors;
    }

```

## Generate Markdown Docs
Creates Markdown docs for a set of file maps and reference maps set on [classes/MarkdownGenerator](../.././ts/generators/markdownGenerator.ts.md#user-content-classes-markdowngenerator) construction.

```typescript
    public generate(): Q.IPromise<{}> {
        return Q.Promise((resolve, reject) => {
            logger.info("Generating Markdown Docs.");
            let that = this;
            this.outputFiles = [];
            readFiles(parseLoc, {match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true}, (err, content, next) => {
                that.proccessFile(err, content, next, that.outputDir);
            }, (err, files) => {
                let readme = "";
                let i = 1;

                if (that.readme !== null) {
                    lineReader.eachLine(that.readme, (line, last) => {
                        let newLine = line;
                        newLine = that.replaceLinks(newLine, that.readme, i);
                        readme +=  "\n" + newLine;
                        i++;
                    }, () => {
                        that.generateIndexPage(readme);
                        resolve(null);
                    });
                } else {
                    that.generateIndexPage("");
                    resolve(null);
                }
            });
        });
    }

```

## Process Files
Processes the file map for a file, making output decisions based on 
code, comment, long comment presence 

```typescript
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        let file: IFile = JSON.parse(content);
        let that = this;
        logger.debug("Processing " + file.name);

        if (err) {
            logger.error(err.message);
        } else {
            let file: IFile = JSON.parse(content);
            let output: string = "";
            let inCodeBlock = false;

            for (let i = 0; i < file.lines.length; i++) {
                if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                    file.lines[i].comment = this.replaceAnchors(file.lines[i].comment, file.name, i);
                    file.lines[i].comment = this.replaceLinks(file.lines[i].comment, file.name, i);
                }
            }

            for (let i = 0; i < file.lines.length; i++) {

```
 Comment
```typescript
               
                if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== null) {
                    if (inCodeBlock) {
```
 Close the current block of code. 
```typescript
                        output += "\n" + "```" ;
                        inCodeBlock = false;
                    }

                    output += "\n" + file.lines[i].comment;
                }

```
 Code
```typescript
               
                if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== null) {
                    if (!inCodeBlock) {
```
 Open new code block. 
```typescript
                        output += "\n" + "```" + file.type;
                        inCodeBlock = true;
                    }
                    output += "\n" + file.lines[i].code;
                }
            }

            if (inCodeBlock) {
```
 Close the current block of code. 
```typescript
                output += "\n" + "```";
                inCodeBlock = false;
            }

            let filePathArray = path.join(outputDir, file.name + ".md").split("/");
            filePathArray.pop();
            let filePath = filePathArray.join("/");

            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                }
                else {
                    let fileName = path.join(outputDir, file.name + ".md");
                    that.outputFiles.push(fileName);
                    logger.debug("Saving output for " + file.type + " file " + file.name + " as " + fileName);
                    writeFileSync(fileName, output, { flag: "w" });
                }
            });

            next();
        }
    }

```

## Replace Anchors
Processes a comment line, replacing anchors with markdown anchor link tags

```typescript
    replaceAnchors(comment: string,  fileName: string, line: number, position?: number) {
        let pos = position || 0;

```
 Look at the line for anchors - replace them with links. 
```typescript
       
        let match = XRegExp.exec(comment, this.anchorRegExp, pos, false);

        if (!match) {
            return comment;
        } else {

            let anchor = match[1].replace("/", "-").toLowerCase();

```

Markdown doesn't natively support acnhors, but you can make them work 
with simple html. In GitHub, however, anchors are prefixed with 'user-content'
For a discussion anchors in markdown see [issue/4](https://github.com/ShieldMyFiles/duly-noted/issues/::) 

```typescript
            if (this.htmlAnchors || this.gitHubHtmlAnchors) {
                let replacementText = '<a name="' + anchor + '" id="' + anchor + '" ></a>';

                if (this.gitHubHtmlAnchors) {
                    replacementText += "[🔗](#user-content-" + anchor + ")" + match[1];
                } else {
                    replacementText += "[🔗](#" + anchor + ")" + match[1];
                }

                comment = comment.replace(match[0], replacementText);
                return this.replaceAnchors(comment, fileName, line, pos + match[0].length);
            }
        }
    }

```

## Replace Links
> Run this AFTER external link replacement to ensure warning accuracy
Processes a comment line, replacing links with markdown links

```typescript
    replaceLinks(comment: string, fileName: string, line: number, position?: number) {
        let pos = position || 0;

        let linkPrefix = this.getLinkPrefix(fileName);

```
 Look at the line for anchors - replace them with links. 
```typescript
       
        let match = XRegExp.exec(comment, this.linkRegExp, pos, false);

        if (!match) {
            return comment;
        } else {

```
 Look external link.
```typescript
           
            let tagArray = match[1].split("/");
            let externalTag =  _.findWhere(this.externalReferences, {anchor: tagArray[0]});
            if (externalTag) {
                logger.debug("found external link: " + match[1]);
                let anchor = match[1].replace("/", "-").toLowerCase();
                comment = comment.replace(match[0], " [" + match[1] + "](" + externalTag.path + ") ");
                return this.replaceLinks(comment, fileName, line, pos + match[0].length);
            }

```
 Look for internal link.
```typescript
           
            let internalTag =  _.findWhere(this.tags, {anchor: match[1]});
            if (!internalTag) {
                logger.warn("link: " + match[1] + " in " + fileName + ":" + line + ":" + pos + " does not have a cooresponding anchor, so link cannot be created.");
                return comment;
            } else {
                logger.debug("found internal link: " + match[1] + " " + internalTag.path);
                let anchor = match[1].replace("/", "-").toLowerCase();

                if (this.gitHubHtmlAnchors) {
                    comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#user-content-" + anchor + ")");

                } else {
                    comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#" + anchor + ")");
                }
            }
            return this.replaceLinks(comment, fileName, line, pos + match[0].length);
        }
    }

```

## Generates the "Index Page"
This generates the index page, listing all the link collections, 
and sucks in the README. 

```typescript
    generateIndexPage(readmeText?): void {
        logger.info("generating Duly Noted Index file.");
        let that = this;

        let outputMap = {
            project: this.projectName,
            collections: [],
            files: this.outputFiles,
            readme: readmeText
        };

        let collections = that.referenceCollection.getTagsByCollection();

        for (let i = 0; i < collections.length; i++) {
            let anchors = _.clone(collections[i].anchors);
            let name = collections[i].name.split("/");
            name.shift();
            name.shift();
            name = name.join("/");

            for (let x = 0; x < anchors.length; x++) {
                let anchor = anchors[x].linkStub.replace("/", "-").toLowerCase();

                anchors[x].path = anchors[x].path + ".md#";

```
 Adjustment for gitHub anchor links. See [issue/6](https://github.com/ShieldMyFiles/duly-noted/issues/::) 
```typescript
               
                if (this.gitHubHtmlAnchors) {
                    anchors[x].path += "user-content-";
                }

                if (name !== "") {
                    anchors[x].path += name.replace("/", "-").toLowerCase() + "-";
                }

                anchors[x].path += anchor;

            }

            outputMap.collections.push({
                name: name,
                anchors: anchors
            });
        }

        let md = "# " + this.projectName + " documentation \n";

        md += "### Anchor Collections \n";
        for (let i = 0; i < outputMap.collections.length; i++) {
           md += "\n#### " + outputMap.collections[i].name + " \n";

           for (let x = 0; x < outputMap.collections[i].anchors.length; x++) {
               md += "* [" + outputMap.collections[i].anchors[x].anchor + "]" + "(" + outputMap.collections[i].anchors[x].path + ") \n";
           }
        }

        md += "\n------------------------------ \n";
        md += "\n### Documentation Files \n";

        for (let i = 0; i < outputMap.files.length; i++) {

```

This shifts off the root folder b/c our index file is inside the output folder, 
not one level up. See [issue/5](https://github.com/ShieldMyFiles/duly-noted/issues/::) 
> EXAMPLE: 
> docs/myfile.ts.md is linked to as ./myfile.ts.md

```typescript
            let path: any = outputMap.files[i].split("/");
            let name = path;
            path.shift();
            path.unshift(".");
            path = path.join("/");
            name.shift();
            name = name.join("/");

            md += "* [" + name + "](" + path + ") \n";
        }
        md += "\n------------------------------ \n";

        md += outputMap.readme;

        writeFileSync(path.join(that.outputDir, that.indexFile), md, { flag: "w" });
    }


```

Generate a link Prefix from a fileName
> NOTE: Without this code, links will not properly navigated to deeply nested pages with relative linking.

```typescript
    getLinkPrefix(fileName: string): string {
        let fileNameAsArray = fileName.split("/");
        let linkPrefix = "";
        for (let i = 0; i < fileNameAsArray.length - 2; i++) {
            linkPrefix += "../";
        }

        return linkPrefix;
    }
}

```