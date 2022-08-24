import {join} from "path";
import {writeFile, mkdir, access} from "fs/promises";
import {retryWithBackoff, EXTENSION_FILE_NAME_PARTS_SEPARATOR} from "./common.mjs";
import getTopExtensionsRequest from "./get-top-packages.request.json" assert { type: "json" };

import fetch from "node-fetch";
import filenamify from "filenamify";

const HEADER_CONTENT_TYPE = "content-type";
const VSIX_CONTENT_TYPE = "application/vsix; api-version=7.1-preview.1";
const TOP_EXTENSIONS_AMOUNT_TEMPLATE = "{{TOP_EXTENSIONS_AMOUNT}}";

export const DEFAULTS = {
    TOP_EXTENSIONS_AMOUNT: 1000,
    DOWNLOAD_DIR: "./extensions",
    DOWNLOAD_TIMEOUT_MIN: 1,
    DOWNLOAD_TIMEOUT_BACKOFF_MIN: 2,
    DOWNLOAD_RETRIES: 5
};

async function* getTopExtensions(amount) {
    const {url, ...options} = getTopExtensionsRequest; 

    options.body = options.body
        .replace(TOP_EXTENSIONS_AMOUNT_TEMPLATE, amount);

    const response = await fetch(url, options);
    const json = await response.json();
    
    yield* json.results[0].extensions;
}

function extractExtensionRelevantInfo(extensionInfo) {
    const {extensionName, displayName} = extensionInfo;
    const {publisherName, displayName: publisherDisplayName} = extensionInfo.publisher;
    const version = extensionInfo.versions[0].version;

    return {
        extensionName, 
        displayName,
        publisherName,
        publisherDisplayName,
        version
    };
}

function createExtensionDownloadSpec(extensionInfo, downloadDir) {
    const {
        publisherName, 
        publisherDisplayName, 
        extensionName, 
        displayName, 
        version
    } = extensionInfo;

    const targetFileName = filenamify(
        EXTENSION_FILE_NAME_PARTS_SEPARATOR.join(
            publisherDisplayName, displayName, version));
    
    const targetPath = join(downloadDir, targetFileName)
    
    const url = (
        'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/' +
        `${publisherName}/vsextensions/${extensionName}/${version}/vspackage`
    );

    return {targetPath, url};
}

async function downloadExtension(extension, downloadDir) {
    // Get extension info.
    const info = extractExtensionRelevantInfo(extension);
    const {url, targetPath} = createExtensionDownloadSpec(info, downloadDir);

    // Skip extensions we already downloaded on previous runs.
    try {
        await access(extensionDownloadSpec.targetPath);
        return;
    } catch {}

    // Download file.
    console.log(`Downloading ${info.displayName} ${info.version} by ${info.publisherDisplayName}...`);

    const response = await fetch(url);
    const contentType = response.headers.get(HEADER_CONTENT_TYPE);

    if (contentType != VSIX_CONTENT_TYPE) {
        throw new Error(`Bad content type ${contentType}`);
    }

    await writeFile(targetPath, response.body);
}

export async function downloadTopExtensions({
    amount, downloadDir, downloadRetries, downloadTimeoutMinutes, 
    downloadBackoffMinutes, 
}) {
    // Create download directory if needed.
    try {
        await mkdir(downloadDir);
    } catch {}

    // Get async iterable of extensions.
    console.log("Getting extensions list...")
    const extensions = getTopExtensions(amount);
    
    // Download the extensions one by one.
    console.log("Downloading extensions...")
    let success = true;
    
    for await (const extension of extensions) {
        try {
            await retryWithBackoff(
                // Retry, backoff settings.
                downloadRetries, 
                downloadTimeoutMinutes, 
                downloadBackoffMinutes, 
                // Function.
                downloadExtension, 
                // Parameters.
                extension, downloadDir
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
        console.log("Failaed to download all extensions.");
    }
}
