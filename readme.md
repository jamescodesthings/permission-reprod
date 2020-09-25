# Permission issue reproduction
When using a worker, and any permissions request we're getting `EXC_BAD_ACCESS` after a successful permission request on ios.

This is not limited to the camera module.
Have also tested with Location, Notifications and the new "wants access to your local network".

## Running the reproduction
```shell script
npm i -g nativescript@rc --unsafe-perm
npm i && ns platform add ios && ns prepare ios
npm run ns:run:ios:sim
```

Or just prepare and run for an ios simulator of your choice.

## Triggering the issue
1. Hit the first button, you'll see the worker terminate reported in the console
2. Hit the second button
3. Accept both permissions

After returning to the app it crashes.
Have tested adding App Resume and resume fires before the crash.

## Environment Details
```
NS Info
✔ Getting NativeScript components versions information...
⚠ Update available for component nativescript. Your current version is 7.0.9-rc.1 and the latest available version is 7.0.8.
✔ Component @nativescript/core has 7.0.5 version and is up to date.
✔ Component @nativescript/ios has 7.0.0 version and is up to date.

Testing on simulator and device on ios 13 and 14. Device spec is iPhone 11 Pro Max and SE (2nd). Reproduces on both.
```
