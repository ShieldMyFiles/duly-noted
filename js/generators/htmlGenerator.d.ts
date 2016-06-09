import { IReferenceCollection, ITag } from "../classes/referenceCollection";
export interface IHtmlGenerator {
}
export declare class HtmlGenerator implements IHtmlGenerator {
    outputDir: string;
    collection: IReferenceCollection;
    anchorRegExp: RegExp;
    linkRegExp: RegExp;
    template: any;
    projectPath: string;
    referenceCollection: IReferenceCollection;
    tags: ITag[];
    constructor(outputDir: string, templatePath: string, anchorRegExp: RegExp, linkRegExp: RegExp);
    generate(): void;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    replaceAnchors(comment: string, fileName: string, line: number): string;
    replaceLinks(comment: string, fileName: string, line: number): string;
    cleanUp(err: any, files: any): void;
    markdownHelper(context: any, options: any): string;
}
