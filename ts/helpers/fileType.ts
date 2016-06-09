export function getFileType(fileName: string): string {
    let parsed = fileName.split(".");
    let extension = parsed[parsed.length - 1];
    switch (extension) {
        case "ts":
            return "typescript";

        case "js":
            return "javascript";

        default:
            return "plain/text";
    }
}