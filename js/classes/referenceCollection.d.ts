export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
}
export interface IAnchor {
    id: string;
    file: string;
    line: number;
}
export interface ITag {
    anchor: string;
    path: string;
    linkStub: string;
}
export declare class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];
    constructor(id: string);
    inflate(collection: IReferenceCollection): this;
    addAnchor(anchor: IAnchor): void;
    addSubcollection(collection: IReferenceCollection): void;
    addAnchorTag(anchorTag: string[], fileName: string, lineNumber: number): void;
    getAllTags(parentPath?: string, depth?: number): ITag[];
}
