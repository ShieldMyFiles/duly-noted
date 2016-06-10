 # <a name="Index">&#187; Index</a> 

 [authors/chris](.././authors.md.md#authors/chris) 

 

 This is file runs Duly Noted

```typescript
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
export function run () {
    logger.info("Welcome to Duly Noted.");
    let args = parseArgs(process.argv.slice(2));
    let config: IConfig;
```
>  Parse config file

```typescript
   
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
             logger.info("parsing complete, beginning export of HTML");
             new HtmlGenerator(config).generate();
             new MarkdownGenerator(config).generate();
         })
         .catch( (err: Error) => {
             logger.error(err.message + err.stack);
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
```
