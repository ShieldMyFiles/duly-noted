"use strict";
var referenceCollection_1 = require("../classes/referenceCollection");
var referenceParser_1 = require("../modules/referenceParser");
var node_dir_1 = require("node-dir");
var fs_1 = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var XRegExp = require("xregexp");
var handlebars = require("handlebars");
var marked = require("marked");
var fse = require("fs-extra");
var _ = require("underscore");
var Q = require("q");
var log4js = require("log4js");
var logger = log4js.getLogger("duly-noted::HtmlGenerator");
var HtmlGenerator = (function () {
    function HtmlGenerator(config, logLevel) {
        this.tags = [];
        logger.setLevel(logLevel || "DEBUG");
        this.outputDir = config.outputDir;
        this.collection = JSON.parse(fs_1.readFileSync(path.join(referenceParser_1.parseLoc, "internalReferences.json")).toString());
        this.anchorRegExp = new RegExp(config.anchorRegExp);
        this.linkRegExp = new RegExp(config.linkRegExp);
        this.referenceCollection = new referenceCollection_1.ReferenceCollection("").inflate(JSON.parse(fs_1.readFileSync(path.join(referenceParser_1.parseLoc, "internalReferences.json")).toString()));
        this.externalReferences = JSON.parse(fs_1.readFileSync(path.join(referenceParser_1.parseLoc, "externalReferences.json")).toString());
        this.tags = this.referenceCollection.getAllTags();
        var projectPathArray = __dirname.split("/");
        projectPathArray.pop();
        this.projectPath = projectPathArray.join("/");
        this.template = handlebars.compile(fs_1.readFileSync(path.join(__dirname, "../../bin/templates", "stacked.html")).toString());
        this.indexTemplate = handlebars.compile(fs_1.readFileSync(path.join(__dirname, "../../bin/templates", "index.html")).toString());
        this.projectName = config.projectName;
        this.readme = config.readme;
        handlebars.registerHelper("md", this.markdownHelper);
        handlebars.registerHelper("ifCond", this.ifCondHelper);
    }
    HtmlGenerator.prototype.generate = function () {
        var _this = this;
        return Q.Promise(function (resolve, reject) {
            logger.info("Generating HTML Documents");
            var that = _this;
            node_dir_1.readFiles(referenceParser_1.parseLoc, { match: /.json$/, exclude: /internalReferences.json|externalReferences.json/, recursive: true }, function (err, content, next) {
                that.proccessFile(err, content, next, that.outputDir);
            }, function (err, files) {
                that.generateIndexPage();
                resolve(null);
            });
            fse.copySync(path.join(_this.projectPath, "templates", "highlight.pack.js"), path.join(_this.outputDir, "scripts/highlight.js"));
            fse.copySync(path.join(_this.projectPath, "templates", "css", "default.css"), path.join(_this.outputDir, "css/default.css"));
        });
    };
    HtmlGenerator.prototype.proccessFile = function (err, content, next, outputDir) {
        var file = JSON.parse(content);
        logger.debug("Processing " + file.name);
        for (var i = 0; i < file.lines.length; i++) {
            if (typeof (file.lines[i].comment) === "string" && file.lines[i].comment !== "" && file.lines[i].comment !== null) {
                file.lines[i].comment = this.replaceAnchors(file.lines[i].comment, file.name, i);
                file.lines[i].comment = this.replaceLinks(file.lines[i].comment, file.name, i);
            }
        }
        var outputMap = {
            project: this.projectName,
            items: [],
            type: file.name,
            name: file.type,
            linkPrefix: this.getLinkPrefix(file.name)
        };
        for (var i = 0; i < file.lines.length; i++) {
            if (typeof (file.lines[i].comment) === "string" && file.lines[i].comment !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "comment") {
                    outputMap.items[outputMap.items.length - 1].content += "\n" + file.lines[i].comment;
                }
                else {
                    outputMap.items.push({ content: file.lines[i].comment, type: "comment", longComment: file.lines[i].longComment || false });
                }
            }
            if (typeof (file.lines[i].code) === "string" && file.lines[i].code !== null) {
                if (outputMap.items.length > 0 && outputMap.items[outputMap.items.length - 1].type === "code") {
                    outputMap.items[outputMap.items.length - 1].content += "\n" + file.lines[i].code;
                }
                else {
                    outputMap.items.push({ content: file.lines[i].code, type: "code", lang: file.type });
                }
            }
        }
        var output = this.template(outputMap);
        var filePathArray = path.join(outputDir, file.name + ".md").split("/");
        filePathArray.pop();
        var filePath = filePathArray.join("/");
        mkdirp(filePath, function (err) {
            if (err) {
                logger.fatal(err.message);
            }
            else {
                logger.debug("Saving output for " + file.type + " file " + file.name + " as " + file.name + ".html");
                fs_1.writeFileSync(path.join(outputDir, file.name + ".html"), output, { flag: "w" });
                next();
            }
        });
    };
    HtmlGenerator.prototype.replaceAnchors = function (comment, fileName, line, position) {
        var pos = position || 0;
        var match = XRegExp.exec(comment, this.anchorRegExp, pos, false);
        if (!match) {
            return comment;
        }
        else {
            var anchor = match[1].replace(/\//g, "-").toLowerCase();
            var replacementText = '<a name="' + anchor + '" id="' + anchor + '" ></a>';
            replacementText += "[🔗](#" + anchor + ")";
            comment = comment.replace(match[0], replacementText);
            return this.replaceAnchors(comment, fileName, line, pos + match[0].length);
        }
    };
    HtmlGenerator.prototype.replaceLinks = function (comment, fileName, line, position) {
        var pos = position || 0;
        var linkPrefix = this.getLinkPrefix(fileName);
        var match = XRegExp.exec(comment, this.linkRegExp, pos, false);
        if (!match) {
            return comment;
        }
        else {
            var tagArray = match[1].split("/");
            var externalTag = _.findWhere(this.externalReferences, { anchor: tagArray[0] });
            if (externalTag) {
                logger.debug("found external link: " + match[1]);
                for (var i = 1; i < tagArray.length; i++) {
                    externalTag.path = externalTag.path.replace("::", tagArray[i]);
                }
                var anchor = match[1].replace(/\//g, "-").toLowerCase();
                comment = comment.replace(match[0], " [" + match[1] + "](" + externalTag.path + ") ");
                return this.replaceLinks(comment, fileName, line, pos + match[0].length);
            }
            var internalTag = _.findWhere(this.tags, { anchor: match[1] });
            if (!internalTag) {
                logger.warn("link: " + match[1] + " in " + fileName + ":" + line + ":" + pos + " does not have a cooresponding anchor, so link cannot be created.");
                return comment;
            }
            else {
                logger.debug("found internal link: " + match[1] + " " + internalTag.path);
                var anchor = match[1].replace(/\//g, "-").toLowerCase();
                comment = comment.replace(match[0], " [" + match[1] + "](" + linkPrefix + internalTag.path + ".md#" + anchor + ")");
            }
            return this.replaceLinks(comment, fileName, line, pos + match[0].length);
        }
    };
    HtmlGenerator.prototype.generateIndexPage = function () {
        var _this = this;
        logger.info("generating index.html");
        var that = this;
        var outputMap = {
            project: this.projectName,
            collections: [],
            files: [],
            readme: ""
        };
        var collections = that.referenceCollection.getTagsByCollection();
        for (var i = 0; i < collections.length; i++) {
            var anchors = _.clone(collections[i].anchors);
            var name_1 = collections[i].name.split("/");
            name_1.shift();
            name_1.shift();
            name_1 = name_1.join("/");
            for (var x = 0; x < anchors.length; x++) {
                var anchor = anchors[x].linkStub.replace(/\//g, "-").toLowerCase();
                anchors[x].path = anchors[x].path + ".html#";
                if (name_1 !== "") {
                    anchors[x].path += name_1.replace(/\//g, "-").toLowerCase() + "-";
                }
                anchors[x].path += anchor;
            }
            outputMap.collections.push({
                name: name_1,
                anchors: anchors
            });
        }
        node_dir_1.files(this.outputDir, function (error, files) {
            for (var i = 0; i < files.length; i++) {
                var fileNameArray = files[i].split(".");
                var extension = fileNameArray[fileNameArray.length - 1];
                if (extension === "html") {
                    var pathArray = files[i].split("/");
                    pathArray.shift();
                    var path_1 = pathArray.join("/");
                    outputMap.files.push({ path: path_1 });
                }
            }
            if (_this.readme !== null) {
                outputMap.readme = fs_1.readFileSync(that.readme).toString();
            }
            var output = _this.indexTemplate(outputMap);
            fs_1.writeFileSync(path.join(that.outputDir, "index.html"), output, { flag: "w" });
        });
    };
    HtmlGenerator.prototype.getLinkPrefix = function (fileName) {
        var fileNameAsArray = fileName.split("/");
        var linkPrefix = "";
        for (var i = 0; i < fileNameAsArray.length - 2; i++) {
            linkPrefix += "../";
        }
        return linkPrefix;
    };
    HtmlGenerator.prototype.markdownHelper = function (context, options) {
        return marked(context);
    };
    HtmlGenerator.prototype.ifCondHelper = function (v1, v2, options) {
        if (v1 === v2) {
            return options.fn(this);
        }
        return options.inverse(this);
    };
    ;
    return HtmlGenerator;
}());
exports.HtmlGenerator = HtmlGenerator;
