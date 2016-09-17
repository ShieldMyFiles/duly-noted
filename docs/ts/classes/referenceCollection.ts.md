
 <a name="referencecollection" id="referencecollection" ></a>[🔗](#user-content-referencecollection)ReferenceCollection




TEST [ReferenceCollection](../.././ts/classes/referenceCollection.ts.md#user-content-referencecollection)

This reference parser that parses all the links and anchors in your code - the output of which is two reference collections:
* `internalReferences.json`
* `externalReferences.json`

```typescript
import {findWhere, findIndex} from "underscore";
import log4js = require("log4js");
let logger = log4js.getLogger("duly-noted::ReferenceCollection");
let logRunLevel: string;

```

## <a name="interfaces-ireferencecollection" id="interfaces-ireferencecollection" ></a>[🔗](#user-content-interfaces-ireferencecollection)interfaces/IReferenceCollection

```typescript
export interface IReferenceCollection {
    id: string;
    anchors?: IAnchor[];
    subcollections?: IReferenceCollection[];
}

```

## <a name="interfaces-ianchor" id="interfaces-ianchor" ></a>[🔗](#user-content-interfaces-ianchor)interfaces/IAnchor

```typescript
export interface IAnchor {
    id: string;
    file: string;
    line: number;
}

```

## <a name="interfaces-itag" id="interfaces-itag" ></a>[🔗](#user-content-interfaces-itag)interfaces/ITag

```typescript
export interface ITag {
    anchor: string;
    path: string;
    linkStub: string;
}

```
 <a name="referencecollection-class" id="referencecollection-class" ></a>[🔗](#user-content-referencecollection-class)ReferenceCollection/class
## Reference Collection Class

```typescript
export class ReferenceCollection implements IReferenceCollection {
    id: string;
    anchors: IAnchor[];
    subcollections: IReferenceCollection[];

```
 <a name="referencecollection-constructor" id="referencecollection-constructor" ></a>[🔗](#user-content-referencecollection-constructor)ReferenceCollection/constructor
### Creates an instance of [ReferenceCollection/class](../.././ts/classes/referenceCollection.ts.md#user-content-referencecollection-class)

```typescript
    constructor(id: string, logLevel?: string) {
        logRunLevel = logLevel || "DEBUG";
        logger.setLevel(logRunLevel);
        this.id = id;
        this.anchors = [];
        this.subcollections = [];
    }

```
 <a name="referencecollection-inflate" id="referencecollection-inflate" ></a>[🔗](#user-content-referencecollection-inflate)ReferenceCollection/inflate
## Inflate
Recursively inflate a reference collection in the form of [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#user-content-interfaces-ireferencecollection) from flat data (likely from JSON file)

```typescript
    public inflate(collection: IReferenceCollection) {
        this.id = collection.id;
        this.anchors = collection.anchors;
        for (let i = 0; i < collection.subcollections.length; i++) {
            this.subcollections.push(new ReferenceCollection(collection.subcollections[i].id, this.logLevel).inflate(collection.subcollections[i]));
        }
        return this;
    }

```
 <a name="referencecollection-addanchor" id="referencecollection-addanchor" ></a>[🔗](#user-content-referencecollection-addanchor)ReferenceCollection/addAnchor
## Add Anchor
Add an [interfaces/IAnchor](../.././ts/classes/referenceCollection.ts.md#user-content-interfaces-ianchor) to collection

```typescript
    public addAnchor(anchor: IAnchor): void {
        let existing = findWhere(this.anchors, {id: anchor.id});
        if (existing) {
            logger.error("Cannot add anchor '" + anchor.id + "' from " + anchor.file + ":" + anchor.line + " to '" + this.id + "' collection because it was already defined at " + existing.file + ":" + existing.line);
        }

        this.anchors.push(anchor);
    }

```
 <a name="referencecollection-addsubcollection" id="referencecollection-addsubcollection" ></a>[🔗](#user-content-referencecollection-addsubcollection)ReferenceCollection/addSubcollection
## Add Subcollection
Add a subcollection to this collection in the form of an [interfaces/IReferenceCollection](../.././ts/classes/referenceCollection.ts.md#user-content-interfaces-ireferencecollection)

```typescript
    public addSubcollection(collection: IReferenceCollection): void {

        let existingCollection = findWhere(this.subcollections, {id: collection.id});
        if (existingCollection) {
            logger.error("Cannot add collection '" + collection.id + "' from: " + collection.anchors[0].file + " because it was already defined as a subcollection of '" + collection.id +  "'");
            return;
        }

        this.subcollections.push(collection);
        logger.debug("Added subcollection '" + collection.id + "' to '" + this.id +"'");
    }

```
 <a name="referencecollection-addanchortag" id="referencecollection-addanchortag" ></a>[🔗](#user-content-referencecollection-addanchortag)ReferenceCollection/addAnchorTag
## Add Anchor Tag
Add Anchor Tag to the appropriate subcollection by
recursively skiming the collection and subcollections 
to place anchor in the correct place.

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

```
 <a name="referencecollection-getalltags" id="referencecollection-getalltags" ></a>[🔗](#user-content-referencecollection-getalltags)ReferenceCollection/getAllTags
## Get All Tags
Get All the tags in a collection and its subcollections
by recursively culling all of the tags.

```typescript
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

```
 <a name="referencecollection-gettagsbycollection" id="referencecollection-gettagsbycollection" ></a>[🔗](#user-content-referencecollection-gettagsbycollection)ReferenceCollection/getTagsByCollection
## Get Tags By Collection
Get a list of anchors sorted by an array of all the collections.

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