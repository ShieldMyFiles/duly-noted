import { ITag, ReferenceCollection } from "../classes/referenceCollection";
import { Config, IExternalReference } from "../classes/IConfig";
import Q = require("q");
export interface IHtmlGenerator {
}
export declare class HtmlGenerator implements IHtmlGenerator {
    outputDir: string;
    collection: ReferenceCollection;
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    template: any;
    indexTemplate: any;
    projectPath: string;
    referenceCollection: ReferenceCollection;
    tags: ITag[];
    externalReferences: IExternalReference[];
    readme: string;
    projectName: string;
    constructor(config: Config, logLevel?: string);
    generate(): Q.IPromise<{}>;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    replaceAnchors(comment: string, fileName: string, line: number): string;
    replaceInternalLinks(comment: string, fileName: string, line: number): string;
    replaceExternalLinks(comment: string, fileName: string, line: number): string;
    generateIndexPage(): void;
    getLinkPrefix(fileName: string): string;
    markdownHelper(context: any, options: any): string;
    ifCondHelper(v1: any, v2: any, options: any): any;
}
