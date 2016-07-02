
# Notes for the `bin` folder

<a name="comment-patterns" id="comment-patterns" ></a>[🔗](#user-content-comment-patterns)comment-patterns
## comment-patterns.json
This file contains RegEx patterns used to identify comment patterns for 
the various supported languages.

```json
...
    "typescript": {
        "commentRegExp": "\\/\\/(.*)",
        "longCommentOpenRegExp": "\\/\\*\\*(.*)",
        "longCommentLineRegExp": "\\* (.*)",
        "longCommentCloseRegExp": "\\*\/"
    }
...
```
 |Setting|Description|
 |-------|-----------|
 |commentRegExp|RegEx to identify the beginning of a standard (non-long-form) comment.|
 |longCommentOpenRegExp| RegEx to identify the beginning of a long-form comment.|
 |longCommentLineRegExp| RegEx for a continuation char used in long-form comments.|
 |longCommentCloseRegExp| RegEx to identify the end of a long-form comment.|

 For Example:
 `
     '//' <==  commentRegExp

     '/**' <== longCommentOpenRegExp
     
     ' * ' <== longCommentLineRegExp
     
     ' */' <== longCommentCloseRegExp
`

<a name="defaults" id="defaults" ></a>[🔗](#user-content-defaults)defaults
## defaults.json
This file contains the default values for settings.
When any new settings is added a default should be set here
so that those folks we are upgrading don't face breaking changes. See [issue/3](https://github.com/ShieldMyFiles/duly-noted/issues/3) 

Please remember to document all settings in the main README.md.

<a name="default-duly-noted-json" id="default-duly-noted-json" ></a>[🔗](#user-content-default-duly-noted-json)default-duly-noted-json
## default.duly-noted.json
This is the default duly noted json file that is copied when the user 
runs [Index/init](.././ts/index.ts.md#user-content-index-init)

<a name="duly-noted-entry" id="duly-noted-entry" ></a>[🔗](#user-content-duly-noted-entry)duly-noted-entry
## duly-noted.js
This is the entry file for running the NPM package from the command line. 
See [NPM Blog](http://blog.npmjs.org/post/118810260230/building-a-simple-command-line-tool-with-npm) for some more info. 
Points all actions to [Index/run](.././ts/index.ts.md#user-content-index-run)

## /Templates
Temlates used by the [HtmlGenerator/generate](.././ts/generators/htmlGenerator.ts.md#user-content-htmlgenerator-generate)