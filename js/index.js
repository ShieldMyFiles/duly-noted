"use strict";
var referenceParser_1 = require("./modules/referenceParser");
var parseArgs = require("minimist");
var _ = require("underscore");
var path = require("path");
var glob = require("glob");
var Q = require("q");
var Htmlgenerator_1 = require("./generators/Htmlgenerator");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::run");
function run() {
    logger.info("Welcome to Duly Noted.");
    var args = parseArgs(process.argv.slice(2));
    var config;
    if (args["c"]) {
        config = require(args["c"]);
    }
    else {
        config = require(process.cwd() + "/duly-noted.json");
    }
    var getFiles = [];
    for (var i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
    }
    Q.all(getFiles)
        .then(function (results) {
        var files = _.flatten(results);
        var referenceParser = new referenceParser_1.ReferenceParser(files, new RegExp(config.commentRegExp), new RegExp(config.anchorRegExp), new RegExp(config.longCommentOpenRegExp), new RegExp(config.longCommentLineRegExp), new RegExp(config.longCommentCloseRegExp), config.outputDir);
        referenceParser.parse()
            .then(function (response) {
            logger.info("parsing complete, beginning export of HTML");
            new Htmlgenerator_1.HtmlGenerator(config.outputDir, path.join(__dirname, "templates", "basic.html"), new RegExp(config.anchorRegExp), new RegExp(config.linkRegExp)).generate();
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
