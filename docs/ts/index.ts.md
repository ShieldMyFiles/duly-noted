

# <a name="index" id="index" ></a>[🔗Index](#user-content-index)
@authors/chris[authors/chris](.././authors.md.md#user-content-authors-chris)
@license[license](.././license.md.md#user-content-license)

This is the entry file to Duly Noted

```typescript
import {IProgram} from "./classes/IProgram";
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

```

## Run

Basic code flow is:

1. parse the cofiguration options using the following order of precedence
2. get the files and pass those to the @ReferenceParser[ReferenceParser](.././ts/modules/referenceParser.ts.md#user-content-referenceparser)
3. output the reponse to either/both @HtmlGenerator or @MarkdownGenerator[HtmlGenerator](.././ts/generators/htmlGenerator.ts.md#user-content-htmlgenerator)[MarkdownGenerator](.././ts/generators/markdownGenerator.ts.md#user-content-markdowngenerator)

```typescript
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

```
### Set verbose mode
```typescript
   
    if (program.verbose) {
        logLevel = "DEUBG";
    } else {
        logLevel = "INFO";
    }
    logger.setLevel(logLevel);


```
### Init - copies example duly-noted.json
```typescript
   
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

```
### Load the config file, or advise init
```typescript
   
    try {
        logger.info("Parsing config file.")
        config = JSON.parse(readFileSync(program.config).toString());
    } catch (error) {
        logger.error(error.message);
        logger.warn("Error reading config file: " + program.config + " Try running init first.");
        return;
    }

```

## Set settings
Settings are in order of precedence

1. Command Line Input
2. User's Config File
3. Defaults values (see [issue/3](https://github.com/ShieldMyFiles/duly-noted/issues/6) )

```typescript

```
 Set outputDir
```typescript
   
    config.outputDir = program.outputDir || config.outputDir || defaults.outputDir;

```
 Set generator
```typescript
   
    if (program.generator) {
        config.generators = [program.generator];
    } else {
        config.generators = config.generators || defaults.generators;
    }

```
 Get file actions
```typescript
   
    let getFiles: Q.IPromise<string[]>[] = [];

    for (let i = 0; i < config.files.length; i++) {
        getFiles.push(getFilesFromGlob(config.files[i]));
    }

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
                            if (!config.leaveJSONFiles) {
                                logger.info("Cleaning up - Removing JSON parse files.");
                                deleteDir(parseLoc);
                            }
                        });
                })
                .catch((err: Error) => {
```
 <a name="todo-errors" id="todo-errors" ></a>[🔗TODO/errors](#user-content-todo-errors)
```typescript
                   
                    logger.error(err.message + err.stack);
                });
        });
}

```

## Get Files from Glob
This is a simple helper to get a set of files from a glob.

```typescript
function getFilesFromGlob(globString: string): Q.Promise<string[]> {
    return Q.Promise<string[]>((resolve, reject) => {
        glob(globString, (err, files: string[]) => {
            if (err) reject(err);
            resolve(files);
        });
    });
}

```

## Delete a directory
This is a simple helper to recursively delete a directory, and any sub-directories and files it contains.

```typescript
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
```