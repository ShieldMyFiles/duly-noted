import {IConfig} from "./classes/IConfig";
import {ReferenceParser} from "./modules/referenceParser";
import parseArgs = require("minimist");
import _ = require("underscore");
import glob = require("glob");
import Q = require("q");
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
         let referenceParser = new ReferenceParser(files, new RegExp(config.commentRegExp), new RegExp(config.anchorRegExp));
         referenceParser.parse()
         .then((response) => {
             logger.debug(response);
         })
         .catch( (err) => {
             logger.error(err.message);
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