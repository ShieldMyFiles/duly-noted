import { IReferenceCollection } from "../classes/referenceCollection";
import { IConfig, IExternalReference } from "../classes/IConfig";
export interface IMarkdownGenerator {
    generate(): void;
}
export declare class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    collection: IReferenceCollection;
    externalReferences: IExternalReference[];
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    constructor(config: IConfig);
    generate(): void;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    replaceAnchors(comment: string, fileName: string, line: number): string;
    replaceInternalLinks(comment: string, fileName: string, line: number): string;
    replaceExternalLinks(comment: string, fileName: string, line: number): string;
    getLinkPrefix(fileName: string): string;
    cleanUp(err: any, files: any): void;
}
