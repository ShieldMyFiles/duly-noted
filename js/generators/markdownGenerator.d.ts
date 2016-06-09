import { IReferenceCollection } from "../classes/referenceCollection";
export interface IMarkdownGenerator {
    generate(): void;
}
export declare class MarkdownGenerator implements IMarkdownGenerator {
    outputDir: string;
    collection: IReferenceCollection;
    constructor(outputDir: string);
    generate(): void;
    proccessFile(err: Error, content: string, next: Function, outputDir: string): void;
    cleanUp(err: any, files: any): void;
}
