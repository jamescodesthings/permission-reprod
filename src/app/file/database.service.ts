import { Injectable } from "@angular/core";

// Resources
import { FileService } from "./file.service";

@Injectable({
    providedIn: 'root',
})
export class DatabaseService {
    private _dbs = {};
    private initialized: boolean = false;

    constructor(
        private _fileService: FileService
    ) {
        console.log('constructed database service')
    }

    private getDb(databaseName) {
        this._dbs[databaseName] = this._dbs[databaseName] || {
            nextId: 0,
            items: {}
        };
        return this._dbs[databaseName];
    }

    private printSize() {
        let serialized = JSON.stringify(this._dbs);
        console.log(`Database is ${Math.round(serialized.length / 1024)} kilobytes`);
    }

    async init() {
        if (this.initialized) {
            console.log('Database has already been initialized');
            return;
        }

        try {
            // todo: this is awaiting the file worker's response, and the first thing the app does.
            // Seems like a performance drag
            this._dbs = await this._fileService.readFile('database');
        } catch (error) {
            console.log('Received error from file read');
            // This is probably a file-not-found, which is fine as long as this is
            // the first run of the app.
            this._dbs = {};
            this.write();
        }

        this.initialized = true;
    }

    private write() {
        const serialized = JSON.stringify(this._dbs);
        return this._fileService.writeFile('database', serialized);
    }

    getAll(databaseName: string): Promise<Array<any>> {
        let items = this.getDb(databaseName).items;
        let list = [];
        for (let key in items) {
            list.push(items[key]);
        }
        return Promise.resolve(list);
    }

    get(databaseName: string, documentId: string) {
        return Promise.resolve(this.getDb(databaseName).items[documentId]);
    }

    async find(databaseName: string, predicate: (value: any, index: number, obj: any[]) => boolean) {
        const all = await this.getAll(databaseName);

        return all.find(predicate);
    }

    add(databaseName: string, entity: any) {
        console.log('Adding to db', entity);
        let db = this.getDb(databaseName);
        let id = db.nextId++;
        db.items[id] = entity;
        entity._id = "" + id;
        this.write();
        return Promise.resolve(entity);
    }

    update(databaseName: string, documentId: string, entity: {}) {
        let db = this.getDb(databaseName);
        db.items[documentId] = entity;
        this.write();
        return Promise.resolve(entity);
    }

    delete(databaseName: string, documentId: string) {
        let db = this.getDb(databaseName);
        delete db.items[documentId];
        this.write();
        return Promise.resolve();
    }

    async deleteAll(databaseName: string) {
        this._dbs[databaseName] = {
            nextId: 0,
            items: {}
        };
        return this.write();
    }

    clearCache() {
        this._dbs = {};
        this.write();
    }
}
