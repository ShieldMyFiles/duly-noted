import {findWhere} from "underscore";

export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
    addAnchor(anchor: IAnchor): void;
    addSubcollection(collection: IReferenceCollection): void;
}

export interface IAnchor {
    id: string;
    file: string;
    line: number;
}

export class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];

    constructor(id: string) {
        this.id = id;
        this.anchors = [];
        this.subcollections = [];
    }

    public addAnchor(anchor: IAnchor): void {
        let existing = findWhere(this.anchors, {id: anchor.id});
        if (existing) {
            throw new Error("Cannot add anchor '" + anchor.id + "' from " + anchor.file + ":" + anchor.line + " to " + this.id + "because it was already defined at " + existing.file + ":" + existing.line);
        }

        this.anchors.push(anchor);
    }

    public addSubcollection(collection: IReferenceCollection): void {
        let existingAnchor = findWhere(this.anchors, {id: collection.id});
        if (existingAnchor) {
            throw new Error("Cannot add collection '" + collection.id + "because it was already defined as an anchor " + existingAnchor.file + ":" + existingAnchor.line);
        }

        let existingCollection = findWhere(this.anchors, {id: collection.id});
        if (existingCollection) {
            throw new Error("Cannot add collection '" + collection.id + "because it was already defined as a subcollection of '" + collection.id +  "'");
        }

        this.subcollections.push(collection);
    }
}