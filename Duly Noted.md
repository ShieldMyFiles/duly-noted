# Duly-Noted documentation 
### Collections 

####  
* [Index](./ts/index.ts.md#Index) 
* [ReferenceParser](./ts/modules/referenceParser.ts.md#ReferenceParser) 
* [ReferenceCollection](./ts/classes/referenceCollection.ts.md#ReferenceCollection) 
* [license](./license.md.md#license) 
* [IConfig](./ts/classes/IConfig.ts.md#IConfig) 

#### authors 
* [chris](./authors.md.md#chris) 
* [joe](./authors.md.md#joe) 

#### interfaces 
* [IReferenceCollection](./ts/classes/referenceCollection.ts.md#IReferenceCollection) 
* [IAnchor](./ts/classes/referenceCollection.ts.md#IAnchor) 
* [ITag](./ts/classes/referenceCollection.ts.md#ITag) 

#### TODO 
* [config](./ts/index.ts.md#config) 
* [set-generators](./ts/index.ts.md#set-generators) 
* [errors](./ts/index.ts.md#errors) 

#### classes 
* [ReferenceCollection](./ts/classes/referenceCollection.ts.md#ReferenceCollection) 

------------------------------ 

### Files 
* [authors.md.md](authors.md.md) 
* [license.md.md](license.md.md) 
* [ts/classes/IConfig.ts.md](ts/classes/IConfig.ts.md) 
* [ts/classes/referenceCollection.ts.md](ts/classes/referenceCollection.ts.md) 
* [ts/generators/htmlGenerator.ts.md](ts/generators/htmlGenerator.ts.md) 
* [ts/generators/markdownGenerator.ts.md](ts/generators/markdownGenerator.ts.md) 
* [ts/helpers/fileType.ts.md](ts/helpers/fileType.ts.md) 
* [ts/helpers/helpers.ts.md](ts/helpers/helpers.ts.md) 
* [ts/index.ts.md](ts/index.ts.md) 
* [ts/modules/referenceParser.ts.md](ts/modules/referenceParser.ts.md) 
* [ts/typings/index.d.ts.md](ts/typings/index.d.ts.md) 

------------------------------ 

# Duly Noted

> Code documentation for the modern world. 

## Goal of this project
The goal of this project is to provide an easy, flexible way to comment source code. 

## You can link to what matters
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

### External Links

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

## How the Code is Organized

This code is generally organized into a three parts:
1. A reference parser that parses all the links and anchors in your code - the output of which is two reference maps:
    * `internalReferences.json`
    * `externalReferences.json`
2. A code parser that creates a logical map of you code files line-by-line.
    * each file you input will have a corresponding *.json file output in the duly-noted folder.  
3. Generators that turn those line-by-line maps, and reference collections into human-readable output format. 
    * Markdown 
    * HTML

## Parsing


## Output