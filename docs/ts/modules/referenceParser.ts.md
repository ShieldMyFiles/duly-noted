

# <a name="referenceparser" id="referenceparser" ></a>[🔗ReferenceParser](#user-content-referenceparser)
 @authors/chris[authors/chris](../.././authors.md.md#user-content-authors-chris)
 @license[license](../.././license.md.md#user-content-license)

```typescript

import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IConfig, IExternalReference} from "../classes/IConfig";
import {IFile, ILine} from "../classes/IFile";
import {getFileType} from "../helpers/fileType";
import {writeFileSync, mkdirSync, accessSync, F_OK, openSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import XRegExp = require("xregexp");
import lineReader = require("line-reader");
import Q = require("q");
import {doInOrder, doNext} from "../helpers/helpers";

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceParser");

```

## <a name="interfaces-ireferenceparser" id="interfaces-ireferenceparser" ></a>[🔗interfaces/IReferenceParser](#user-content-interfaces-ireferenceparser)

```typescript
export interface IReferenceParser {
    parse(): Q.Promise<IReferenceCollection>;
}

```

## <a name="constant-parseloc" id="constant-parseloc" ></a>[🔗constant/parseLoc](#user-content-constant-parseloc)

```typescript
export const parseLoc = "duly-noted";
```

## <a name="constant-commentpatterns" id="constant-commentpatterns" ></a>[🔗constant/commentPatterns](#user-content-constant-commentpatterns)

```typescript
export const commentPatterns = "duly-noted";


```

## <a name="classes-referenceparser" id="classes-referenceparser" ></a>[🔗classes/ReferenceParser](#user-content-classes-referenceparser)

```typescript
export class ReferenceParser implements IReferenceParser {
    files: string[];
    rootCollection: IReferenceCollection;
    anchorRegExp: RegExp;
    commentPatterns: {}[];
    externalReferences: IExternalReference[];

```

### Creates an instance of @classes/ReferenceParser[classes/ReferenceParser](../.././ts/modules/referenceParser.ts.md#user-content-classes-referenceparser)

```typescript
    constructor(config: IConfig, logLevel?: string) {
        this.files = config.files;
        this.rootCollection = new ReferenceCollection(parseLoc, logLevel);
        this.anchorRegExp = new RegExp(config.anchorRegExp);

        let commentPatternsFile = path.join(__dirname, "../../bin/comment-patterns.json");
        logger.debug("Loading Comment Patterns from " + commentPatternsFile);
        this.commentPatterns = JSON.parse(readFileSync(commentPatternsFile).toString());
        this.externalReferences = config.externalReferences;
        logger.setLevel(logLevel || "DEBUG");
        logger.debug("ready");
    }

```

## Parse 
Parser all files for anchors - produce a @interfaces/IReferenceCollection[interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#user-content-interfaces-ireferencecollection)

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
Parse a file to a file map. <a name="parsefile" id="parsefile" ></a>[🔗ParseFile](#user-content-parsefile)

```typescript
    parseFile(fileName: string): Q.Promise<{}> {
        logger.debug("parsing code file: " + fileName);
        let that = this;
        let file: IFile;
        let insideLongComment = false;
        return Q.Promise((resolve, reject) => {
            let commentRegExp;
            let longCommentOpenRegExp;
            let longCommentLineRegExp;
            let longCommentCloseRegExp;

            logger.debug("Working on file: " + fileName);
            file = {
                name: fileName,
                lines: [],
                type: getFileType(fileName)
            };

```
 Load comment RegEx based on file type
```typescript
           
            if (that.commentPatterns[file.type]) {
                logger.debug("Using comment patten for " + file.type);
                commentRegExp = new RegExp(that.commentPatterns[file.type]["commentRegExp"]);

                if (that.commentPatterns[file.type]["longCommentOpenRegExp"]) longCommentOpenRegExp =  new RegExp(that.commentPatterns[file.type]["longCommentOpenRegExp"]);
                else longCommentOpenRegExp = undefined;

                if (that.commentPatterns[file.type]["longCommentLineRegExp"]) longCommentLineRegExp =  new RegExp(that.commentPatterns[file.type]["longCommentLineRegExp"]);
                else longCommentLineRegExp = undefined;

                if (that.commentPatterns[file.type]["longCommentCloseRegExp"]) longCommentCloseRegExp =  new RegExp(that.commentPatterns[file.type]["longCommentCloseRegExp"]);
                else longCommentLineRegExp = undefined;
            } else {
                logger.debug("Using default comment patten.");
                commentRegExp =  new RegExp(that.commentPatterns["default"]["commentRegExp"]);
                longCommentOpenRegExp =  new RegExp(that.commentPatterns["default"]["longCommentOpenRegExp"]);
                longCommentLineRegExp =  new RegExp(that.commentPatterns["default"]["longCommentLineRegExp"]);
                longCommentCloseRegExp =  new RegExp(that.commentPatterns["default"]["longCommentCloseRegExp"]);
            }

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
               
                let longCommentOpenMatch;
                if (longCommentOpenRegExp) {
                    longCommentOpenMatch = XRegExp.exec(line, longCommentOpenRegExp, 0, false);
                } else {
                    longCommentOpenMatch = false;
                }

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
                    let match = XRegExp.exec(line, commentRegExp, 0, false);

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
               
                } else {

                    file.lines[lineNumber].longComment = true;

                    if (longCommentOpenMatch) {
                        file.lines[lineNumber].comment = longCommentOpenMatch[1];
                    } else {
                        let match = XRegExp.exec(line, longCommentLineRegExp, 0);
                        if (match && match[1]) {
                            file.lines[lineNumber].comment = match[1];
                        } else {
```
 Blank Line inside long comment...
```typescript
                            file.lines[lineNumber].comment = "";
                        }
                    }

```
 If this line contains a long comment closing symbol, then next line isn't long comment, and we can remove the closing tag
```typescript
                   
                    if (XRegExp.exec(line, longCommentCloseRegExp, 0)) {
                        file.lines[lineNumber].comment = file.lines[lineNumber].comment.replace(longCommentCloseRegExp, "");
                        insideLongComment = false;
                    };

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
Once a comment is found (see @ParseFile above for example) this will parse[ParseFile](../.././ts/modules/referenceParser.ts.md#user-content-parsefile)
that commant for anchors. It will add those anchors to the @interfaces/IReferenceCollection [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#user-content-interfaces-ireferencecollection)
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