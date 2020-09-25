import { Injectable } from "@angular/core";
import * as FileWorker from "nativescript-worker-loader!./file.worker";

// Resources
import secondsAsMs from "../utils/secondsAsMs";
import shortid from "../utils/shortid";
import removeFromArray from "../utils/removeFromArray";
import { IFileDeferred } from "./IFileDeferred";
import { IMessageParameters } from "./IMessageParameters";

/**
 * Reads and writes files
 */
@Injectable({
    providedIn: 'root',
})
export class FileService {
    /**
     * The timeout in seconds
     * @private
     */
    private readonly timeout = 20;

    /**
     * If the worker times out, we kill it to try again.
     *
     * But we first wait this amount of seconds.
     *
     * @private
     */
    private readonly restartAfter = 5;

    /**
     * If the worker times out, we kill it to try again.
     *
     * But we first wait this amount of seconds.
     *
     * @private
     */
    private readonly maxRetries = 3;

    /**
     * The current worker instance
     * @private
     */
    private worker: Worker;

    /**
     * Communication with web workers is not in a request -> response fashion, it's
     * in the form of a message which can fire at any time. So to route the
     * messages we get from the worker to their original caller we have to keep
     * a table.
     * @private
     */
    private messages : IFileDeferred[] = [];

    /**
     * True if busy?
     * @private
     */
    private busy = false;

    /**
     * @constructor
     * @param logger The logger
     */
    constructor() { }

    /**
     * Reads a file returning a promise of the result
     * @param fileName The filename to read
     */
    readFile(fileName): Promise<any> {
        return this.sendMessage({
            method: 'read',
            args: {
                fileName: fileName,
            }
        });
    }

    /**
     * Writes a file, returning a promise when done
     * @param fileName The filename
     * @param data The data to write
     */
    writeFile(fileName: string, data: string): Promise<void> {
        return this.sendMessage({
            method: 'write',
            args: {
                data: data,
                fileName: fileName,
            }
        });
    }

    /**
     * Gets a worker.
     * - If the worker has been terminated it creates a new one.
     * - Resolves when the worker is ready to receive messages
     * @private
     */
    private async getWorker(): Promise<Worker> {
        if (this.worker) {
            return this.worker;
        }

        console.log('Initialising new file worker');
        this.worker = new FileWorker();
        this.worker.onerror = (error: ErrorEvent) => this.onError(error);
        const readyPromise = new Promise(resolve => {
            this.worker.onmessage = (message: MessageEvent) => this.onMessage(message, resolve);
        });
        console.log('Initialised new file worker');

        await readyPromise;

        return this.worker;
    }

    /**
     * Terminates and discards the worker
     * @param restart If true, we should put the worker on hold and restart it in a moment to attempt recovery from a timeout
     * @private
     */
    private terminateWorker(restart = false) {
        console.log('Terminating and discarding worker');
        this.worker.terminate();
        this.worker = null;
        this.busy = false;

        if (restart) {
            this.busy = true; // to avoid other processes causing the FileWorker to be called
            // @ts-ignore
            setTimeout(() => {
                console.log('Restarting Worker to retry processing queue');
                this.busy = false;
                this.processQueue();
            }, secondsAsMs(this.restartAfter));
        }
    }

    /**
     * Called when the worker sends us a message
     * @param messageFrom The message from the worker
     * @param resolve Resolved after ready call for a new worker.
     * @private
     */
    private onMessage(messageFrom: MessageEvent, resolve: () => void) {
        if (messageFrom.data === 'ready') {
            // todo: pretty sure we should await this before throwing messages at the worker?
            console.log(`Received 'ready' from fileWorker`);
            resolve();
            return;
        }

        const id = messageFrom.data.messageId;
        const messageTo = this.getMessage(id);

        if (messageTo) {
            console.log(`(${id}) Response from FileWorker to : ${messageTo.method} ${messageTo.message?.args?.fileName}`);
            clearTimeout(messageTo.timer);

            if (messageFrom.data.error) {
                console.log(new Error(`${id}: ${messageFrom.data.error}`));
                messageTo.reject(messageFrom.data.error);
            } else {
                console.log(`(${id}) SUCCESS`);
                messageTo.resolve(messageFrom.data.response);
            }

            this.removeFromQueue(id);
        } else {
            // todo: I can't see a way this happens
            const error = `(${id}) PANIC! Received response to unrecognised message`;
            console.log(new Error(error));
        }

        this.busy = false;
        this.processQueue();
    }

