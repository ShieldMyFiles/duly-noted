import {IReferenceCollection, IAnchor, ReferenceCollection} from "../classes/referenceCollection";
import {readFiles} from "node-dir";
import {IFile, ILine} from "../classes/IFile";
import {writeFileSync, mkdirSync, accessSync, F_OK, unlinkSync, readFileSync} from "fs";
import mkdirp = require("mkdirp");
import * as path from "path";

import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::MarkdownGenerator");


export interface IMarkdownGenerator {
    generate(): void;
}

export class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    collection: IReferenceCollection;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
        this.collection = JSON.parse(readFileSync(path.join(outputDir, "references.json")).toString());
    }

    public generate(): void {
        let that = this;
        readFiles(this.outputDir, {match: /.json$/, exclude: /tags.json/}, (err, content, next) => {
            that.proccessFile(err, content, next, that.outputDir);
        }, that.cleanUp);
    }

    proccessFile(err: Error, content: string, next: Function, outputDir: string): void {
        if (err) {
            logger.error(err.message);
        } else {
            let file: IFile = JSON.parse(content);
            let output: string = "";
            let inCodeBlock = false;
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

