import { ITag, ReferenceCollection } from "../classes/referenceCollection";
import { IConfig, IExternalReference } from "../classes/IConfig";
export interface IMarkdownGenerator {
    generate(): void;
}
export declare class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    externalReferences: IExternalReference[];
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    referenceCollection: ReferenceCollection;
    tags: ITag[];
    readme: string;
    projectName: string;
    outputFiles: string[];
    constructor(config: IConfig);
    generate(cleanUp?: boolean): void;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    replaceAnchors(comment: string, fileName: string, line: number): string;
    replaceInternalLinks(comment: string, fileName: string, line: number): string;
    replaceExternalLinks(comment: string, fileName: string, line: number): string;
    generateIndexPage(readmeText?: any): void;
    getLinkPrefix(fileName: string): string;
    cleanUp(err: any, files: any): void;
}