    /**
     * Handles mediation errors. By Killing the worker and trying to restart it.
     * @param error The error
     * @private
     */
    private onError(error: ErrorEvent) {
        const err = `Error getting response from webworker\n${error.message}`;
        console.log(new Error(err));
        this.terminateWorker(true);
    }

    /**
     * Sends a message to the worker, returning a promise that will resolve when the work is complete
     * @param message The message object
     * @private
     */
    private sendMessage(message: IMessageParameters) : Promise<any> {
        const id = shortid();
        console.log(`(${id}) Adding message to queue: ${message.method} ${message?.args?.fileName}`);
        message.id = id;
        let promise = new Promise((resolve, reject) => {
            this.messages.push({
                id,
                message,
                resolve,
                reject,
                method: message.method,
            });
        });

        this.processQueue();
        return promise;
    }

    /**
     * Processes the current queue (recursive)
     * - If already processing it waits
     * - If the queue is empty it tears down the worker
     * - Otherwise it processes the next message
     * @private
     */
    private async processQueue() {
        if (this.busy) return;

        if(!this.messages.length) {
            console.log('Queue Empty');
            return this.terminateWorker();
        }

        this.busy = true;

        const message = this.messages[0];// Better than shift because it stays in the array for retries

        // @ts-ignore
        message.timer = this.createTimeout(message?.id);

        const worker = await this.getWorker();
        worker.postMessage(message.message);
        console.log(`(${message.id}) Sent message to worker: ${message.method} ${message?.message?.args?.fileName}`);
    }

    /**
     * Creates a timeout, after which we discard the worker and attempt to clean up.
     * @param id The message id
     * @private
     */
    private createTimeout(id: string) {
        const timeoutInMs = secondsAsMs(this.timeout);
        return setTimeout(() => this.onTimeout(id), timeoutInMs);
    }

    /**
     * If there's a timeout we should retry.
     * These file actions are expected in order so we can't just drop the message and hope.
     * @param id The id of the message
     * @private
     */
    private onTimeout(id: string) {
        const errorMessage = `(${id}) Timeout, FileWorker has not responded to message for ${this.timeout} seconds`;
        console.log(new Error(errorMessage));

        const message = this.getMessage(id);
        message.retries = message.retries ? message.retries + 1 : 1;

        if (message.retries > this.maxRetries) {
            this.tooManyRetries(id);
        }

        this.terminateWorker(true);
    }

    /**
     * If the worker has tried x amount of times then the best course of action is to heavy error out.
     *
     * todo: I don't think this will ever be hit in normal operation, but what should we do?
     * At a guess killing the message isn't a good idea, if the timeout is caused by error that's a problem.
     * Might be best to have a UI warning and a recovery method.
     *
     * @param id The message id
     * @private
     */
    private tooManyRetries(id: string) {
        const message = this.getMessage(id);
        let error = `(${id}) Fileworker reached max number of retries (${this.maxRetries}) whilst trying to process messae, removing from queue:`;
        error += `\nAttempting to ${message?.method} ${message?.message?.args?.fileName}`;
        if (message?.method === 'write') {
            const data = message?.message?.data;
            if (!data) error += `\nData was null`;
            else error += `\nData size ${Math.round(data.length / 1024)}KB`;
        }
        console.log(new Error(error));
    }

    /**
     * Removes a message from a queue by its id
     * @param id The id of the message
     * @private
     */
    private removeFromQueue(id: string) {
        const message = this.getMessage(id);
        removeFromArray(this.messages, message);
    }

    /**
     * Gets a message from this.messages by its message id
     * @param id The id of the message
     * @private
     */
    private getMessage(id: string): IFileDeferred {
        return this.messages.find((m) => m.id === id);
    }
}
