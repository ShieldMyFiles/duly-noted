/** !MarkdownGenerator/main
 * # Markdown Generator
 *  @authors/chris
 *  @license
 * 
 * This is a generator that takes the reference maps produced by
 * @ReferenceParser/parse and turns them into nice markdown documentation files.
 * 
 * Markdown will be saved to the `outputDir` set in `duly-noted.json`
 */

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


/**
 * !interfaces/IMarkdownGenerator
 */
export interface IMarkdownGenerator {
    generate(): void;
}

/** !MarkdownGenerator/class
 * ## Markdown Generator Class
 */
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

    /** !MarkdownGenerator/constructor
     * ### Creates an instance of @MarkdownGenerator/class
     */
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

        // For a discussion anchors in markdown see @issue/4
        this.htmlAnchors = config.markdownGeneratorOptions.htmlAnchors;
        this.gitHubHtmlAnchors = config.markdownGeneratorOptions.gitHubHtmlAnchors;
    }

    /** !MarkdownGenerator/generate
     * ## Generate Markdown Docs
     * Creates Markdown docs for a set of file maps and reference maps set in @MarkdownGenerator/constructor .
     */
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

    /** !MarkdownGenerator/processFiles
     * ## Process Files
     * Processes the file map for a file, making output decisions based on 
     * code, comment, long comment 
     */
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

                // Comment
                if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== null) {
                    if (inCodeBlock) {
                        output += "\n" + "```" ; // Close the current block of code. 
                        inCodeBlock = false;
                    }

                    output += "\n" + file.lines[i].comment;
                }

                // Code
                if (typeof(file.lines[i].code) === "string" && file.lines[i].code !== null) {
                    if (!inCodeBlock) {
                        output += "\n" + "```" + file.type; // Open new code block. 
                        inCodeBlock = true;
                    }
                    output += "\n" + file.lines[i].code;
                }
            }

            if (inCodeBlock) {
                output += "\n" + "```"; // Close the current block of code. 
                inCodeBlock = false;
            }

            let filePathFull = path.join(outputDir, file.name + ".md");
            let filePath = path.parse(filePathFull).dir;

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

    /** !MarkdownGenerator/replaceAnchors
     * ## Replace Anchors
     * Processes a comment line, replacing anchors with markdown anchor link tags
     */
    replaceAnchors(comment: string,  fileName: string, line: number, position?: number): string {
        let pos = position || 0;

        // Look at the line for anchors - replace them with links. 
        let match = XRegExp.exec(comment, this.anchorRegExp, pos, false);
        let replacementText;

        if (!match) {
            return comment;
        } else {

            let anchor = match[1].replace(/\//g, "-").toLowerCase();

            /**
             * Markdown doesn't natively support acnhors, but you can make them work 
             * with simple html. In GitHub, however, anchors are prefixed with 'user-content'
             * For a discussion anchors in markdown see @issue/4
             */
            if (this.htmlAnchors || this.gitHubHtmlAnchors) {
                replacementText = '<a name="' + anchor + '" id="' + anchor + '" ></a>';

                if (this.gitHubHtmlAnchors) {
                    replacementText += "[🔗](#user-content-" + anchor + ")" + match[1];
                } else {
                    replacementText += "[🔗](#" + anchor + ")" + match[1];
                }
            } else {
                replacementText = "";
            }

            comment = comment.replace(match[0], replacementText);
            return this.replaceAnchors(comment, fileName, line, pos + match[0].length);
        }
    }

    /** !MarkdownGenerator/replaceLinks
     * ## Replace Links
     * Processes a comment line, replacing links with markdown links. 
     * This function calls itself recursively until all links are replaced.
     */
    replaceLinks(comment: string, fileName: string, line: number, position?: number) {
        let pos = position || 0;

        let linkPrefix = this.getLinkPrefix(fileName);

        // Look at the line for anchors - replace them with links. 
        let match = XRegExp.exec(comment, this.linkRegExp, pos, false);

        if (!match) {
            return comment;
        } else {

            // Look external link.
            let tagArray = match[1].split("/");
            let externalTag = _.clone(_.findWhere(this.externalReferences, {anchor: tagArray[0]}));
            if (externalTag) {

                for (let i = 1; i < tagArray.length; i++) {
                    externalTag.path = externalTag.path.replace("::", tagArray[i]);
                }

                logger.debug("found external link: " + externalTag.path);
                let anchor = match[1].replace(/\//g, "-").toLowerCase();
                comment = comment.replace(match[0], " [" + match[1] + "](" + externalTag.path + ") ");
                return this.replaceLinks(comment, fileName, line, pos + match[0].length);
            }

            // Look for internal link.
            let internalTag =  _.findWhere(this.tags, {anchor: match[1]});
            if (!internalTag) {
                // If we can't match this link, then let's just stop processing this line and warn the user.
                logger.warn("link: " + match[1] + " in " + fileName + ":" + line + ":" + pos + " does not have a corresponding anchor, so link cannot be created.");
                return comment;
            } else {
                logger.debug("found internal link: " + match[1] + " " + internalTag.path);
                let anchor = match[1].replace(/\//g, "-").toLowerCase();

                // Make GitHub-hosted Markdown adjustment. See @issue/4
                if (this.gitHubHtmlAnchors) {
                    comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#user-content-" + anchor + ")");
                } else {
                    comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#" + anchor + ")");
                }
            }
            return this.replaceLinks(comment, fileName, line, pos + match[0].length);
        }
    }

    /** !MarkdownGenerator/generateIndexPage
     * ## Generates the "Index Page"
     * This generates the index page, listing all the link collections, 
     * and sucks in the user's defined README. 
     */
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
                let anchor = anchors[x].linkStub.replace(/\//g, "-").toLowerCase();

                anchors[x].path = anchors[x].path + ".md#";

                // Adjustment for gitHub anchor links. See @issue/4
                if (this.gitHubHtmlAnchors) {
                    anchors[x].path += "user-content-";
                }

                if (name !== "") {
                    anchors[x].path += name.replace(/\//g, "-").toLowerCase() + "-";
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
            let name = outputMap.collections[i].name.split("/");
            name.shift();
            name = name.join("/");

            md += "\n#### " + name + " \n";

            for (let x = 0; x < outputMap.collections[i].anchors.length; x++) {
                md += "* [" + outputMap.collections[i].anchors[x].anchor + "]" + "(" + outputMap.collections[i].anchors[x].path + ") \n";
            }
        }

        md += "\n------------------------------ \n";
        md += "\n### Documentation Files \n";

        for (let i = 0; i < outputMap.files.length; i++) {

            /**
             * This shifts off the root folder b/c our index file is inside the output folder, 
             * not one level up. See @issue/5
             * > EXAMPLE: 
             * > docs/myfile.ts.md is linked to as ./myfile.ts.md
             */
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


    /** !MarkdownGenerator/getLinkPrefix
     * Generate a link Prefix from a fileName
     * > NOTE: Without this code, links will not properly navigated to deeply nested pages with relative linking.
     */
    getLinkPrefix(fileName: string): string {
        let fileNameAsArray = fileName.split("/");
        let linkPrefix = "";
        for (let i = 0; i < fileNameAsArray.length - 2; i++) {
            linkPrefix += "../";
        }

        return linkPrefix;
    }
}

