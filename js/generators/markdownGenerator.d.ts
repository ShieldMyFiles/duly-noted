import { ITag, ReferenceCollection } from "../classes/referenceCollection";
import { IConfig, IExternalReference } from "../classes/IConfig";
import Q = require("q");
export interface IMarkdownGenerator {
    generate(): void;
}
export declare class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    indexFile: string;
    externalReferences: IExternalReference[];
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    referenceCollection: ReferenceCollection;
    tags: ITag[];
    readme: string;
    projectName: string;
    outputFiles: string[];
    htmlAnchors: boolean;
    gitHubHtmlAnchors: boolean;
    constructor(config: IConfig, logLevel?: string);
    generate(): Q.IPromise<{}>;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    replaceAnchors(comment: string, fileName: string, line: number, position?: number): any;
    replaceLinks(comment: string, fileName: string, line: number, position?: number): any;
    generateIndexPage(readmeText?: any): void;
    getLinkPrefix(fileName: string): string;
}
