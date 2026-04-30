# Debdi POS — Windows (Electron)

Native Windows desktop wrapper for the Debdi POS web app. Adds:
- USB / network thermal printer bridge (`node-thermal-printer`)
- Cash drawer kick over the printer (ESC/POS pulse)
- Serial-port enumeration for legacy POS hardware
- Offline-capable installer (NSIS) and portable single-exe builds

## Build locally

```bat
cd native\windows
npm install
npm run dist          :: NSIS installer + portable .exe under dist\
```

## CI (GitHub Actions)

`.github/workflows/build-native.yml` builds both NSIS installer
(`Debdi POS Setup x.y.z.exe`) and a portable single-file binary
(`Debdi POS x.y.z.exe`) on each push to `main`. Artifacts are uploaded
to the workflow run; tagged commits attach them to a GitHub Release.

## Auto-update

`electron-updater` is wired in but disabled by default. To enable, host the
build artifacts at a known URL (S3, GitHub Releases) and set
`electron-builder.yml` `publish` block.

## Configuration

| Env var          | Purpose                                       |
|------------------|-----------------------------------------------|
| `DEBDI_URL`      | URL to load (defaults to https://debdi.uz)    |
| `DEBDI_PRINTER`  | Default printer interface (e.g. tcp://1.2.3.4:9100) |

CLI flags: `--offline` to load the bundled static export instead of the
remote URL.
