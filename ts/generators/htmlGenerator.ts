import {IReferenceCollection, IAnchor, ITag, ReferenceCollection} from "../classes/referenceCollection";
import {readFiles} from "node-dir";
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
    collection: IReferenceCollection;
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    template: any;
    projectPath: string;
    referenceCollection: IReferenceCollection;
    tags: ITag[] = [];

    constructor(outputDir: string, templatePath: string, anchorRegExp: RegExp, linkRegExp: RegExp) {
        this.outputDir = outputDir;
        this.collection = JSON.parse(readFileSync(path.join(outputDir, "references.json")).toString());
        this.anchorRegExp = anchorRegExp;
        this.linkRegExp = linkRegExp;
        this.referenceCollection = new ReferenceCollection("").inflate(JSON.parse(readFileSync(path.join(this.outputDir, "references.json")).toString()));
        this.tags = this.referenceCollection.getAllTags();
        this.template = handlebars.compile(readFileSync(templatePath).toString());
        let projectPathArray = __dirname.split("/");
        projectPathArray.pop();
        this.projectPath = projectPathArray.join("/");

        handlebars.registerHelper("md", this.markdownHelper);
    }

    public generate(): void {
        let that = this;
        readFiles(this.outputDir, {match: /.json$/, exclude: /references.json/}, (err, content, next) => {
            that.proccessFile(err, content, next, that.outputDir);
        }, that.cleanUp);

        fse.copySync(path.join(this.projectPath, "templates", "highlight.pack.js"), path.join(this.outputDir, "scripts/highlight.js"));
    }

    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        // Prepare Map by converting anchors and links.
        let file: IFile = JSON.parse(content);

        for (let i = 0; i < file.lines.length; i++) {
            if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                file.lines[i].comment = this.replaceAnchors(file.lines[i].comment, file.name, i);
                file.lines[i].comment = this.replaceLinks(file.lines[i].comment, file.name, i);
            }
        }

        let output = this.template(file);
        writeFileSync(path.join(outputDir, file.name + ".html"), output, { flag: "w" });
    }

    replaceAnchors(comment: string,  fileName: string, line: number) {
        logger.debug("replacing anchors in " + fileName ":" + line);
        let pos = 0;
        let match;
        let newComment: string = comment;
        // Look at the line for anchors - replace them with links. 
        while (match = XRegExp.exec(newComment, this.anchorRegExp, pos, false)) {
            logger.debug("found anchor: " + match[1]);
            newComment =  newComment.substr(0, match.index - 1) +
            " <a name=\"" + match[1] + "\">#" + match[1] + "</a> " +
            //" [" + match[1] + "](#" + match[1] + ") " +
            newComment.substr(match.index + match[0].length);

            pos = match.index + match[0].length;
        }

        logger.debug(newComment);

        return newComment;
    }

    replaceLinks(comment: string, fileName: string, line: number) {
        logger.debug("replacing links in " + fileName + ":" + line + " looking for " + this.linkRegExp);
        let pos = 0;
        let match;
        let newComment: string = comment;
        // Look at the line for anchors - replace them with links. 
        while (match = XRegExp.exec(newComment, this.linkRegExp, pos, false)) {
            logger.debug("found link: " + match[1]);
            let tag =  _.findWhere(this.tags, {anchor: match[1]});
            if (!tag) {
                logger.error("link: " + match[1] + " in " + fileName + ":" + line + " does not have a cooresponding anchor, so link cannot be created.");
            } else {
                newComment =  comment.substr(0, match.index - 1) +
                " [" + match[1] + "](" + tag.path + ".html#" + match[1] + ") " +
                newComment.substr(match.index + match[0].length);
            }
            pos = match.index + match[0].length;
        }

        return newComment;
    }

    cleanUp(err, files) {
        //  if (err) {
        //     logger.error(err.message);
        // } else {
        //     for (let i = 0; i < files.length; i++) {
        //         unlinkSync(files[i]);
        //     }
        // }
    }

    markdownHelper(context, options) {
       return marked(context);
    }

}