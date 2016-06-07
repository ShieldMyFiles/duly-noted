export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
    addAnchor(anchor: IAnchor): void;
    addSubcollection(collection: IReferenceCollection): void;
    addAnchorTag(anchorTag: string[], fileName: string, lineNumber: number): void;
    getAllTags(parentPath?: string): IAnchor[];
}
export interface IAnchor {
    id: string;
    file: string;
    line: number;
}
export declare class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];
    constructor(id: string);
    addAnchor(anchor: IAnchor): void;
    addSubcollection(collection: IReferenceCollection): void;
    addAnchorTag(anchorTag: string[], fileName: string, lineNumber: number): void;
    getAllTags(parentPath?: string): IAnchor[];
}
