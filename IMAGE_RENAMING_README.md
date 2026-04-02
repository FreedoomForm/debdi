# PNG File Renaming Scripts

This directory contains scripts to rename PNG files in the IMAGES folder sequentially based on their actual creation timestamps.

## Available Scripts

### 1. Node.js Script (`rename-images.js`)
- **Platform**: Cross-platform (Windows, macOS, Linux)
- **Requirements**: Node.js installed
- **Features**: 
  - Uses filesystem metadata to get actual creation timestamps
  - Sorts files chronologically (earliest to latest)
  - Renames files sequentially: 1.png, 2.png, 3.png, etc.
  - Handles file conflicts safely
  - Provides detailed logging and mapping output

### 2. PowerShell Script (`rename-images.ps1`)
- **Platform**: Windows only
- **Requirements**: PowerShell 5.1 or later
- **Features**:
  - Same functionality as Node.js version
  - Includes dry-run mode for testing
  - Better Windows filesystem metadata handling
  - Color-coded output

## Usage Instructions

### Using the Node.js Script

1. **Run the script**:
   ```bash
   node rename-images.js
   ```

2. **Expected output**:
   - Shows files sorted by creation time
   - Processes each file with status updates
   - Provides final summary with mapping

### Using the PowerShell Script

1. **First, set execution policy** (if needed):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Dry run (recommended first)**:
   ```powershell
   .\rename-images.ps1 -DryRun
   ```

3. **Actual renaming**:
   ```powershell
   .\rename-images.ps1
   ```

## What the Scripts Do

1. **Read IMAGES directory** - Scan for all PNG files
2. **Get creation timestamps** - Use filesystem metadata to get actual file creation times
3. **Sort chronologically** - Order files from earliest to latest creation time
4. **Sequential renaming** - Rename files to 1.png, 2.png, 3.png, etc.
5. **Conflict handling** - Skip files if target name already exists
6. **Mapping output** - Display old name → new name mapping

## Features

### ✅ Robust Error Handling
- Skips files that can't be accessed
- Handles file conflicts gracefully
- Continues processing even if individual files fail

### ✅ Detailed Logging
- Shows sorting order before renaming
- Real-time progress updates
- Final summary with success/failure counts

### ✅ Safety Features
- No data loss (original files are preserved until successful rename)
- Conflict detection and avoidance
- Clear status messages

## Example Output

```
📁 Starting PNG file renaming process...

📊 Found 85 PNG files to process

📅 Files sorted by creation time (earliest to latest):
  1. Generated Image December 08, 2025 - 2_54PM.png (2025-12-08 14:54:00)
  2. Generated Image December 08, 2025 - 2_57PM.png (2025-12-08 14:57:00)
  ...

🔄 Starting renaming process...

📝 Processing: Generated Image December 08, 2025 - 2_54PM.png
   → New name: 1.png
   ✅ Renamed successfully

📝 Processing: Generated Image December 08, 2025 - 2_57PM.png
   → New name: 2.png
   ✅ Renamed successfully

============================
📋 RENAMING SUMMARY
============================
Total files processed: 85
Successfully renamed: 85
Failed: 0

📊 File mapping (old name → new name):
Generated Image December 08, 2025 - 2_54PM.png → 1.png
Generated Image December 08, 2025 - 2_57PM.png → 2.png
...

✅ Renaming process completed!
```

## Recommendations

1. **Use PowerShell version on Windows** - Better filesystem metadata handling
2. **Run dry-run first** - Always test with dry-run mode to see what will happen
3. **Backup important files** - Although safe, always have backups for critical data

## Troubleshooting

### Node.js Script Issues
- Ensure Node.js is installed: `node --version`
- Check file permissions in IMAGES folder

### PowerShell Script Issues
- Execution policy error: Run as Administrator and set policy
- File access errors: Check if files are not locked by other programs

### General Issues
- If script fails, files remain in their original state
- Check console output for specific error messages
- Ensure IMAGES folder exists and contains PNG files

## Files Created

- [`rename-images.js`](rename-images.js:1) - Node.js version (cross-platform)
- [`rename-images.ps1`](rename-images.ps1:1) - PowerShell version (Windows optimized)
- [`IMAGE_RENAMING_README.md`](IMAGE_RENAMING_README.md:1) - This documentation file

Both scripts accomplish the same task with platform-appropriate implementations.