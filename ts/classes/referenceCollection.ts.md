 # [ReferenceCollection](#ReferenceCollection)

 [authors/chris](../.././authors.md.md#authors/chris) 

 [license](../.././license.md.md#license) 

 

 This reference parser that parses all the links and anchors in your code - the output of which is two reference collections:

 * `internalReferences.json`

 * `externalReferences.json`

```typescript
import {findWhere, findIndex} from "underscore";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceCollection");
```
 ## [interfaces/IReferenceCollection](#interfaces/IReferenceCollection)

```typescript
export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
}
```
 ## [interfaces/IAnchor](#interfaces/IAnchor)

```typescript
export interface IAnchor {
    id: string;
    file: string;
    line: number;
}
```
 ## [interfaces/ITag](#interfaces/ITag)

```typescript
export interface ITag {
    anchor: string;
    path: string;
    linkStub: string;
}
```
 ## [classes/ReferenceCollection](#classes/ReferenceCollection)

```typescript
export class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];
```
 ### Creates an instance of ReferenceCollection.

```typescript
    constructor(id: string) {
        this.id = id;
        this.anchors = [];
        this.subcollections = [];
    }
```
 ## Recursively inflate a reference collection in the form of [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#interfaces/IReferenceCollection)  from flat data (likely from JSON file)

```typescript
    public inflate(collection: IReferenceCollection) {
        this.id = collection.id;
        this.anchors = collection.anchors;
        for (let i = 0; i < collection.subcollections.length; i++) {
            this.subcollections.push(new ReferenceCollection(collection.subcollections[i].id).inflate(collection.subcollections[i]));
        }
        return this;
    }
```
 ## Add an [interface/IAnchor](#interface/IAnchor) to collection

```typescript
    public addAnchor(anchor: IAnchor): void {
        let existing = findWhere(this.anchors, {id: anchor.id});
        if (existing) {
            logger.error("Cannot add anchor '" + anchor.id + "' from " + anchor.file + ":" + anchor.line + " to '" + this.id + "' collection because it was already defined at " + existing.file + ":" + existing.line);
        }
        this.anchors.push(anchor);
    }
```
 ## Add a subcollection to this collection in the form of an [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#interfaces/IReferenceCollection) 

```typescript
    public addSubcollection(collection: IReferenceCollection): void {
        let existingAnchor = findWhere(this.anchors, {id: collection.id});
        if (existingAnchor) {
            logger.error("Cannot add collection '" + collection.id + "' because it was already defined as an anchor " + existingAnchor.file + ":" + existingAnchor.line);
            return;
        }
        let existingCollection = findWhere(this.anchors, {id: collection.id});
        if (existingCollection) {
            logger.error("Cannot add collection '" + collection.id + "' because it was already defined as a subcollection of '" + collection.id +  "'");
            return;
        }
        this.subcollections.push(collection);
    }
```
 ## Add Anchor Tag to the appropriate subcollection

 Recursively skims the collection and subcollections to place anchor in the correct place.

```typescript
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
```
 ## Get All the tags in a collection and its subcollections

 Recursively cull all of the tags.

```typescript
    public getAllTags(parentPath?: string, depth?: number): ITag[] {
        parentPath = parentPath || "";
        depth = depth || 0;
        let allTags: ITag[] = [];
        if (depth > 0) {
            for (let i = 0; i < this.anchors.length; i++) {
                if (parentPath !== "" && parentPath !== null) {
                    allTags.push({
                        anchor: parentPath + "/" + this.id + "/" + this.anchors[i].id,
                        path: this.anchors[i].file,
                        linkStub: this.anchors[i].id
                    });
                } else {
                    allTags.push({
                        anchor: this.id + "/" + this.anchors[i].id,
                        path: this.anchors[i].file,
                        linkStub: this.anchors[i].id
                    });
                }
            }
            for (let i = 0; i < this.subcollections.length; i++) {
                allTags = allTags.concat(this.subcollections[i].getAllTags(parentPath + "/" + this.id,  depth + 1));
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
```
 ## Get a list of anchors sorted by an array of all the collections.

```typescript
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
```
