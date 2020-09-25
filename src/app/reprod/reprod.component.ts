import { Component, OnInit } from "@angular/core";
import { CameraService } from '../camera/camera.service';
import { DatabaseService } from '../file/database.service';

@Component({
    selector: "ns-reprod",
    templateUrl: "./reprod.component.html"
})
export class ReprodComponent {

    constructor(
        private camera: CameraService,
        private database: DatabaseService,
    ) { }

    onRequestPermissions() {
        this.camera.requestPerms();
    }

    async onUseDb() {
        try {
            console.log('Writing to object store');
            await this.database.add('somekey', {
                test: 'test adding some stuff',
            });

            console.log('Written');
            const fromDb = await this.database.getAll('somekey');
            console.log('Got back from object store:', fromDb);
        } catch (error) {
            console.log('error whilst messing with worker', error);
        }
    }
}
