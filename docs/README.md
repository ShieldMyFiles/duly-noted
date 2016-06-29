# Duly-Noted documentation 
### Collections 

####  
* [Index](./ts/index.ts.md#Index) 
* [HtmlGenerator](./ts/generators/htmlGenerator.ts.md#HtmlGenerator) 
* [MarkdownGenerator](./ts/generators/markdownGenerator.ts.md#MarkdownGenerator) 
* [ReferenceParser](./ts/modules/referenceParser.ts.md#ReferenceParser) 
* [ReferenceCollection](./ts/classes/referenceCollection.ts.md#ReferenceCollection) 
* [IConfig](./ts/classes/IConfig.ts.md#IConfig) 
* [license](./license.md.md#license) 
* [ParseFile](./ts/modules/referenceParser.ts.md#ParseFile) 

#### interfaces 
* [IMarkdownGenerator](./ts/generators/markdownGenerator.ts.md#IMarkdownGenerator) 
* [IHtmlGenerator](./ts/generators/htmlGenerator.ts.md#IHtmlGenerator) 
* [IReferenceCollection](./ts/classes/referenceCollection.ts.md#IReferenceCollection) 
* [IReferenceParser](./ts/modules/referenceParser.ts.md#IReferenceParser) 
* [IAnchor](./ts/classes/referenceCollection.ts.md#IAnchor) 
* [ITag](./ts/classes/referenceCollection.ts.md#ITag) 

#### classes 
* [MarkdownGenerator](./ts/generators/markdownGenerator.ts.md#MarkdownGenerator) 
* [HtmlGenerator](./ts/generators/htmlGenerator.ts.md#HtmlGenerator) 
* [ReferenceParser](./ts/modules/referenceParser.ts.md#ReferenceParser) 
* [ReferenceCollection](./ts/classes/referenceCollection.ts.md#ReferenceCollection) 

#### TODO 
* [commentRegExp](./ts/classes/IConfig.ts.md#commentRegExp) 
* [errors](./ts/index.ts.md#errors) 

#### constant 
* [parseLoc](./ts/modules/referenceParser.ts.md#parseLoc) 
* [commentPatterns](./ts/modules/referenceParser.ts.md#commentPatterns) 

#### authors 
* [chris](./authors.md.md#chris) 
* [joe](./authors.md.md#joe) 

------------------------------ 

### Files 
* [authors.md.md](./authors.md.md) 
* [license.md.md](./license.md.md) 
* [ts/classes/IConfig.ts.md](./ts/classes/IConfig.ts.md) 
* [ts/classes/referenceCollection.ts.md](./ts/classes/referenceCollection.ts.md) 
* [ts/generators/htmlGenerator.ts.md](./ts/generators/htmlGenerator.ts.md) 
* [ts/generators/markdownGenerator.ts.md](./ts/generators/markdownGenerator.ts.md) 
* [ts/helpers/fileType.ts.md](./ts/helpers/fileType.ts.md) 
* [ts/helpers/helpers.ts.md](./ts/helpers/helpers.ts.md) 
* [ts/index.ts.md](./ts/index.ts.md) 
* [ts/modules/referenceParser.ts.md](./ts/modules/referenceParser.ts.md) 
* [ts/typings/index.d.ts.md](./ts/typings/index.d.ts.md) 

------------------------------ 

![logo](https://raw.githubusercontent.com/ShieldMyFiles/duly-noted/master/DNLogo.png)


# Duly Noted
[![npm version](https://badge.fury.io/js/duly-noted.svg)](https://badge.fury.io/js/duly-noted)

> A better way to document code.

## Why Duly Noted?
The goal of this project is to provide an easy, flexible way to comment source code, leveraging links! 

We tried a bunch of tools before we set out to write our own, but none of them had the full set features we needed.
We spent a lot of time writing comments, and running document generators - all to produce less-than-useful documentation
that we rarely looked at ... so Duly Noted was born.

Duly Noted aims to:
* Output documentation in easy to display/render/share formats
    * HTML
    * Markdown
* Support linking
    * Link internally between places in comments with simple, clean notation
    * Link externally to wikis, tickets, tasks, issues, stack-overflow questions - you name it.
* Produce ["Literate Programming"](https://en.wikipedia.org/wiki/Literate_programming) code style documentation that is easy to read and understand
* Support long-form and short-form comments in many different languages
    * HTML/XML `<!-- -->`
    * C, C++, JS, Etc. `//` , `/**`
* Produce documents that are easy to host automagically in git tools (GitHub, BitBucket)
    * See the docs for this project in action here --> [Duly Noted Docs](/docs)

## Installing
```
npm install duly-noted -g
```

## Running
Duly noted runs from the command line as `duly-noted [options]`
``` bash
    Usage: duly-noted [options]
 
  Options:

 
    -h, --help                   output usage information
    -V, --version                output the version number
    -c, --config <file>          Path to duly-noted.json
    -o, --outputDir <path>       Path to output docs to
    -g, --generator <generator>  Generator to use.
    -i, --init                   Creates a default duly-noted.json file
    -v, --verbose                Chatty Cathy mode
```

## Using

### duly-noted.json
Configuration options for duly noted are stored in a dedicated configuration file.  

To generate a template duly-noted.json.
```
duly-noted -i
```

> NOTE: You need to modify the template settings file - duly-noted will not work off-the-shelf at this time.

### You can link to what matters
Duly noted allows you to create both *internal* and *external* links.

#### Internal Links
You can link to another place in your source comments like follows:

```
// Define a place you want to link to with an anchor simply by using a '!' followed by a name that makes sense to you. 
// This is an !Example

...

// You can link to that than anchor from anywhere simply by adding '@' to the name you picked. 
// This is a link to @example. You can place this link in any file.

```

#### External Links

You can define an external link in your config file in the format:

``` json
// duly-noted.json
{
    ...
    "externalReferences": [
        "wiki":"https://en.wikipedia.org/wiki/::"
    ]
}
```

External links will just like internal links - `@wiki`. Note that each of the `::` in external reference path will be replace in order by items in the link. 
For example, using  `@wiki/Software_documentation` in a comment will render to: `https://en.wikipedia.org/wiki/Software_documentation`

You can link to your scrum manager, your ticket system, github, anywhere on the Internet or your Intranet, without cluttering your source control will length pasted urls. 

## Examples
For this project markdown docs were generated in-place with the typescript source code. 
To see an an example of the Markdown docs you can look at ./Duly Noted.md, and the ./ts folder.

Example HTML docs live in the ./html-docs folder.

________________________________

## How the Duly Noted Code is Organized

This code is generally organized into a three parts:
1. A reference parser that parses all the links and anchors in your code - the output of which is two reference maps:
    * `internalReferences.json`
    * `externalReferences.json`
2. A code parser that creates a logical map of you code files line-by-line.
    * each file you input will have a corresponding *.json file output in the duly-noted folder.  
3. Generators that turn those line-by-line maps, and reference collections into human-readable output format. 
    * Markdown 
    * HTML