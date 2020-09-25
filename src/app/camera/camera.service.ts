import { Injectable } from '@angular/core';
import { requestPermissions } from '@nativescript/camera';


@Injectable({
    providedIn: 'root',
})
export class CameraService {
    constructor() {
    }

    async requestPerms() {
        try {
            console.log('Requesting camera permissions');
            const result = await requestPermissions();
            console.log('Request probably successful');
        } catch (error) {
            console.log('Request failed', error);
        }
    }
}
