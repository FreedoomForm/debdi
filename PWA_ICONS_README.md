# PWA Icon Requirements

This document explains how to generate the required PWA icons for AutoFood.

## Required Icon Sizes

The following icon sizes are needed for full PWA support:

- **icon-72.png** - 72x72 (Android small)
- **icon-96.png** - 96x96 (Android medium)
- **icon-128.png** - 128x128 (Web)
- **icon-144.png** - 144x144 (Android)
- **icon-152.png** - 152x152 (iOS)
- **icon-192.png** - 192x192 (Android, Chrome) **REQUIRED**
- **icon-384.png** - 384x384 (Large devices)
- **icon-512.png** - 512x512 (Splash screen) **REQUIRED**

## How to Generate Icons

### Option 1: Online Tools
1. Go to [realfavicongenerator.net](https://realfavicongenerator.net)
2. Upload the `icon.svg` from the `public` folder
3. Download all generated icons
4. Place PNG files in the `public` folder

### Option 2: Using Sharp (Node.js)
```bash
npm install sharp --save-dev
```

Then run the script below:

```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('public/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
});
```

### Option 3: Using Inkscape (CLI)
```bash
# For each size
inkscape public/icon.svg --export-type=png --export-filename=public/icon-192.png -w 192 -h 192
inkscape public/icon.svg --export-type=png --export-filename=public/icon-512.png -w 512 -h 512
```

## Temporary Solution

For now, you can create a simple placeholder by:
1. Opening `icon.svg` in a browser
2. Taking a screenshot
3. Resizing to required dimensions

## Files Updated

The following files have been updated to reference these icons:
- `public/manifest.json` - PWA manifest with all icon references
- `src/app/layout.tsx` - Apple touch icons and meta tags

After generating the icons, your PWA will be fully installable on:
- Android devices (via Chrome)
- iOS devices (via Safari "Add to Home Screen")
- Desktop (via Chrome/Edge)
