/** !Index/main
 * # Main Program File
 * @authors/chris
 * @license
 *
 * This is the entry file to Duly Noted, 
 * it contains function that launches from the Command Line
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

/** !Index/run
 * ## Run
 * 
 * Basic code flow is:
 * 
 * 1. parse the cofiguration options using the following order of precedence:
 *      1. Command Line Input
 *      2. User's Config File (`duly-noted.json`)
 *      3. Defaults values (see @issue/3)
 * 2. get the files and pass those to the @ReferenceParser/parse
 * 3. output the reponse to either/both @HtmlGenerator/generate or @MarkdownGenerator/generate
 */
export function run() {
    logger.info("Welcome to Duly Noted.");
    let logLevel: string;
    let config: IConfig;
    let defaults: IConfig = JSON.parse(readFileSync(__dirname + "/../bin/defaults.json").toString());
    let packageJSON: any = JSON.parse(readFileSync(__dirname + "/../package.json").toString());
    logger.info(packageJSON.description);

    program
        .version(packageJSON.version)
        .option("-c, --config <file>", "Path to duly-noted.json", "duly-noted.json")
        .option("-o, --outputDir <path>", "Path to output docs to")
        .option("-g, --generator <generator>", "Generator to use.")
        .option("-i, --init", "Creates a default duly-noted.json file")
        .option("-v, --verbose", "Chatty Cathy mode")
        .parse(process.argv);

    //### Set verbose mode
    if (program.verbose) {
        logLevel = "DEUBG";
    } else {
        logLevel = "INFO";
    }
    logger.setLevel(logLevel);


    //!Index/init
    //### Init - copies example duly-noted.json from @default-duly-noted-json
    if (program.init) {
        try {
            let config = JSON.parse(readFileSync("duly-noted.json").toString());
            logger.fatal("It looks like you already have a 'duly-noted.json' file. Please just update that one.");
            return;
        } catch (err) {
            let projectPathArray = __dirname.split("/");
            let projectPath = projectPathArray.join("/");
            let dnJSON = readFileSync(path.join(projectPath, "/../bin/default.duly-noted.json")).toString();
            writeFileSync("duly-noted.json", dnJSON);
            logger.info("duly-noted.json file created. YOU SHOULD UPDATE IT TO FIT YOUR NEEDS.");
            logger.info("Seriously, stop reading the console, and go update your brand new duly-noted.json file aleady!");
            return;
        }
    }

    //### Load the config file, or advise init
    try {
        logger.info("Parsing config file.")
        config = JSON.parse(readFileSync(program.config).toString());
    } catch (error) {
        logger.error(error.message);
        logger.warn("Error reading config file: " + program.config + " Try running init first.");
        return;
    }

    /**
     * ## Set settings
     * Settings are in order of precedence
     * 
     * 1. Command Line Input
     * 2. User's Config File
     * 3. Defaults values (see @issue/3)
     */

    // Set outputDir
    config.outputDir = program.outputDir || config.outputDir || defaults.outputDir;

    // Set generator
    if (program.generator) {
        config.generators = [program.generator];
    } else {
        config.generators = config.generators || defaults.generators;
    }

    // Get file actions
    let getFiles: Q.IPromise<string[]>[] = [];

    for (let i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
    }

    // MarkdownGenerator Settings
    if (!config.markdownGeneratorOptions) {
        config.markdownGeneratorOptions = defaults.markdownGeneratorOptions;
    }

    if (!config.markdownGeneratorOptions.gitHubHtmlAnchors) {
        config.markdownGeneratorOptions.gitHubHtmlAnchors = defaults.markdownGeneratorOptions.gitHubHtmlAnchors;
    }

    if (!config.markdownGeneratorOptions.htmlAnchors) {
        config.markdownGeneratorOptions.htmlAnchors = defaults.markdownGeneratorOptions.htmlAnchors;
    }

    logger.debug("Starting Reference Parsing.");

    // Run @Index/getFiles on each glob, wait for all actions.
    Q.all(getFiles)
        .then((results) => {
            let files = _.flatten(results);
            let referenceParser = new ReferenceParser(config, logLevel);

            /**
             * Then pass each of the files into the @ReferenceParser/parse
             * The output of this will be a JSON map of the references for 
             * all of the files, along with line-by-line comment maps.
             */
            referenceParser.parse()
                .then((response) => {

                    /**
                     * Once parsed, trigger generators. 
                     * These will use the JSON maps created by @ReferenceParser/parse 
                     * and build the output documentation files.
                     */
                    logger.info("Parsing complete, beginning export.");
                    let generatorActions = [];

                    // Trigger @HtmlGenerator/generate
                    if (_.contains(config.generators, "html")) {
                        generatorActions.push(new HtmlGenerator(config, logLevel).generate());
                    }

                    // Trigger @MarkdownGenerator/generate
                    if (_.contains(config.generators, "markdown")) {
                        generatorActions.push(new MarkdownGenerator(config, logLevel).generate());
                    }

                    Q.all(generatorActions)
                        .then(() => {
                            // Once all generators are done we can clean up JSON maps.
                            if (!config.leaveJSONFiles) {
                                logger.info("Cleaning up - Removing JSON parse files.");
                                deleteDir(parseLoc);
                            }
                        });
                })
                .catch((err: Error) => {
                    // !todo/report-errors An overall strategy is needed to identify and report errors.
                    logger.error(err.message + err.stack);
                });
        });
}

/** !Index/getFiles
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

/** !Index/deleteDir
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
