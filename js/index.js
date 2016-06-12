"use strict";
var program = require("commander");
var fs_1 = require("fs");
var referenceParser_1 = require("./modules/referenceParser");
var _ = require("underscore");
var path = require("path");
var glob = require("glob");
var Q = require("q");
var markdownGenerator_1 = require("./generators/markdownGenerator");
var htmlGenerator_1 = require("./generators/htmlGenerator");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::run");
function run() {
    logger.info("Welcome to Duly Noted.");
    var logLevel;
    var config;
    program
        .version("1.1.0")
        .option("-c, --config <file>", "Path to duly-noted.json", "duly-noted.json")
        .option("-o, --outputDir <path>", "Path to output docs to")
        .option("-g, --generator <generator>", "Generator to use.")
        .option("-i, --init", "Creates a default duly-noted.json file")
        .option("-v, --verbose", "Chatty Cathy mode")
        .parse(process.argv);
    if (program.init) {
        try {
            var config_1 = JSON.parse(fs_1.readFileSync("duly-noted.json").toString());
            logger.fatal("It looks like you already have a 'duly-noted.json' file. Please just update that one.");
            return;
        }
        catch (err) {
            var projectPathArray = __dirname.split("/");
            var projectPath = projectPathArray.join("/");
            var dnJSON = fs_1.readFileSync(path.join(projectPath, "default.duly-noted.json")).toString();
            fs_1.writeFileSync("duly-noted.json", dnJSON);
            logger.info("duly-noted.json file created. YOU NEED TO UPDATE IT TO FIT YOUR NEEDS. Duly Noted will not work off-the-shelf.");
            logger.info("Seriously, stop reading the console, and go update your brand new duly-noted.json file aleady!");
            return;
        }
    }
    try {
        config = JSON.parse(fs_1.readFileSync(program.config).toString());
    }
    catch (error) {
        logger.error(error.message);
        logger.fatal("Error reading config file: " + program.config);
        return;
    }
    config.outputDir = program.outputDir || config.outputDir;
    if (program.generator) {
        config.generators = [program.generator];
    }
    var getFiles = [];
    for (var i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
    }
    if (program.verbose) {
        logLevel = "DEUBG";
    }
    else {
        logLevel = "INFO";
    }
    logger.setLevel(logLevel);
    logger.debug("Starting Reference Parsing.");
    Q.all(getFiles)
        .then(function (results) {
        var files = _.flatten(results);
        var referenceParser = new referenceParser_1.ReferenceParser(config, logLevel);
        referenceParser.parse()
            .then(function (response) {
            logger.info("Parsing complete, beginning export.");
            if (_.contains(config.generators, "html")) {
                new htmlGenerator_1.HtmlGenerator(config, logLevel).generate();
            }
            if (_.contains(config.generators, "markdown")) {
                new markdownGenerator_1.MarkdownGenerator(config, logLevel).generate();
            }
        })
            .catch(function (err) {
            logger.error(err.message + err.stack);
        });
    });
}
exports.run = run;
function getFilesFromGlob(globString) {
    return Q.Promise(function (resolve, reject) {
        glob(globString, function (err, files) {
            if (err)
                reject(err);
            resolve(files);
        });
    });
}
