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

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::HtmlGenerator");


export interface IHtmlGenerator {

}

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

    constructor(config: Config) {
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

    public generate(cleanUp?: boolean): void {
        let that = this;
        let clean = cleanUp || false;
        readFiles(parseLoc, {match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true}, (err, content, next) => {
            that.proccessFile(err, content, next, that.outputDir);
        }, (err, files) => {
            that.generateIndexPage();
            if (clean) {
                that.cleanUp(err, files);
            }
        });

        fse.copySync(path.join(this.projectPath, "templates", "highlight.pack.js"), path.join(this.outputDir, "scripts/highlight.js"));
        fse.copySync(path.join(this.projectPath, "templates", "css", "default.css"), path.join(this.outputDir, "css/default.css"));
    }

    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        let file: IFile = JSON.parse(content);
        logger.info("Processing " + file.name);


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
            if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "comment") {
                     outputMap.items[outputMap.items.length - 1].content +=  "\n" + file.lines[i].comment;
                } else {
                     outputMap.items.push({content: file.lines[i].comment, type: "comment", longComment: file.lines[i].longComment || false });
                }
            }

            if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== "" && file.lines[i].code !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "code") {
                     outputMap.items[outputMap.items.length - 1].content  +=  "\n" + file.lines[i].code;
                } else {
                    outputMap.items.push({content: file.lines[i].code, type: "code", lang: file.type});
                }
            }
         }
        let output = this.template(outputMap);

        // let outputMap = file;
        // outputMap.linkPrefix = this.getLinkPrefix(file.name);
        // outputMap.project = this.projectName;
        // let output = this.template(outputMap);
        let filePathArray = path.join(outputDir, file.name + ".md").split("/");
        filePathArray.pop();
        let filePath = filePathArray.join("/");

        mkdirp(filePath, function (err) {
            if (err) {
                logger.fatal(err.message);
            }
            else {
                logger.info("Saving output for " + file.type + " file " + file.name);
                writeFileSync(path.join(outputDir, file.name + ".html"), output, { flag: "w" });
                next();
            }
        });
    }

    replaceAnchors(comment: string,  fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
        // Look at the line for anchors - replace them with links. 
        while (match = XRegExp.exec(newComment, this.anchorRegExp, pos, false)) {
            newComment =  newComment.substr(0, match.index) +
            " <a name=\"" + match[1] + "\"><span class=\"glyphicon glyphicon-link\" aria-hidden=\"true\"></span>" + match[1] + "</a> " +
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

        // Look at the line for anchors - replace them with links. 
        while (match = XRegExp.exec(newComment, this.linkRegExp, pos, false)) {
            let tag =  _.findWhere(this.tags, {anchor: match[1]});
            if (!tag) {
                logger.error("link: " + match[1] + " in " + fileName + ":" + line + " does not have a cooresponding anchor, so link cannot be created.");
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

    replaceExternalLinks(comment: string, fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;

        // Look at the line for external references - replace them with links. 
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

    generateIndexPage(): void {
        logger.info("generating index.html");
        let that = this;

        let outputMap = {
            project: this.projectName,
            collections: [],
            files: [],
            readme: ""
        };

        // collections
        let collections = that.referenceCollection.getTagsByCollection();

        for (let i = 0; i < collections.length; i++) {
            let anchors = _.clone(collections[i].anchors);
            for (let x = 0; x < anchors.length; x++) {
                let linkPrefix = that.getLinkPrefix(anchors[x].path);
                anchors[x].path = anchors[x].path + ".html#" + anchors[x].linkStub;
            }
            outputMap.collections.push({
                name: collections[i].name,
                anchors: anchors
            });
        }

        files(this.outputDir, (error, files) => {

            // Files
            for (let i = 0; i < files.length; i++) {
                let fileNameArray = files[i].split(".");
                let extension = fileNameArray[fileNameArray.length - 1];
                if (extension === "html") {
                    let pathArray: string[] = files[i].split("/");
                    pathArray.shift(); // shift the output dir off the file name.
                    let path = pathArray.join("/");
                    outputMap.files.push({path: path});
                }
            }

            outputMap.readme = readFileSync(that.readme).toString();
            let output = this.indexTemplate(outputMap);
            writeFileSync(path.join(that.outputDir, "index.html"), output, { flag: "w" });
        });
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

    // > NOTE: Without this code, the link will not properly navigated deeply nested pages with relative linking.
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