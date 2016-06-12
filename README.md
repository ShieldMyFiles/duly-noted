# Duly Noted

> Code documentation for the modern world. 

## Goal of this project
The goal of this project is to provide an easy, flexible way to comment source code, leveraging links! 

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
To see an an example of the Markdown docs you can look at [./Duly Noted.md](./Duly Noted.md), and the ./ts folder.

Example HTML docs live in the [./html-docs](./html-docs) folder.

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