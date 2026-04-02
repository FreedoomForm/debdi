# Batch Upload Guide for GitHub (99-file limit workaround)

GitHub limits web uploads to 99 files per batch. Since we have 108 files, we need to upload in two batches.

## Batch Upload Strategy

### Batch 1: Files 1-99 (99 files)
- Upload files: `1.png` through `99.png`
- Total: 99 files

### Batch 2: Files 100-108 (9 files)  
- Upload files: `100.png` through `108.png`
- Total: 9 files

## Step-by-Step Upload Instructions

### Upload Batch 1 (Files 1-99)
1. Go to https://github.com/FreedoomForm/hi
2. Click "Add file" → "Upload files"
3. Select files `1.png` through `99.png` from the IMAGES folder
4. Commit message: "Upload PNG images 1-99"
5. Select "Commit directly to the main branch"
6. Click "Commit changes"

### Upload Batch 2 (Files 100-108)
1. After Batch 1 completes, refresh the repository page
2. Click "Add file" → "Upload files" again
3. Select files `100.png` through `108.png` from the IMAGES folder
4. Commit message: "Upload PNG images 100-108"
5. Select "Commit directly to the main branch"
6. Click "Commit changes"

## Alternative: Automated Batch Script

I've also created an automated PowerShell script that handles the batching:

```powershell
# Run the batch upload script
powershell -ExecutionPolicy Bypass -File upload-images-batches.ps1
```

## File Selection Tips

### For Batch 1 (1-99):
- Click on `1.png`
- Hold `Shift` key
- Click on `99.png`
- All 99 files will be selected

### For Batch 2 (100-108):
- Click on `100.png`
- Hold `Shift` key  
- Click on `108.png`
- All 9 files will be selected

## Verification After Upload

Check that all 108 files are present:
- Repository: https://github.com/FreedoomForm/hi/tree/main
- Should show files `1.png` through `108.png`
- Test individual URLs:
  - https://github.com/FreedoomForm/hi/raw/main/1.png
  - https://github.com/FreedoomForm/hi/raw/main/99.png
  - https://github.com/FreedoomForm/hi/raw/main/100.png
  - https://github.com/FreedoomForm/hi/raw/main/108.png

## Troubleshooting

### If upload fails:
- Try smaller batches (e.g., 50 files at a time)
- Clear browser cache
- Use incognito/private browsing mode
- Try different browser

### File count verification:
- Batch 1 should add 99 files
- Batch 2 should add 9 files  
- Total after both batches: 108 files

This approach successfully works around GitHub's 99-file upload limitation.