# Duly-Noted documentation 
### Anchor Collections 

####  
* [Index](./ts/index.ts.md#user-content-index) 
* [HtmlGenerator](./ts/generators/htmlGenerator.ts.md#user-content-htmlgenerator) 
* [MarkdownGenerator](./ts/generators/markdownGenerator.ts.md#user-content-markdowngenerator) 
* [ReferenceParser](./ts/modules/referenceParser.ts.md#user-content-referenceparser) 
* [license](./license.md.md#user-content-license) 
* [IConfig](./ts/classes/IConfig.ts.md#user-content-iconfig) 
* [ParseFile](./ts/modules/referenceParser.ts.md#user-content-parsefile) 

#### authors 
* [chris](./authors.md.md#user-content-authors-chris) 

#### TODO 
* [commentRegExp](./ts/classes/IConfig.ts.md#user-content-todo-commentregexp) 
* [errors](./ts/index.ts.md#user-content-todo-errors) 

#### interfaces 
* [IReferenceCollection](./ts/classes/referenceCollection.ts.md#user-content-interfaces-ireferencecollection) 
* [IReferenceParser](./ts/modules/referenceParser.ts.md#user-content-interfaces-ireferenceparser) 
* [IAnchor](./ts/classes/referenceCollection.ts.md#user-content-interfaces-ianchor) 
* [IMarkdownGenerator](./ts/generators/markdownGenerator.ts.md#user-content-interfaces-imarkdowngenerator) 
* [ITag](./ts/classes/referenceCollection.ts.md#user-content-interfaces-itag) 
* [IHtmlGenerator](./ts/generators/htmlGenerator.ts.md#user-content-interfaces-ihtmlgenerator) 

#### constant 
* [parseLoc](./ts/modules/referenceParser.ts.md#user-content-constant-parseloc) 
* [commentPatterns](./ts/modules/referenceParser.ts.md#user-content-constant-commentpatterns) 

#### classes 
* [MarkdownGenerator](./ts/generators/markdownGenerator.ts.md#user-content-classes-markdowngenerator) 
* [ReferenceParser](./ts/modules/referenceParser.ts.md#user-content-classes-referenceparser) 
* [HtmlGenerator](./ts/generators/htmlGenerator.ts.md#user-content-classes-htmlgenerator) 
* [ReferenceCollection](./ts/classes/referenceCollection.ts.md#user-content-classes-referencecollection) 

------------------------------ 

### Documentation Files 
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

We tried a bunch of tools before we set out to write our own, but none of them had the full set of features we needed.
We spent a lot of time writing comments and running document generators - all to produce less-than-useful documentation
that we rarely looked at ... so Duly Noted was born.

Duly Noted aims to:
* Output documentation in easy to display/render/share formats:
    * HTML
    * Markdown
* Support linking
    * Link internally between places in comments with simple, clean notation
    * Link externally to wikis, tickets, tasks, issues, Stackoverflow questions - you name it
* Produce ["Literate Programming"](https://en.wikipedia.org/wiki/Literate_programming) code style documentation that is easy to read and understand
* Support long-form and short-form comments in many different languages:
    * HTML/XML `<!-- -->`
    * C, C++, JS, etc. `//` , `/**`
* Produce documents that are easy to host auto*magically* in git tools (i.e., GitHub, BitBucket)
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

## Using Duly Noted

### Settings
Configuration options for Duly Noted are stored in a dedicated configuration file - `duly-noted.json`.
Any configuration setting not set in `duly-noted.json` will use the default value for that option. Any command-line inputs
will take precedent over both `duly-noted.json` and default values. 

To generate a template `duly-noted.json`.
```
duly-noted -i
```

#### Config Settings, and Default Values
| Setting                  |Description                                                                                                                                                                                      | Default                                                                 |
|:-------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| projectName              | A name for your project - used by generator for headings.                                                                                                                                          | "Fancy Project Name"                                                    |
| files                    | Array of file globs. The input code files you want to document with Duly Noted.                                                                                                                    | empty array                                                             |
| indexFile                | Output documentation index/homepage name. For markdown + GitHub README.md can be helpful, as it auto-renders.                                                                                      | README.md                                                               |
| outputDir                | Directory where documentation should be output.                                                                                                                                                    | ./docs                                                                  |
| anchorRegExp             | The regular expression to use to identify anchors you want to be able to link to.                                                                                                                  | The default anchor start is `!`, as in `!ImAnAnchor`                    |
| linkRegExp               | The regular expression to use to identify links.                                                                                                                                                   | The default link start is `@`, so to link to anchor above: `@ImAnAnchor`|
| externalReferences       | Array of External Reference objects, each with an `anchor` and a `path`.                                                                                                                           | none provided by default                                                |
| generators               | Array of generators you want to use to generate output. Currently `html` and `markdown` are available.                                                                                             | markdown                                                                |
| leaveJSONFiles           | Duly Noted parses your code files to a json map of comments and code. When it is done, it cleans up these json files automatically. If you want to leave these files undeleted, set this to `true`.| `false`                                                                 |
| markdownGeneratorOptions | Object for setting specific settings for Markdown Generator                                                                                                                                        |                                                                         |
|     .gitHubHtmlAnchors   | Set to `true` to support anchor tags in GitHub. Only use if you are hosting docs in GitHub.                                                                                                        | `false`                                                                 |
|     .htmlAnchors         | Set to `true` to insert html anchor tags in your markdown to support "#" links.                                                                                                                    | `true`                                                                  |

### Creating Links
Duly Noted allows you to create both *internal* and *external* links.

#### Internal Links
You can link to another place in your source comments as follows:

```
// Define a place you want to link to with an anchor simply by using a '!' followed by a name that makes sense to you. 
// This is an !example anchor

...

// You can link to that anchor from anywhere simply by adding '@' to the name you picked. 
// This is a link to @example. You can place this link in anywhere in the comments.

```

> **Pro Tip:**
> The documentation index file will contain an automatically generated, organized list of links to each of the anchors in your code comments. (See [/docs](/docs) for an example of this). 
> This list can be mighty helpful for quickly getting to specific spots buried in the code. For example, you can easily create a list of todos by simply starting todo comments with anchors like: `!todo/item1`, `!todo/item2`, `!todo/third-thing`, etc.

#### A note internal link anchors in Markdown
Often it is helpful to link to a specific place in the code, not just the code file itself. In HTML this is easy to accomplish by inserting a named anchor tag like:
```html 
<a name="my-place"></a>
<a href="#my-place">link</a>
```
Markdown does not natively support the creation of such anchors, however, there are some work-arounds if you are hosting (rendering) on GitHub, or your viewer 
supports `<a>`'s as HTML in-line with the Markdown. To insert `<a>` tags that will work as anchors in GitHub set `markdownGeneratorOptions.gitHubHtmlAnchors = true` in your `duly-noted.json` file.
To insert plain-jane HTML `<a>` tags as anchors set `markdownGeneratorOptions.htmlAnchors = true`. If you would rather not muddle your Markdown with `<a>`'s at all then set both to `false`, and anchors will not be modified, but simply printed out.
Note that BitBucket does not currently support html inline, so you are best to just set these both to `false` and add your voice to the legion of folks who requested they support some basic html in Markdown docs.

> If you have an idea of how to better handle this anchor business please leave a comment on Issue #4. 

#### External Links

You can define external reference patterns in your `duly-noted.json` in the format:

``` json
// duly-noted.json
{
    ...
    "externalReferences": [
        "wiki":"https://en.wikipedia.org/wiki/::"
    ]
}
```

Adding an external link to a comment works just like adding an internal link -  [wiki](https://en.wikipedia.org/wiki/::) ` with one major change - the `::` in external reference path will be replace in order by items in the link. 
For example, using   [wiki/Software](https://en.wikipedia.org/wiki/::) _documentation` in a comment will link to: `https://en.wikipedia.org/wiki/Software_documentation`


> **Pro Tip:**
> You can link to your scrum manager, your ticket system, GitHub, anywhere on the Internet or your Intranet that uses URLs with GUID-type patterning (so basically everywhere...), without cluttering your source control with lengthy,
> hard-to-remember URLs. This means you can link to that complicated GitHub issue conversation simply with `see !issue/2`.

When you initialize Duly Noted, the provided example `duly-noted.json` file will contain external reference examples for:
* Stackoverflow
* Wikipedia
* GitHub Repository Issues

The real power is in adding links to the external services you or your team use. 

## Examples
For this project, markdown docs were generated from our typescript source code. These docs are rendered in GitHub at [/docs](/docs).


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