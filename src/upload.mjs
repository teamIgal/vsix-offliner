import {join, parse} from "path";
import {globby} from "globby";
import {publish, createNamespace} from "ovsx";
import {retryWithBackoff, EXTENSION_FILE_NAME_PARTS_SEPARATOR} from "./common.mjs";

export const DEFAULTS = {
    EXTENSIONS_DIR: "./extensions"
};

async function uploadExtension(path, authOptions) {
    const {name} = parse(path);
    const [publisherDisplayName] = name.split(EXTENSION_FILE_NAME_PARTS_SEPARATOR, 1);
    
    await createNamespace({
        name: publisherDisplayName, 
        ...authOptions
    });

    await publish({
        packagePath: path,
        ...authOptions
    });
}

export async function uploadExtensionsInDir({dirPath, registryUrl, username, password}) {
    const authOptions = {registryUrl, username, password};

    // Get iterable of extension files.
    console.log("Getting extensions list from directory...")
    const glob = join(dirPath, "**/*.vsix")
    const filePaths = await globby(glob);
    
    // Upload the extensions one by one.
    console.log("Uploading extensions...")
    let success = true;
    
    for (const filePath in filePaths) {
        try {
            await retryWithBackoff(
                // Retry, backoff settings.
                downloadRetries, 
                downloadTimeoutMinutes, 
                downloadBackoffMinutes, 
                // Function.
                uploadExtension,
                // Parameters.
                filePath, authOptions
            );
        } catch(e) {
            console.error(e.message);
            success = false;
            break;
        }
    }
    
    if (success) {
        console.log("Done!");
    } else {
        console.log("Failed to upload all extensions.");
    }
}

