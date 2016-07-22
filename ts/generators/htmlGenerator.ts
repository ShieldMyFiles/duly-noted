/** !HtmlGenerator/main
 * # HtmlGenerator
 * @authors/chris
 * @license
 * 
 * Generates HTML pages for the source code, 
 * replacing links and anchors as it goes along. 
 * Builds a nice Index.html page with info and 
 * README.md content. 
 * 
 * This is a generator that takes the reference maps produced by
 * @ReferenceParser/parse and turns them into nice markdown documentation files.
 * 
 * > Note this Uses tempalates that employ handlebars as the 
 * templating engine.
 * 
 */

import {IAnchor, ITag, ReferenceCollection} from "../classes/referenceCollection";
import {parseLoc} from "../modules/referenceParser";
import {IConfig, IExternalReference} from "../classes/IConfig";
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

/**
 * !interfaces/IHtmlGenerator
 */
export interface IHtmlGenerator {

}

/** !HtmlGenerator/class
 * ## Html Generator Class
 */
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

    /** !HtmlGenerator/constructor
     * ### Creates an instance of @HtmlGenerator/class
     */
    constructor(config: IConfig, logLevel?: string) {
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

        this.template = handlebars.compile(readFileSync(path.join(__dirname, "../../bin/templates", "stacked.html")).toString());
        this.indexTemplate = handlebars.compile(readFileSync(path.join(__dirname, "../../bin/templates", "index.html")).toString());

        this.projectName = config.projectName;
        this.readme = config.readme;

        handlebars.registerHelper("md", this.markdownHelper);
        handlebars.registerHelper("ifCond", this.ifCondHelper);
    }


    /** !HtmlGenerator/generate
     * ## Generate HTML Docs
     * Creates HTML docs for a set of file maps and reference maps set in @HtmlGenerator/constructor .
     */
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

    /** !HtmlGenerator/processFiles
     * ## Process Files
     * Processes the file map for a file, making output decisions based on 
     * code, comment, long comment 
     */
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        let file: IFile = JSON.parse(content);
        logger.debug("Processing " + file.name);


        for (let i = 0; i < file.lines.length; i++) {
            if (typeof(file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                file.lines[i].comment = this.replaceAnchors(file.lines[i].comment, file.name, i);
                file.lines[i].comment = this.replaceLinks(file.lines[i].comment, file.name, i);
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

    /** !HtmlGenerator/replaceAnchors
     * ## Replace Anchors
     * Processes a comment line, replacing anchors with markdown anchor link tags
     */
    replaceAnchors(comment: string,  fileName: string, line: number, position?: number) {
        let pos = position || 0;

        // Look at the line for anchors - replace them with links. 
        let match = XRegExp.exec(comment, this.anchorRegExp, pos, false);

        if (!match) {
            return comment;
        } else {

            let anchor = match[1].replace(/\//g, "-").toLowerCase();
            let replacementText = '<a name="' + anchor + '" id="' + anchor + '" ></a>';
            replacementText += "[🔗](#" + anchor + ")";

            comment = comment.replace(match[0], replacementText);
            return this.replaceAnchors(comment, fileName, line, pos + match[0].length);
        }
    }

    /** !HtmlGenerator/replaceLinks
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
            let externalTag =  _.clone(_.findWhere(this.externalReferences, {anchor: tagArray[0]}));
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
                logger.warn("link: " + match[1] + " in " + fileName + ":" + line + ":" + pos + " does not have a corresponding anchor, so link cannot be created.");
                return comment;
            } else {
                logger.debug("found internal link: " + match[1] + " " + internalTag.path);
                let anchor = match[1].replace(/\//g, "-").toLowerCase();
                comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#" + anchor + ")");
            }
            return this.replaceLinks(comment, fileName, line, pos + match[0].length);
        }
    }

     /** !HtmlGenerator/generateIndexPage
     * ## Generates the "Index Page"
     * This generates the index page, listing all the link collections, 
     * and sucks in the user's defined README. 
     */
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
            let name = collections[i].name.split("/");
            name.shift();
            name.shift();
            name = name.join("/");

            for (let x = 0; x < anchors.length; x++) {
                let anchor = anchors[x].linkStub.replace(/\//g, "-").toLowerCase();
                anchors[x].path = anchors[x].path + ".html#";
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

            if (this.readme !== null) {
                outputMap.readme = readFileSync(that.readme).toString();
            }
            let output = this.indexTemplate(outputMap);
            writeFileSync(path.join(that.outputDir, "index.html"), output, { flag: "w" });
        });
    }

    /** !HtmlGenerator/getLinkPrefix
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

    // ## Handlebars Template Helpers

    /** HtmlGenerator/markdownHelper
     * Handlebars Template helper - renders MD in template view.
     */
    markdownHelper(context, options) {
       return marked(context);
    }

    /** HtmlGenerator/ifCondHelper
     * Handlebars Template helper - provides if confition logic for template view.
     */
    ifCondHelper(v1, v2, options) {
        if (v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    };
}