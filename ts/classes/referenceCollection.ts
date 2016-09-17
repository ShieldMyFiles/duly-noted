/** !ReferenceCollection
 *# Reference Collection
 *@authors/chris
 *@license
 * 
 * TEST @ReferenceCollection
 * 
 * This reference parser that parses all the links and anchors in your code - the output of which is two reference collections:
 * * `internalReferences.json`
 * * `externalReferences.json`
 */
import {findWhere, findIndex} from "underscore";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceCollection");
let logRunLevel: string;

/**
 * ## !interfaces/IReferenceCollection
 */
export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
}

/**
 * ## !interfaces/IAnchor
 */
export interface IAnchor {
    id: string;
    file: string;
    line: number;
}

/**
 * ## !interfaces/ITag
 */
export interface ITag {
    anchor: string;
    path: string;
    linkStub: string;
}

/** !ReferenceCollection/class
 * ## Reference Collection Class
 */
export class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];

    /** !ReferenceCollection/constructor
     * ### Creates an instance of @ReferenceCollection/class
     */
    constructor(id: string, logLevel?: string) {
        logRunLevel = logLevel || "DEBUG";
        logger.setLevel(logRunLevel);
        this.id = id;
        this.anchors = [];
        this.subcollections = [];
    }

    /** !ReferenceCollection/inflate
     * ## Inflate
     * Recursively inflate a reference collection in the form of @interfaces/IReferenceCollection from flat data (likely from JSON file)
     */
    public inflate(collection: IReferenceCollection) {
        this.id = collection.id;
        this.anchors = collection.anchors;
        for (let i = 0; i < collection.subcollections.length; i++) {
            this.subcollections.push(new ReferenceCollection(collection.subcollections[i].id, this.logLevel).inflate(collection.subcollections[i]));
        }
        return this;
    }

    /** !ReferenceCollection/addAnchor
     * ## Add Anchor
     * Add an @interfaces/IAnchor to collection
     */
    public addAnchor(anchor: IAnchor): void {
        let existing = findWhere(this.anchors, {id: anchor.id});
        if (existing) {
            logger.error("Cannot add anchor '" + anchor.id + "' from " + anchor.file + ":" + anchor.line + " to '" + this.id + "' collection because it was already defined at " + existing.file + ":" + existing.line);
        }

        this.anchors.push(anchor);
    }

    /** !ReferenceCollection/addSubcollection
     * ## Add Subcollection
     * Add a subcollection to this collection in the form of an @interfaces/IReferenceCollection
     */
    public addSubcollection(collection: IReferenceCollection): void {

        let existingCollection = findWhere(this.subcollections, {id: collection.id});
        if (existingCollection) {
            logger.error("Cannot add collection '" + collection.id + "' from: " + collection.anchors[0].file + " because it was already defined as a subcollection of '" + collection.id +  "'");
            return;
        }

        this.subcollections.push(collection);
        logger.debug("Added subcollection '" + collection.id + "' to '" + this.id +"'");
    }

    /** !ReferenceCollection/addAnchorTag
     * ## Add Anchor Tag
     * Add Anchor Tag to the appropriate subcollection by
     * recursively skiming the collection and subcollections 
     * to place anchor in the correct place.
     */
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
            let collectionTag = anchorTag.shift();

            let i = findIndex(this.subcollections, (item) => {
                return item.id === collectionTag;
            });

            if (i > -1) {
                logger.debug("Collection present: " + collectionTag);
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

    /** !ReferenceCollection/getAllTags
     * ## Get All Tags
     * Get All the tags in a collection and its subcollections
     * by recursively culling all of the tags.
     */
    public getAllTags(parentPath?: string, depth?: number): ITag[] {
        parentPath = parentPath || "";
        depth = depth || 0;

        logger.debug("parentPath " + parentPath + " depth " + depth);

        let allTags: ITag[] = [];
        if (depth > 0) {
            if (parentPath !== "" && parentPath !== null) {
                for (let i = 0; i < this.anchors.length; i++) {
                    allTags.push({
                        anchor: parentPath + "/" + this.id + "/" + this.anchors[i].id,
                        path: this.anchors[i].file,
                        linkStub: this.anchors[i].id
                    });
                }

                for (let i = 0; i < this.subcollections.length; i++) {
                    allTags = allTags.concat(this.subcollections[i].getAllTags(parentPath + "/" + this.id,  depth + 1));
                }

            } else {
                for (let i = 0; i < this.anchors.length; i++) {
                    allTags.push({
                        anchor: this.id + "/" + this.anchors[i].id,
                        path: this.anchors[i].file,
                        linkStub: this.anchors[i].id
                    });
                }

                for (let i = 0; i < this.subcollections.length; i++) {
                    allTags = allTags.concat(this.subcollections[i].getAllTags(this.id,  depth + 1));
                }
            }
        } else {

            for (let i = 0; i < this.anchors.length; i++) {
                allTags.push({
                    anchor: this.anchors[i].id,
                    path: this.anchors[i].file,
                    linkStub: this.anchors[i].id
                });
            }

            for (let i = 0; i < this.subcollections.length; i++) {
                allTags = allTags.concat(this.subcollections[i].getAllTags(null, depth + 1));
            }
        }

        return allTags;
    }

    /** !ReferenceCollection/getTagsByCollection
     * ## Get Tags By Collection
     * Get a list of anchors sorted by an array of all the collections.
     */
    public getTagsByCollection (allCollections?, parentPath?) {
        allCollections = allCollections || [];
        parentPath = parentPath || "";
        let id = parentPath + "/" + this.id;

        allCollections.push({
            name: id,
            anchors: []
        });

        for (let i = 0; i < this.anchors.length; i++) {
            allCollections[allCollections.length - 1].anchors.push({
                anchor: this.anchors[i].id,
                path: this.anchors[i].file,
                linkStub: this.anchors[i].id
            });
        }

        for (let i = 0; i < this.subcollections.length; i++) {
            allCollections = this.subcollections[i].getTagsByCollection(allCollections, id);
        }

        return allCollections;
    }
}