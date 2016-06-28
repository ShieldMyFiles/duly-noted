 # [ReferenceParser](#ReferenceParser)

 [authors/chris](../.././authors.md.md#authors/chris) 

 [license](../.././license.md.md#license) 

```typescript
import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IConfig, IExternalReference} from "../classes/IConfig";
import {IFile, ILine} from "../classes/IFile";
import {getFileType} from "../helpers/fileType";
import {writeFileSync, mkdirSync, accessSync, F_OK, openSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import XRegExp = require("xregexp");
import lineReader = require("line-reader");
import Q = require("q");
import {doInOrder, doNext} from "../helpers/helpers";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceParser");
```
 ## [interfaces/IReferenceParser](#interfaces/IReferenceParser)

```typescript
export interface IReferenceParser {
    parse(): Q.Promise<IReferenceCollection>;
}
```
 ## [constant/parseLoc](#constant/parseLoc)

```typescript
export const parseLoc = "duly-noted";
```
 ## [classes/ReferenceParser](#classes/ReferenceParser)

```typescript
export class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentRegExp: RegExp;
    longCommentOpenRegExp: RegExp;
    longCommentLineRegExp: RegExp;
    longCommentCloseRegExp: RegExp;
    externalReferences: IExternalReference[];
```
 ### Creates an instance of [classes/ReferenceParser](../.././ts/modules/referenceParser.ts.md#classes/ReferenceParser) 

```typescript
    constructor(config: IConfig, logLevel?: string) {
        this.files = config.files;
        this.rootCollection = new ReferenceCollection(parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.commentRegExp = new RegExp(config.commentRegExp);
        this.longCommentOpenRegExp = new RegExp(config.longCommentOpenRegExp);
        this.longCommentLineRegExp = new RegExp(config.longCommentLineRegExp);
        this.longCommentCloseRegExp = new RegExp(config.longCommentCloseRegExp);
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }
```
 ## Parse

 Parser all files for anchors - produce a [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#interfaces/IReferenceCollection) 

```typescript
    public parse(): Q.Promise<IReferenceCollection> {
        let that = this;
        return Q.Promise<IReferenceCollection>((resolve, reject) => {
            logger.info("Starting parse actions for " + that.files.length + " files.");
            let parseActions = [];
            for (let i = 0; i < that.files.length; i++) {
                let fileName = that.files[i].split(".");
                let extension = fileName[fileName.length - 1];
                if (extension === "md") {
                    parseActions.push(that.parseAsMarkdown(that.files[i]));
                } else {
                    parseActions.push(that.parseFile(that.files[i]));
                }
            }
            Q.all(parseActions)
            .then(() => {
                logger.debug("Saving out internalReferences.json & externalReferences.json");
                writeFileSync(path.join(parseLoc, "internalReferences.json"), JSON.stringify(that.rootCollection), { flag: "w" });
                writeFileSync(path.join(parseLoc, "externalReferences.json"), JSON.stringify(that.externalReferences), { flag: "w" });
                resolve(that.rootCollection);
            });
        });
    }
```
 ## Parse As Markdown

 When a file is markdown, we parse the whole thing.

```typescript
    parseAsMarkdown(fileName: string): Q.Promise<{}> {
        logger.debug("parsing markdown file: " + fileName);
        let that = this;
        let file: IFile = {
            name: fileName,
            type: "markdown",
            lines: []
        };
```
 Line numbering traditionally starts at 1

```typescript
        let lineNumber = 0;
        return Q.Promise((resolve, reject) => {
            lineReader.eachLine(fileName, (line, last) => {
                let thisLine: ILine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);
```
 In Markdown all lines are considered comments

```typescript
                file.lines[lineNumber].comment = line;
                that.parseComment(file.lines[lineNumber].comment, fileName, lineNumber)
                .then(() => {
                    if (last) {
                        that.writeOutFile(file)
                        .then(() => {
                            resolve(null);
                            return false;
                        })
                        .catch((err) => {
                            logger.fatal(err.message);
                        });
                    }
                });
                lineNumber++;
            });
        });
    }
```
 ## Parse File

 Parse a file to a file map. [ParseFile](#ParseFile)

```typescript
    parseFile(fileName: string): Q.Promise<{}> {
        logger.debug("parsing code file: " + fileName);
        let that = this;
        let file: IFile;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: getFileType(fileName)
            };
```
 Line numbering traditionally starts at 1 (not 0)

```typescript
           
            let lineNumber = 0;
```
 Read each line of the file.

```typescript
           
            lineReader.eachLine(fileName, (line, last) => {
                let thisLine: ILine = {
                    number: lineNumber
                };
                file.lines.push(thisLine);
```
 Logic for long comments, either beginning, or already started.

```typescript
               
                let longCommentOpenMatch = XRegExp.exec(line, that.longCommentOpenRegExp, 0, false);
```
 These comments must come at beginning of line.

```typescript
                if (!insideLongComment && longCommentOpenMatch) {
                    insideLongComment = true;
                    file.lines[lineNumber].longComment = true;
                }
```
 We are not inside a long comment - look for a regular comment.

```typescript
               
                if (!insideLongComment) {
                    let match = XRegExp.exec(line, that.commentRegExp, 0, false);
```
 Contains a tradition comment

```typescript
                   
                    if (match) {
                        file.lines[lineNumber].comment = match[1];
                        file.lines[lineNumber].code = line.substr(0, match.index - 1);
                        that.parseComment(file.lines[lineNumber].comment, fileName, lineNumber)
                            .then(() => {
                                if (last) {
                                    that.writeOutFile(file)
                                    .then(() => {
                                        resolve(null);
                                        return false;
                                    })
                                    .catch((err) => {
                                        logger.fatal(err.message);
                                    });
                                }
                            });
```
 Not a comment (code only)

```typescript
                   
                    } else {
                        file.lines[lineNumber].code = line;
                        if (last) {
                            that.writeOutFile(file)
                            .then(() => {
                                resolve(null);
                                return false;
                            })
                            .catch((err) => {
                                logger.fatal(err.message);
                            });
                        }
                    }
```
 Inside a long comment - so the whole thing is a comment

```typescript
               
```
 If this line contains a long comment closing symbol, then next line isn't long comment.

```typescript
               
                } else {
                    if (XRegExp.exec(line, this.longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = "";
                        insideLongComment = false;
```
 This long comment hasn't been closed, so we should parse it for links.

```typescript
                   
                    } else {
                        file.lines[lineNumber].longComment = true;
                        if (longCommentOpenMatch) {
                            file.lines[lineNumber].comment = longCommentOpenMatch[1].trim();
                        } else {
                            let match = XRegExp.exec(line, this.longCommentLineRegExp, 0);
                            file.lines[lineNumber].comment =  " " + match[1].trim() || line;
                        }
                        that.parseComment(line, fileName, lineNumber)
                        .then(() => {
                            if (last) {
                                that.writeOutFile(file)
                                    .then(() => {
                                        resolve(null);
                                        return false;
                                    })
                                    .catch((err) => {
                                        logger.fatal(err.message);
                                    });
                            }
                        });
                    }
```
 If this is the last line, then we can wrap things up.

```typescript
                   
                    if (last) {
                        that.writeOutFile(file)
                        .then(() => {
                            resolve(null);
                            return false;
                        })
                        .catch((err) => {
                            logger.fatal(err.message);
                        });
                    }
                }
                lineNumber++;
            });
        });
    }
```
 ## Write Out File

 Writes out a file map

```typescript
    writeOutFile(file: IFile) {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let filePathArray = path.join(parseLoc, file.name + ".json").split("/");
            filePathArray.pop();
            let filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                    reject(err);
                }
                else {
                    logger.debug("Saving output for: " + file.name);
                    writeFileSync(path.join(parseLoc, file.name + ".json"), JSON.stringify(file), { flag: "w" });
                    resolve(null);
                }
            });
        });
    }
```
 ## Parse Comment

 Once a comment is found (see [ParseFile](../.././ts/modules/referenceParser.ts.md#ParseFile)  above for example) this will parse

 that commant for anchors. It will add those anchors to the [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#interfaces/IReferenceCollection) 

 for the entire project.

```typescript
    parseComment(comment: string, fileName: string, lineNumber: number): Q.Promise<{}> {
        let that = this;
        return Q.Promise<{}>((resolve, reject) => {
            let pos = 0;
            let match;
            while (match = XRegExp.exec(comment, that.anchorRegExp, pos, false)) {
                logger.debug("found anchor: " + match[1]);
                let parts = match[1].split("/");
                that.rootCollection.addAnchorTag(parts, fileName, lineNumber);
                resolve(null);
                pos = match.index + match[0].length;
            }
            resolve(null);
        });
    };
}
```
