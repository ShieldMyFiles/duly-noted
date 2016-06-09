import {IConfig} from "./classes/IConfig";
import {ReferenceParser} from "./modules/referenceParser";
import parseArgs = require("minimist");
import _ = require("underscore");
import * as path from "path";
import glob = require("glob");
import Q = require("q");
import {MarkdownGenerator} from "./generators/markdownGenerator";
import {HtmlGenerator} from "./generators/Htmlgenerator";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::run");

export function run () {
    logger.info("Welcome to Duly Noted.");
    let args = parseArgs(process.argv.slice(2));
    let config: IConfig;

    // Parse config file
     if (args["c"]) {
        config = require(args["c"]);
     } else {
        config = require(process.cwd() + "/duly-noted.json");
     }

     let getFiles: Q.IPromise<string[]>[] = [];

     for (let i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
     }

     Q.all(getFiles)
     .then((results) => {
         let files = _.flatten(results);
         let referenceParser = new ReferenceParser(files,
                                                   new RegExp(config.commentRegExp),
                                                   new RegExp(config.anchorRegExp),
                                                   new RegExp(config.longCommentOpenRegExp),
                                                   new RegExp(config.longCommentLineRegExp),
                                                   new RegExp(config.longCommentCloseRegExp),
                                                   config.outputDir);
         referenceParser.parse()
         .then((response) => {
             logger.info("parsing complete, beginning export of HTML");
             new HtmlGenerator(config.outputDir, path.join(__dirname, "templates", "basic.html"), new RegExp(config.anchorRegExp), new RegExp(config.linkRegExp)).generate();
             //new MarkdownGenerator(config.outputDir).generate();
         })
         .catch( (err: Error) => {
             logger.error(err.message + err.stack);
         });
     });
}

function getFilesFromGlob(globString: string): Q.Promise<string[]> {
    return Q.Promise<string[]>((resolve, reject) => {
        glob(globString, (err, files: string[]) => {
            if (err) reject(err);
            resolve(files);
        });
    });
}
