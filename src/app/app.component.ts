import { Component, OnInit } from "@angular/core";
import { DatabaseService } from './file/database.service';

@Component({
    selector: "ns-app",
    templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {
    constructor(
        private database: DatabaseService,
    ) {
        console.log('Constructed app');
    }

    async ngOnInit() {
        await this.database.init();

        console.log('Initialized app');
    }


}
