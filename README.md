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

## Using Duly Noted

### Settings
Configuration options for duly noted are stored in a dedicated configuration file - `duly-noted.json`.
Any configuration setting not set in `duly-noted.json` will use the default value for that option. Any command line inputs
will take precedent over both `duly-noted.json` and default values. 

To generate a template duly-noted.json.
```
duly-noted -i
```

#### Config Settings, and Default Values
| Setting            | Description                                                                                                                                                                                        | Default                                                                  |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| projectName        | A name for your project - used by generator for headings.                                                                                                                                          | "Fancy Project Name"                                                     |
| files              | Array of file globs. The input code files you want to document with duly-noted.                                                                                                                    | empty array                                                              |
| indexFile          | Output documentation index/homepage name. For markdown + GitHub README.md can be helpful, as it auto-renders.                                                                                      | README.md                                                                |
| outputDir          | Directory where documentation should be output.                                                                                                                                                    | ./docs                                                                   |
| anchorRegExp       | The regular expression to use to identify anchors you want to be able to link to.                                                                                                                  | The default anchor start is `!`, as in `!ImAnAnchor`                     |
| linkRegExp         | The regular expression to use to identify links.                                                                                                                                                   | The default link start is `@`, so to link to anchor above: `@ImAnAnchor` |
| externalReferences | Array of External reference objects, each with an `anchor` and a `path`                                                                                                                            | none provided by default.                                                |
| generators         | Array of generators you want to use to generate output. Currently `html`, and `markdown` are available.                                                                                            | markdown                                                                 |
| leaveJSONFiles     | Duly Noted parses your code files to a json map of comments and code. When it is done, it cleans up these JSON files automatically. If you want to leave these files undeleted, set this to `true` | `false`                                                                  |


### Creating Links
Duly noted allows you to create both *internal* and *external* links.

#### Internal Links
You can link to another place in your source comments like follows:

```
// Define a place you want to link to with an anchor simply by using a '!' followed by a name that makes sense to you. 
// This is an !example anchor

...

// You can link to that anchor from anywhere simply by adding '@' to the name you picked. 
// This is a link to @example. You can place this link in anywhere in the comments.

```

> **Pro Tip:**
> The documentation index file will contain an automatically generated, organized, list of links to each of the anchors in your code comments. (See [/docs](/docs) for an example of this). 
> This list can be mighty helpful for getting to specific spots buried in the code quickly, for example you easily create a list of todo's by simply starting todo comments with anchors starting todo/ like: `!todo/item1`, `!todo/item2`, `!todo/third-thing`, etc.

#### External Links

You can define an external links in your config file in the format:

``` json
// duly-noted.json
{
    ...
    "externalReferences": [
        "wiki":"https://en.wikipedia.org/wiki/::"
    ]
}
```

Adding an external link to a comment works just like adding an internal link - `@wiki` with one major change - the `::` in external reference path will be replace in order by items in the link. 
For example, using  `@wiki/Software_documentation` in a comment will link to: `https://en.wikipedia.org/wiki/Software_documentation`


> **Pro Tip:**
> You can link to your scrum manager, your ticket system, github, anywhere on the Internet or your Intranet that uses URLs with GUID-type patterning (so basically everywhere?), without cluttering your source control with lengthy,
> hard to remember urls. This means you can link to that complicated gitHub issue conversation simply with `see !issue/2`.

When you initialize duly noted the provided example `duly-noted.json` file will contain external reference examples for:
* Stackoverflow,
* Wikipedia, and
* GitHub Repository Issues, 

But the real power is in adding links to the external services you or your team use. 

## Examples
For this project markdown docs were generated in-place from our typescript source code. These docs are automatically rendered by gitHub at [/docs](/docs).

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