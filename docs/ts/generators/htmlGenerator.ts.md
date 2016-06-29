

# [HtmlGenerator](#HtmlGenerator)
 [authors/chris](../.././authors.md.md#authors/chris) 
 [license](../.././license.md.md#license) 

Generates HTML pages for the source code,
replacing links and anchors as it goes along.
Builds a nice Index.html page with info and
README.md content.

Uses tempalate that employ handlebars as the
templating engine.


```typescript

import {IAnchor, ITag, ReferenceCollection} from "../classes/referenceCollection";
import {parseLoc} from "../modules/referenceParser";
import {Config, IExternalReference} from "../classes/IConfig";
import {readFiles, files} from "node-dir";
import {IFile, ILine} from "../classes/IFile";
import {writeFileSync, mkdirSync, accessSync, F_OK, unlinkSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import XRegExp = require("xregexp");
import * as handlebars from "handlebars";
import * as marked from "marked";
import * as fse from "fs-extra";
import _ = require("underscore");
import Q = require("q");
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::HtmlGenerator");

```

[interfaces/IHtmlGenerator](#interfaces/IHtmlGenerator)

```typescript
export interface IHtmlGenerator {

}

```

## [classes/HtmlGenerator](#classes/HtmlGenerator)

```typescript
export class HtmlGenerator implements IHtmlGenerator {
    outputDir: string;
    collection: ReferenceCollection;
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    template: any;
    indexTemplate: any;
    projectPath: string;
    referenceCollection: ReferenceCollection;
    tags: ITag[] = [];
    externalReferences: IExternalReference[];
    readme: string;
    projectName: string;

```

### Creates an instance of [classes/HtmlGenerator](../.././ts/generators/htmlGenerator.ts.md#classes/HtmlGenerator) 

```typescript
    constructor(config: Config, logLevel?: string) {
        logger.setLevel(logLevel || "DEBUG");
        this.outputDir = config.outputDir;
        this.collection = JSON.parse(readFileSync(path.join(parseLoc, "internalReferences.json")).toString());
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.linkRegExp = new RegExp(config.linkRegExp);
        this.referenceCollection = new ReferenceCollection("").inflate(JSON.parse(readFileSync(path.join(parseLoc, "internalReferences.json")).toString()));
        this.externalReferences = JSON.parse(readFileSync(path.join(parseLoc, "externalReferences.json")).toString());
        this.tags = this.referenceCollection.getAllTags();
        let projectPathArray = __dirname.split("/");
        projectPathArray.pop();
        this.projectPath = projectPathArray.join("/");

        this.template = handlebars.compile(readFileSync(path.join(this.projectPath, "templates", "stacked.html")).toString());
        this.indexTemplate = handlebars.compile(readFileSync(path.join(this.projectPath, "templates", "index.html")).toString());

        this.projectName = config.projectName;
        this.readme = config.readme;

        handlebars.registerHelper("md", this.markdownHelper);
        handlebars.registerHelper("ifCond", this.ifCondHelper);
    }


```

## Generate HTML Docs
Creates HTML docs for a set of file maps and reference maps set on [classes/HtmlGenerator](../.././ts/generators/htmlGenerator.ts.md#classes/HtmlGenerator)  construction.

```typescript
    public generate(): Q.IPromise<{}> {
        return Q.Promise((resolve, reject) => {
            logger.info("Generating HTML Documents");
            let that = this;
            readFiles(parseLoc, {match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true}, (err, content, next) => {
                that.proccessFile(err, content, next, that.outputDir);
            }, (err, files) => {
                that.generateIndexPage();
                resolve(null);
            });

            fse.copySync(path.join(this.projectPath, "templates", "highlight.pack.js"), path.join(this.outputDir, "scripts/highlight.js"));
            fse.copySync(path.join(this.projectPath, "templates", "css", "default.css"), path.join(this.outputDir, "css/default.css"));
        });
    }

```

## Process Files
Processes the file map for a file, making output decisions based on
code, comment, long comment presence

```typescript
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        let file: IFile = JSON.parse(content);
        logger.debug("Processing " + file.name);


        for (let i = 0; i < file.lines.length; i++) {
            if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                file.lines[i].comment = this.replaceAnchors(file.lines[i].comment, file.name, i);
                file.lines[i].comment = this.replaceExternalLinks(file.lines[i].comment, file.name, i);
                file.lines[i].comment = this.replaceInternalLinks(file.lines[i].comment, file.name, i);
            }
        }

        let outputMap = {
            project: this.projectName,
            items: [],
            type: file.name,
            name: file.type,
            linkPrefix: this.getLinkPrefix(file.name)
        };

         for (let i = 0; i < file.lines.length; i++) {
            if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "comment") {
                     outputMap.items[outputMap.items.length - 1].content +=  "\n" + file.lines[i].comment;
                } else {
                     outputMap.items.push({content: file.lines[i].comment, type: "comment", longComment: file.lines[i].longComment || false });
                }
            }

            if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "code") {
                     outputMap.items[outputMap.items.length - 1].content  +=  "\n" + file.lines[i].code;
                } else {
                    outputMap.items.push({content: file.lines[i].code, type: "code", lang: file.type});
                }
            }
         }
        let output = this.template(outputMap);

        let filePathArray = path.join(outputDir, file.name + ".md").split("/");
        filePathArray.pop();
        let filePath = filePathArray.join("/");

        mkdirp(filePath, function (err) {
            if (err) {
                logger.fatal(err.message);
            }
            else {
                logger.debug("Saving output for " + file.type + " file " + file.name + " as " + file.name + ".html");
                writeFileSync(path.join(outputDir, file.name + ".html"), output, { flag: "w" });
                next();
            }
        });
    }

```

## Replace Anchors
Processes a comment line, replacing anchors with a:href anchor tags

```typescript
    replaceAnchors(comment: string,  fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
```
 Look at the line for anchors - replace them with links. 
```typescript
       
        while (match = XRegExp.exec(newComment, this.anchorRegExp, pos, false)) {
            newComment =  newComment.substr(0, match.index) +
            " <a name=\"" + match[1] + "\"><span class=\"glyphicon glyphicon-link\" aria-hidden=\"true\"></span>" + match[1] + "</a> " +
            newComment.substr(match.index + match[0].length);

            pos = match.index + match[0].length;
        }

        return newComment;
    }


```

## Replace Links
> Run this AFTER external link replacement to ensure warning accuracy
Processes a comment line, replacing links with links

```typescript
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
                " [" + match[1] + "](" + linkPrefix + tag.path + ".html#" + match[1] + ") " +
                newComment.substr(match.index + match[0].length);
            }
            pos = match.index + match[0].length;
        }

        return newComment;
    }

```

## Replace External Links
> Run this BEFORE internal link replacement
Processes a comment line, replacing links with links to external urls

```typescript
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

```

## Generates the "Index Page"
This generates the index page, listing all the link collections,
and sucks in the README.

```typescript
    generateIndexPage(): void {
        logger.info("generating index.html");
        let that = this;

        let outputMap = {
            project: this.projectName,
            collections: [],
            files: [],
            readme: ""
        };

```
 collections
```typescript
       
        let collections = that.referenceCollection.getTagsByCollection();

        for (let i = 0; i < collections.length; i++) {
            let anchors = _.clone(collections[i].anchors);
            for (let x = 0; x < anchors.length; x++) {
                let linkPrefix = that.getLinkPrefix(anchors[x].path);
                anchors[x].path = anchors[x].path + ".html#" + anchors[x].linkStub;
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

        files(this.outputDir, (error, files) => {

```
 Files
```typescript
           
            for (let i = 0; i < files.length; i++) {
                let fileNameArray = files[i].split(".");
                let extension = fileNameArray[fileNameArray.length - 1];
                if (extension === "html") {
                    let pathArray: string[] = files[i].split("/");
```
 shift the output dir off the file name.
```typescript
                    pathArray.shift();
                    let path = pathArray.join("/");
                    outputMap.files.push({path: path});
                }
            }

            outputMap.readme = readFileSync(that.readme).toString();
            let output = this.indexTemplate(outputMap);
            writeFileSync(path.join(that.outputDir, "index.html"), output, { flag: "w" });
        });
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

    markdownHelper(context, options) {
       return marked(context);
    }

    ifCondHelper(v1, v2, options) {
        if (v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    };
}
```