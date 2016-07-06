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
    var defaults = JSON.parse(fs_1.readFileSync(__dirname + "/../bin/defaults.json").toString());
    var packageJSON = JSON.parse(fs_1.readFileSync(__dirname + "/../package.json").toString());
    logger.info(packageJSON.description);
    program
        .version(packageJSON.version)
        .option("-c, --config <file>", "Path to duly-noted.json", "duly-noted.json")
        .option("-o, --outputDir <path>", "Path to output docs to")
        .option("-g, --generator <generator>", "Generator to use.")
        .option("-i, --init", "Creates a default duly-noted.json file")
        .option("-v, --verbose", "Chatty Cathy mode")
        .parse(process.argv);
    if (program.verbose) {
        logLevel = "DEUBG";
    }
    else {
        logLevel = "INFO";
    }
    logger.setLevel(logLevel);
    if (program.init) {
        try {
            var config_1 = JSON.parse(fs_1.readFileSync("duly-noted.json").toString());
            logger.fatal("It looks like you already have a 'duly-noted.json' file. Please just update that one.");
            return;
        }
        catch (err) {
            var projectPathArray = __dirname.split("/");
            var projectPath = projectPathArray.join("/");
            var dnJSON = fs_1.readFileSync(path.join(projectPath, "/../bin/default.duly-noted.json")).toString();
            fs_1.writeFileSync("duly-noted.json", dnJSON);
            logger.info("duly-noted.json file created. YOU SHOULD UPDATE IT TO FIT YOUR NEEDS.");
            logger.info("Seriously, stop reading the console, and go update your brand new duly-noted.json file aleady!");
            return;
        }
    }
    try {
        logger.info("Parsing config file.");
        config = JSON.parse(fs_1.readFileSync(program.config).toString());
    }
    catch (error) {
        logger.error(error.message);
        logger.warn("Error reading config file: " + program.config + " Try running init first.");
        return;
    }
    config.outputDir = program.outputDir || config.outputDir || defaults.outputDir;
    if (program.generator) {
        config.generators = [program.generator];
    }
    else {
        config.generators = config.generators || defaults.generators;
    }
    var getFiles = [];
    for (var i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
    }
    if (typeof config.markdownGeneratorOptions === "undefined") {
        logger.debug("loading default markdownGeneratorOptions");
        config.markdownGeneratorOptions = defaults.markdownGeneratorOptions;
    }
    if (typeof config.markdownGeneratorOptions.gitHubHtmlAnchors === "undefined") {
        logger.debug("loading default markdownGeneratorOptions.gitHubHtmlAnchors");
        config.markdownGeneratorOptions.gitHubHtmlAnchors = defaults.markdownGeneratorOptions.gitHubHtmlAnchors;
    }
    if (typeof config.markdownGeneratorOptions.htmlAnchors === "undefined") {
        logger.debug("loading default htmlAnchors");
        config.markdownGeneratorOptions.htmlAnchors = defaults.markdownGeneratorOptions.htmlAnchors;
    }
    logger.debug("Starting Reference Parsing.");
    Q.all(getFiles)
        .then(function (results) {
        var files = _.flatten(results);
        logger.debug(files);
        var referenceParser = new referenceParser_1.ReferenceParser(config, logLevel);
        referenceParser.parse(files)
            .then(function (response) {
            logger.info("Parsing complete, beginning export.");
            var generatorActions = [];
            if (_.contains(config.generators, "html")) {
                generatorActions.push(new htmlGenerator_1.HtmlGenerator(config, logLevel).generate());
            }
            if (_.contains(config.generators, "markdown")) {
                generatorActions.push(new markdownGenerator_1.MarkdownGenerator(config, logLevel).generate());
            }
            Q.all(generatorActions)
                .then(function () {
                if (!config.leaveJSONFiles) {
                    logger.info("Cleaning up - Removing JSON parse files.");
                    deleteDir(referenceParser_1.parseLoc);
                }
            });
        })
            .catch(function (err) {
            logger.error(err.message + err.stack);
        });
    });
}
exports.run = run;
function getFilesFromGlob(globString) {
    return Q.Promise(function (resolve, reject) {
        glob(globString, { nodir: true }, function (err, files) {
            if (err)
                reject(err);
            if (files.length === 0) {
                logger.warn("No files found for '" + globString + "'");
            }
            resolve(files);
        });
    });
}
function deleteDir(dirPath) {
    var files = [];
    try {
        files = fs_1.readdirSync(dirPath);
    }
    catch (e) {
        return;
    }
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + "/" + files[i];
            if (fs_1.statSync(filePath).isFile()) {
                fs_1.unlinkSync(filePath);
            }
            else {
                deleteDir(filePath);
            }
        }
    }
    fs_1.rmdirSync(dirPath);
}
;
