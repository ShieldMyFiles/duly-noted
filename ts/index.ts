/**
 * # !Index
 * @authors/chris
 * @license
 * 
 * This is the entry file to Duly Noted
 */
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


/**
 * ## Run
 * 
 * Runs duly-typed using taking the consuing the config file (see @IConfig) found as `/duly-noted.json` 
 * Basic code flow is:
 *  1. parse the cofiguration options
 *  2. get the files, and pass those to the @ReferenceParser
 *  3. output the reponse to either/both @Htmlgenerator or @MarkdownGenerator
 */
export function run () {
    logger.info("Welcome to Duly Noted.");
    let args = parseArgs(process.argv.slice(2));
    let config: IConfig;

    // !TODO/config > This needs more flexible support for command line options
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
         let referenceParser = new ReferenceParser(config);

         referenceParser.parse()
         .then((response) => {
             // !TODO/set-generators > This needs more flexible support selecting the generators from the command line / config
             logger.info("parsing complete, beginning export of HTML");
             // new HtmlGenerator(config).generate();
             new MarkdownGenerator(config).generate(true);
         })
         .catch( (err: Error) => {
             // !TODO/errors > An overall stratefy is needed to identify errors.
             logger.error(err.message + err.stack);
         });
     });
}

/**
 * ## Get Files from Glob
 * This is a simple helper to get a set of files from a glob.
 */
function getFilesFromGlob(globString: string): Q.Promise<string[]> {
    return Q.Promise<string[]>((resolve, reject) => {
        glob(globString, (err, files: string[]) => {
            if (err) reject(err);
            resolve(files);
        });
    });
}
