# Debdi POS — Android (Capacitor)

A thin native wrapper around the deployed Debdi POS web app.
Adds capabilities a PWA can't reach: Bluetooth thermal printers, native
barcode scanner, USB device access, native share, deep deep linking,
and offline SQLite cache.

## Local build

```sh
cd native/android
npm install
npm run init
npm run add-android
npm run sync
npm run open-android   # opens Android Studio for signing/release
```

## CI build (GitHub Actions)

`.github/workflows/build-native.yml` builds an unsigned APK for every push
to `main`. Signed release APK + AAB requires `KEYSTORE_BASE64`,
`KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD` secrets.

Built artifacts are uploaded to the workflow run and (on tagged commits)
attached to a GitHub Release.

## Hardware integrations

| Capability        | Plugin                                     |
|-------------------|--------------------------------------------|
| Bluetooth printer | `@capacitor-community/bluetooth-le`        |
| USB printer       | Native bridge (Android USB Host API)       |
| Camera barcode    | `@capacitor/barcode-scanner`               |
| Card reader       | Stripe / Square SDK (configurable)         |
| Offline cache     | `@capacitor-community/sqlite`              |
| Cash drawer kick  | `@capacitor/printer` (ESC/POS via BT/USB)  |

## Config

The wrapper points at the live `https://debdi.uz` deployment by default
(see `capacitor.config.json`). For an offline-first build that ships the
static export inside the APK, run:

```sh
cd ../..
yarn build && yarn next export
cp -R out native/android/out
cd native/android && npm run sync
```

Then edit `capacitor.config.json` to remove the `server.url` block.
