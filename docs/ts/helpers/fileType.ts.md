
 <a name="helpers-getfiletype" id="helpers-getfiletype" ></a>[🔗](#user-content-helpers-getfiletype)helpers/getFileType
# Get File Type
 [authors/chris](../.././authors.md.md#user-content-authors-chris)
 [license](../.././license.md.md#user-content-license)

This helper function maps file extensions to 
their fully named typed. This is important for
a few reasons:
 1. Code Renders in documentation (like highlight.js) use the long name of the language.
 2. Our [comment-patterns](../.././bin/README.md.md#user-content-comment-patterns) use the full name for account for langauages the have multiple extensions.

```typescript
export function getFileType(fileName: string): string {
    let parsed = fileName.split(".");
    let extension = parsed[parsed.length - 1];
    switch (extension) {
        case "ts":
            return "typescript";

        case "js":
            return "javascript";

        case "html":
            return "html";

        case "less":
            return "less";

        case "css":
            return "css";

        default:
            return "plain/text";
    }
}
```