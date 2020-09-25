import { NgModule } from "@angular/core";
import { Routes } from "@angular/router";
import { NativeScriptRouterModule } from "@nativescript/angular";

import { ReprodComponent } from "./reprod/reprod.component";

const routes: Routes = [
    { path: "", redirectTo: "/reprod", pathMatch: "full" },
    { path: "reprod", component: ReprodComponent },
];

@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes)],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule { }
