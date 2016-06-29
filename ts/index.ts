/**
 * # !Index
 * @authors/chris
 * @license
 *
 * This is the entry file to Duly Noted
 */
import {IConfig} from "./classes/IConfig";
import program = require("commander");
import {writeFileSync, mkdirSync, accessSync, F_OK, unlinkSync, readFileSync, readdirSync, rmdirSync, statSync} from "fs";
import {ReferenceParser, parseLoc} from "./modules/referenceParser";
import _ = require("underscore");
import * as path from "path";
import glob = require("glob");
import Q = require("q");
import {MarkdownGenerator} from "./generators/markdownGenerator";
import {HtmlGenerator} from "./generators/htmlGenerator";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::run");


/**
 * ## Run
 * 
 * Runs duly-typed using taking the consuing the config file (see @IConfig) found as `/duly-noted.json` 
 * Basic code flow is:
 *  1. parse the cofiguration options
 *  2. get the files, and pass those to the @ReferenceParser
 *  3. output the reponse to either/both @HtmlGenerator or @MarkdownGenerator
 */
export function run () {
    logger.info("Welcome to Duly Noted.");
    let logLevel: string;
    let config: IConfig;

    program
    .version("1.1.0")
    .option("-c, --config <file>", "Path to duly-noted.json", "duly-noted.json")
    .option("-o, --outputDir <path>", "Path to output docs to")
    .option("-g, --generator <generator>", "Generator to use.")
    .option("-i, --init", "Creates a default duly-noted.json file")
    .option("-v, --verbose", "Chatty Cathy mode")
    .parse(process.argv);

     // ### Init - copies example duly-noted.json
     if (program.init) {
        try {
          let config = JSON.parse(readFileSync("duly-noted.json").toString());
          logger.fatal("It looks like you already have a 'duly-noted.json' file. Please just update that one.");
          return;
        } catch (err) {
            let projectPathArray = __dirname.split("/");
            let projectPath = projectPathArray.join("/");
            let dnJSON = readFileSync(path.join(projectPath, "default.duly-noted.json")).toString();
            writeFileSync("duly-noted.json", dnJSON);
            logger.info("duly-noted.json file created. YOU NEED TO UPDATE IT TO FIT YOUR NEEDS. Duly Noted will not work off-the-shelf.");
            logger.info("Seriously, stop reading the console, and go update your brand new duly-noted.json file aleady!");
            return;
        }
     }

     try {
        config = JSON.parse(readFileSync(program.config).toString());
     } catch (error) {
         logger.error(error.message);
         logger.fatal("Error reading config file: " + program.config);
         return;
     }

     config.outputDir = program.outputDir || config.outputDir;

     if (program.generator) {
         config.generators = [program.generator];
     }

     let getFiles: Q.IPromise<string[]>[] = [];

     for (let i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
     }

     if (program.verbose) {
         logLevel = "DEUBG";
     } else {
         logLevel = "INFO";
     }

     logger.setLevel(logLevel);

    logger.debug("Starting Reference Parsing.");
     Q.all(getFiles)
     .then((results) => {
         let files = _.flatten(results);
         let referenceParser = new ReferenceParser(config, logLevel);

         referenceParser.parse()
         .then((response) => {
             logger.info("Parsing complete, beginning export.");
             let generatorActions = [];

             if (_.contains(config.generators, "html")) {
                generatorActions.push(new HtmlGenerator(config, logLevel).generate());
             }

             if (_.contains(config.generators, "markdown")) {
                generatorActions.push(new MarkdownGenerator(config, logLevel).generate());
             }

             Q.all(generatorActions)
             .then(() => {
                 logger.info("Cleaning up - Removing JSON parse files.");
                 deleteDir(parseLoc);
             });
         })
         .catch( (err: Error) => {
             // !TODO/errors > An overall strategy is needed to identify errors.
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

/**
 * ## Delete a directory
 * This is a simple helper to recursively delete a directory, and any sub-directories and files it contains.
 */
function deleteDir(dirPath) {
    let files = [];

    try { files = readdirSync(dirPath); }
    catch (e) { return; }

    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = dirPath + "/" + files[i];
            if (statSync(filePath).isFile()) {
                unlinkSync(filePath);
            } else {
                deleteDir(filePath);
            }
        }
    }

    rmdirSync(dirPath);
};
