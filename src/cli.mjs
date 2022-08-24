import pkg from "../package.json" assert { type: "json" };
import yargs from "yargs";
import { hideBin } from 'yargs/helpers'

import {
    downloadTopExtensions, 
    DEFAULTS as DOWNLOAD_DEFAULTS
} from "./download.mjs";

import {
    uploadExtensionsInDir, 
    DEFAULTS as UPLOAD_DEFAULTS
} from "./upload.mjs";

export const cli = yargs(hideBin(process.argv))
    .scriptName(pkg.name)
    .version(pkg.version)
    .command(
        "download-top-extensions", 
        "Download top N VSCode extensions to VSIX file",
        {
            "amount": {
                type: "number",
                default: DOWNLOAD_DEFAULTS.TOP_EXTENSIONS_AMOUNT
            },
            "download-dir": {
                type: "string",
                default: DOWNLOAD_DEFAULTS.DOWNLOAD_DIR
            },
            "download-retries": {
                type: "number",
                default: DOWNLOAD_DEFAULTS.DOWNLOAD_RETRIES
            },
            "download-timeout-minutes": {
                type: "number",
                default: DOWNLOAD_DEFAULTS.DOWNLOAD_TIMEOUT_MIN
            },
            "download-backoff-minutes": {
                type: "number",
                default: DOWNLOAD_DEFAULTS.DOWNLOAD_TIMEOUT_BACKOFF_MIN
            },
        },
        downloadTopExtensions
    )
    .command(
        "upload-extensions-in-dir",
        "Upload all extensions downloaded by this tool from a directory",
        {
            "extensions-dir": {
                type: "string",
                default: UPLOAD_DEFAULTS.EXTENSIONS_DIR
            },
            "upload-retries": {
                type: "number",
                default: UPLOAD_DEFAULTS.UPLOAD_RETRIES
            },
            "upload-timeout-minutes": {
                type: "number",
                default: UPLOAD_DEFAULTS.UPLOAD_TIMEOUT_MIN
            },
            "upload-backoff-minutes": {
                type: "number",
                default: UPLOAD_DEFAULTS.UPLOAD_TIMEOUT_BACKOFF_MIN
            },
        },
        uploadExtensionsInDir
    )
    .strictCommands()
    .demandCommand(1)
    .completion();