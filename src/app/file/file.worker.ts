import 'globals';
import { Utils, knownFolders, path, File } from '@nativescript/core';

/**
 * The file worker
 * A simple worker based around file read/writes
 * Queue management is performed by FileService. Multiple workers are not thread safe.
 */
class FileWorker {
    /**
     * @constructor
     */
    constructor() { }

    /**
     * Gets the absolute path to the filename provided
     * @param filename The filename we want
     * @constructor
     */
    static GetPath(filename) {
        const documentPath = knownFolders.documents()?.path;

        return path.join(documentPath, filename);
    }

    /**
     * Returns the diff in seconds between two millesecond dates (i.e. from new Date().getTime())
     * @param startTimeMs The start time to diff
     * @param endTimeMs The end time to diff
     */
    static diffInSeconds(startTimeMs: number, endTimeMs: number) :number {
        return (endTimeMs - startTimeMs) / 1000;
    };

    /**
     * Reply to the caller
     * @param message The message object
     */
    static reply(message: any) {
        console.log('(%s) Replying', message.messageId);
        (global as any).postMessage(message);
    }

    /**
     * Handles errors, replying with the error to the caller
     * @param id The message id
     * @param error The error
     */
    static error (id, error: any) {
        console.log(error);

        const message : any = {
            messageId: id,
            error: error.message,
        };

        this.reply(message);
    };

    /**
     * When we receive a message this is what we do.
     * @param msg The message
     */
    static onMessage(msg: MessageEvent) {
        const id = msg.data.id;
        const method = msg.data.method;
        const args = msg.data.args;

        console.log("(%s) Received", id);

        const worker = new FileWorker();
        let response;
        try {
            if (method === "write") {
                response = worker.WriteFile(args.fileName, args.data);
            } else if (method === "read") {
                response = worker.ReadFile(args.fileName);
            } else {
                const message = `(${id}) Method ${method} not implemented`;
                return this.error(id, new Error(message));
            }

            const message: any = {
                messageId: id,
                response,
            };

            this.reply(message);

            // todo: is it necessary? Potentially old cause of OOME would be not terminating the worker
            Utils.GC();
        } catch (e) {
            this.error(id, e);
        }
    }

    /**
     * Safe writes to disk
     * @param fileName The filename
     * @param serialized The data
     */
    WriteFile(fileName, serialized) {
        const backupName = `${fileName}.json.2`;
        const actualName = `${fileName}.json`;

        console.log('Safe Writing to %s with (approx)%dKB of data', actualName, Math.round(serialized.length / 1024));

        const backupPath = FileWorker.GetPath(backupName);
        const actualPath = FileWorker.GetPath(actualName);

        // Ensures both are created
        const backupFile = File.fromPath(backupPath);
        const actualFile = File.fromPath(actualPath);

        const startTime = new Date().getTime();

        backupFile.writeTextSync(serialized, (error) => {
            console.log(error);
            throw error;
        });

        actualFile.removeSync((error) => {
            console.log(error);
            throw error;
        });

        backupFile.renameSync(actualName, (error) => {
            console.log(error);
            throw error;
        });

        const endTime = new Date().getTime();
        console.log('Finished writing to %s file, taking %d seconds', actualName, FileWorker.diffInSeconds(startTime, endTime).toFixed(3));
    }

    /**
     * Reads file from disk and returns its JSON content
     * @param fileName The filename
     * @constructor
     */
    ReadFile(fileName) {
        // If the .2 file exists, it means we crashed before renaming
        // it to .json, so we should probably use that file as the
        // most up to date data.
        let path = FileWorker.GetPath(fileName + '.json.2');
        if (!File.exists(path)) {
            path = FileWorker.GetPath(fileName + '.json');
        }

        if (!File.exists(path)) {
            const message = `Not loading ${path} - file does not exist.`;
            console.log(message);
            throw new Error(message);
        }

        console.log('Reading file:', path);
        const file = File.fromPath(path);
        const json = file.readTextSync();

        console.log('Read file');
        const parsed = JSON.parse(json);
        console.log('Successfully parsed json');
        return parsed;
    }
}

// Configure the worker
const context: Worker = self as any;
context.onmessage = (msg) => FileWorker.onMessage(msg);

// let them know we're set up.
FileWorker.reply('ready');
