import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {IConfig, IExternalReference} from "../classes/IConfig";
import {readFiles} from "node-dir";
import {IFile, ILine} from "../classes/IFile";
import XRegExp = require("xregexp");
import {writeFileSync, mkdirSync, accessSync, F_OK, unlinkSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";
import _ = require("underscore");

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

    constructor(config: IConfig) {
        this.outputDir = config.outputDir;
        this.externalReferences = JSON.parse(readFileSync(path.join(this.outputDir, "externalReferences.json")).toString());
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.linkRegExp = new RegExp(config.linkRegExp);
        this.referenceCollection = new ReferenceCollection("").inflate(JSON.parse(readFileSync(path.join(this.outputDir, "internalReferences.json")).toString()));
        this.tags = this.referenceCollection.getAllTags();

    }

    public generate(): void {
        let that = this;
        readFiles(this.outputDir, {match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true}, (err, content, next) => {
            that.proccessFile(err, content, next, that.outputDir);
        }, that.cleanUp);
    }

    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        let file: IFile = JSON.parse(content);
        logger.info("Processing " + file.name);

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

                // Comment
                if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                    if (inCodeBlock) {
                        output += "```" + "\n"; // Close the current block of code. 
                        inCodeBlock = false;
                    }

                    if (!file.lines[i].longComment) {
                        output += "> ";
                    }

                        output += file.lines[i].comment + "\n" + "\n";
                }

                // Code
                if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== "" && file.lines[i].code !== null) {
                    if (!inCodeBlock) {
                        output += "```" + file.type +  "\n"; // Open new code block. 
                        inCodeBlock = true;
                    }
                    output += file.lines[i].code + "\n";
                }
            }

            if (inCodeBlock) {
                output += "```" + "\n"; // Close the current block of code. 
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
                    logger.info("Saving output for " + file.type + " file " + file.name);
                    writeFileSync(path.join(outputDir, file.name + ".md"), output, { flag: "w" });
                }
            });

            next();
        }
    }


    replaceAnchors(comment: string,  fileName: string, line: number) {
        let pos = 0;
        let match;
        let newComment: string = comment;
        // Look at the line for anchors - replace them with links. 
        while (match = XRegExp.exec(newComment, this.anchorRegExp, pos, false)) {
            newComment =  newComment.substr(0, match.index - 1) +
            "[" + match[1] + "](#" + match[1] + ")";
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
                newComment =  comment.substr(0, match.index - 1) +
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


    // > NOTE: Without this code, the link will not properly navigated deeply nested pages with relative linking.
    getLinkPrefix(fileName: string): string {
        let fileNameAsArray = fileName.split("/");
        let linkPrefix = "";
        for (let i = 0; i < fileNameAsArray.length - 2; i++) {
            linkPrefix += "../";
        }

        return linkPrefix;
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
}

