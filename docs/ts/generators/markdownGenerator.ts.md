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
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::MarkdownGenerator");
export interface IMarkdownGenerator {
    generate(): void;
}
export class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    externalReferences: IExternalReference[];
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    referenceCollection: ReferenceCollection;
    tags: ITag[] = [];
    readme: string;
    projectName: string;
    outputFiles: string[] = [];
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
    }
    public generate(cleanUp?: boolean): void {
        logger.info("Generating Markdown Docs.");
        let that = this;
        let clean = cleanUp || false;
        this.outputFiles = [];
        readFiles(parseLoc, {match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true}, (err, content, next) => {
            that.proccessFile(err, content, next, that.outputDir);
        }, (err, files) => {
            let readme = "";
            let i = 1;
            lineReader.eachLine(that.readme, (line, last) => {
                let newLine = line;
                newLine = that.replaceExternalLinks(newLine, that.readme, i);
                newLine = that.replaceInternalLinks(newLine, that.readme, i);
                readme +=  "\n" + newLine;
                i++;
            }, () => {
                that.generateIndexPage(readme);
            });
        });
    }
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
                    file.lines[i].comment = this.replaceExternalLinks(file.lines[i].comment, file.name, i);
                    file.lines[i].comment = this.replaceInternalLinks(file.lines[i].comment, file.name, i);
                }
            }
            for (let i = 0; i < file.lines.length; i++) {
```
 Comment

```typescript
               
                if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                    if (inCodeBlock) {
```
 Close the current block of code. 

```typescript
                        output += "```" + "\n";
                        inCodeBlock = false;
                    }
                    output += file.lines[i].comment + "\n" + "\n";
                }
```
 Code

```typescript
               
                if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== "" && file.lines[i].code !== null) {
                    if (!inCodeBlock) {
```
 Open new code block. 

```typescript
                        output += "```" + file.type +  "\n";
                        inCodeBlock = true;
                    }
                    output += file.lines[i].code + "\n";
                }
            }
            if (inCodeBlock) {
```
 Close the current block of code. 

```typescript
                output += "```" + "\n";
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
                    logger.info("Saving output for " + file.type + " file " + file.name + " as " + fileName);
                    that.outputFiles.push(fileName);
                    writeFileSync(fileName, output, { flag: "w" });
                }
            });
            next();
        }
    }
    replaceAnchors(comment: string,  fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
```
 Look at the line for anchors - replace them with links. 

```typescript
       
        while (match = XRegExp.exec(newComment, this.anchorRegExp, pos, false)) {
            newComment =  newComment.substr(0, match.index) +
            "[" + match[1] + "](#" + match[1] + ")" +
            newComment.substr(match.index + match[0].length);
            pos = match.index + match[0].length;
        }
        return newComment;
    }
    replaceInternalLinks(comment: string, fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
        let linkPrefix = this.getLinkPrefix(fileName);
```
 Look at the line for anchors - replace them with links. 

```typescript
       
        while (match = XRegExp.exec(newComment, this.linkRegExp, pos, false)) {
            let tag =  _.findWhere(this.tags, {anchor: match[1]});
            if (!tag) {
                logger.warn("link: " + match[1] + " in " + fileName + ":" + line + " does not have a cooresponding anchor, so link cannot be created.");
            } else {
                logger.debug("found internal link: " + match[1]);
                newComment =  comment.substr(0, match.index) +
                " [" + match[1] + "](" + linkPrefix + tag.path + ".md#" + match[1] + ") " +
                newComment.substr(match.index + match[0].length);
            }
            pos = match.index + match[0].length;
        }
        return newComment;
    }
    replaceExternalLinks(comment: string, fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
```
 Look at the line for external references - replace them with links. 

```typescript
       
        while (match = XRegExp.exec(newComment, this.linkRegExp, pos, false)) {
            let tagArray = match[1].split("/");
            let tag =  _.findWhere(this.externalReferences, {anchor: tagArray[0]});
            if (tag) {
                logger.debug("found external link: " + match[1]);
                for (let i = 1; i < tagArray.length; i++) {
                    tag.path = tag.path.replace("::", tagArray[i]);
                }
                newComment =  comment.substr(0, match.index - 1) +
                " [" + match[1] + "](" + tag.path + ") " +
                newComment.substr(match.index + match[0].length);
            }
            pos = match.index + match[0].length;
        }
        return newComment;
    }
    generateIndexPage(readmeText?): void {
        logger.info("generating Duly Noted.md");
        let that = this;
        let outputMap = {
            project: this.projectName,
            collections: [],
            files: this.outputFiles,
            readme: readmeText
        };
```
 collections

```typescript
       
        let collections = that.referenceCollection.getTagsByCollection();
        for (let i = 0; i < collections.length; i++) {
            let anchors = _.clone(collections[i].anchors);
            for (let x = 0; x < anchors.length; x++) {
                let linkPrefix = that.getLinkPrefix(anchors[x].path);
                anchors[x].path = anchors[x].path + ".md#" + anchors[x].linkStub;
            }
            let name = collections[i].name.split("/");
            name.shift();
            name.shift();
            name = name.join("/");
            outputMap.collections.push({
                name: name,
                anchors: anchors
            });
        }
        let md = "# " + this.projectName + " documentation \n";
        md += "### Collections \n";
        for (let i = 0; i < outputMap.collections.length; i++) {
           md += "\n#### " + outputMap.collections[i].name + " \n";
           for (let x = 0; x < outputMap.collections[i].anchors.length; x++) {
               md += "* [" + outputMap.collections[i].anchors[x].anchor + "]" + "(" + outputMap.collections[i].anchors[x].path + ") \n";
           }
        }
        md += "\n------------------------------ \n";
        md += "\n### Files \n";
        for (let i = 0; i < outputMap.files.length; i++) {
            md += "* [" + outputMap.files[i] + "](" + outputMap.files[i] + ") \n";
        }
        md += "\n------------------------------ \n";
        md += outputMap.readme;
        writeFileSync(path.join(that.outputDir, "Duly Noted.md"), md, { flag: "w" });
    }
```
 > NOTE: Without this code, the link will not properly navigated deeply nested pages with relative linking.

```typescript
   
    getLinkPrefix(fileName: string): string {
        let fileNameAsArray = fileName.split("/");
        let linkPrefix = "";
        for (let i = 0; i < fileNameAsArray.length - 2; i++) {
            linkPrefix += "../";
        }
        return linkPrefix;
    }
    cleanUp(err, files) {
        if (err) {
            logger.error(err.message);
        } else {
            for (let i = 0; i < files.length; i++) {
                unlinkSync(files[i]);
            }
        }
    }
}
```
