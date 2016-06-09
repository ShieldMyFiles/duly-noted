/**
 * # This is a long comment
 * ## It is awesome.
 */

"use strict";
var node_dir_1 = require("node-dir"); // In line comments look like this.
var fs_1 = require("fs"); // This is another comment
var mkdirp = require("mkdirp");
var path = require("path");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::MarkdownGenerator");
var MarkdownGenerator = (function () {
    function MarkdownGenerator(outputDir) {
        this.outputDir = outputDir;
        this.collection = JSON.parse(fs_1.readFileSync(path.join(outputDir, "references.json")).toString());
    }
    MarkdownGenerator.prototype.generate = function () {
        var that = this;
        node_dir_1.readFiles(this.outputDir, { match: /.json$/, exclude: /tags.json/ }, function (err, content, next) {
            that.proccessFile(err, content, next, that.outputDir);
        }, that.cleanUp);
    };
    MarkdownGenerator.prototype.proccessFile = function (err, content, next, outputDir) {
        if (err) {
            logger.error(err.message);
        }
        else {
            var file_1 = JSON.parse(content);
            var output_1 = "";
            var inCodeBlock = false;
            for (var i = 0; i < file_1.lines.length; i++) {
                if (typeof (file_1.lines[i].comment) === "string" && file_1.lines[i].comment !== "" && file_1.lines[i].comment !== null) {
                    if (inCodeBlock) {
                        output_1 += "```" + "\n";
                        inCodeBlock = false;
                    }
                    if (!file_1.lines[i].longComment) {
                        output_1 += "> ";
                    }
                    output_1 += file_1.lines[i].comment + "\n" + "\n";
                }
                if (typeof (file_1.lines[i].code) === "string" && file_1.lines[i].code !== "" && file_1.lines[i].code !== null) {
                    if (!inCodeBlock) {
                        output_1 += "```" + file_1.type + "\n";
                        inCodeBlock = true;
                    }
                    output_1 += file_1.lines[i].code + "\n";
                }
            }
            if (inCodeBlock) {
                output_1 += "```" + "\n";
                inCodeBlock = false;
            }
            var filePathArray = path.join(outputDir, file_1.name + ".md").split("/");
            filePathArray.pop();
            var filePath = filePathArray.join("/");
            mkdirp(filePath, function (err) {
                if (err) {
                    logger.fatal(err.message);
                }
                else {
                    logger.info("Saving output for " + file_1.type + " file " + file_1.name);
                    fs_1.writeFileSync(path.join(outputDir, file_1.name + ".md"), output_1, { flag: "w" });
                }
            });
            next();
        }
    };
    MarkdownGenerator.prototype.cleanUp = function (err, files) {
    };
    return MarkdownGenerator;
}());
// This line contains a link !authors/Chris
exports.MarkdownGenerator = MarkdownGenerator;
