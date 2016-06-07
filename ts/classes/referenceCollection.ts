import {findWhere, findIndex} from "underscore";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceCollection");

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
            logger.error("Cannot add collection '" + collection.id + "because it was already defined as an anchor " + existingAnchor.file + ":" + existingAnchor.line);
            return;
        }

        let existingCollection = findWhere(this.anchors, {id: collection.id});
        if (existingCollection) {
            logger.error("Cannot add collection '" + collection.id + "because it was already defined as a subcollection of '" + collection.id +  "'");
            return;
        }

        this.subcollections.push(collection);
    }

    public addAnchorTag(anchorTag: string[], fileName: string, lineNumber: number): void {
        logger.debug("processing new anchorTag: " + JSON.stringify(anchorTag));
        if (anchorTag.length === 1) {
            logger.debug("Adding anchor tag:" + anchorTag[0]);
            this.addAnchor({
                id: anchorTag[0],
                line: lineNumber,
                file: fileName
            });
            return;
        } else {
            // collection already exists?
            let collectionTag = anchorTag.shift();

            let i = findIndex(this.subcollections, (item) => {
                return item.id === collectionTag;
            });

            logger.debug("i:" + i);

            if (i > -1) {
            logger.debug("Collection present:" + collectionTag);

            return this.subcollections[i].addAnchorTag(anchorTag, fileName, lineNumber);
            } else {
                logger.debug("Collection not present:" + collectionTag);
                let newSubCollection = new ReferenceCollection(collectionTag);
                newSubCollection.addAnchorTag(anchorTag, fileName, lineNumber);
                this.addSubcollection(newSubCollection);
                return;
            }
        }
    }

    public getAllTags(parentPath?: string): IAnchor[] {
        parentPath = parentPath || "";

        let allTags: IAnchor[] = [];

        for (let i = 0; i < this.anchors.length; i++) {
            allTags.push({
                id: parentPath + "/" + this.id + "/" + this.anchors[i].id,
                file: this.anchors[i].file,
                line: this.anchors[i].line
            });
        }

        for (let i = 0; i < this.subcollections.length; i++) {
            allTags = allTags.concat(this.subcollections[i].getAllTags(parentPath + "/" + this.id));
        }

        return allTags;
    }
}