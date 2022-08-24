import {setTimeout} from "timers/promises";
const MIN_TO_MS = 60 * 1000;

export const EXTENSION_FILE_NAME_PARTS_SEPARATOR = "__";

export async function retryWithBackoff(retries, delayMinutes, backoffMinutes, async_fn, ...args) {
    let retries_remaining = retries;

    while (true) {
        try {
            return await async_fn(...args);
        } catch(e) {
            console.error(e.message);

            retries_remaining -= 1;                
            console.warn(`Failed. Remaining retries ${retries_remaining}/${retries}.`)

            if (retries_remaining == 0) {                
                throw new Error(`Exeeded number of allow retries (${retries}).`)
            } 

            delayMinutes += backoffMinutes;
            console.warn(`Increased delay to ${delayMinutes} minutes.`)
        
            console.log(`Waiting for ${delayMinutes} minutes before retrying...`);            
            await setTimeout(delayMinutes * MIN_TO_MS);
        }
    }
}