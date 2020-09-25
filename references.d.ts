/// <reference path="./node_modules/@nativescript/core/global-types.d.ts" />
/// <reference path="./node_modules/@nativescript/types/index.d.ts" />

// typings/custom.d.ts
declare module "nativescript-worker-loader!*" {
    const content: any;
    export = content;
}
