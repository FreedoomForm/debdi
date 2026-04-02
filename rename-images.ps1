<#
.SYNOPSIS
    Script to rename PNG files in the IMAGES folder sequentially based on their creation timestamps

.DESCRIPTION
    This script:
    - Gets actual file creation timestamps for all PNG files in the IMAGES folder
    - Sorts files chronologically based on creation timestamps (earliest to latest)
    - Renames files sequentially as: 1.png, 2.png, 3.png, etc.
    - Preserves the original file extensions
    - Handles file conflicts appropriately
    - Outputs the mapping of old names to new names

.PARAMETER DryRun
    If specified, shows what would be renamed without actually performing the operations

.EXAMPLE
    .\rename-images.ps1
    Renames all PNG files in the IMAGES folder

.EXAMPLE
    .\rename-images.ps1 -DryRun
    Shows what would be renamed without making changes
#>

param(
    [switch]$DryRun
)

$ImagesDir = "IMAGES"
$ScriptStartTime = Get-Date

Write-Host "📁 Starting PNG file renaming process..." -ForegroundColor Cyan
Write-Host ""

# Check if IMAGES directory exists
if (-not (Test-Path $ImagesDir)) {
    Write-Host "❌ ERROR: IMAGES directory not found at '$ImagesDir'" -ForegroundColor Red
    exit 1
}

# Get all PNG files
$PngFiles = Get-ChildItem -Path $ImagesDir -Filter "*.png" -File

if ($PngFiles.Count -eq 0) {
    Write-Host "❌ No PNG files found in the IMAGES directory." -ForegroundColor Yellow
    exit 0
}

Write-Host "📊 Found $($PngFiles.Count) PNG files to process" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE: No files will be actually renamed" -ForegroundColor Yellow
    Write-Host ""
}

# Sort files by creation time (earliest first)
$SortedFiles = $PngFiles | Sort-Object CreationTime

Write-Host "📅 Files sorted by creation time (earliest to latest):" -ForegroundColor Cyan
$SortedFiles | ForEach-Object { 
    $Index = $SortedFiles.IndexOf($_) + 1
    Write-Host "  $Index. $($_.Name) ($($_.CreationTime.ToString('yyyy-MM-dd HH:mm:ss')))"
}
Write-Host ""

# Generate mapping and perform renaming
$RenameMapping = @()
$SuccessfulRenames = 0
$FailedRenames = 0

Write-Host "🔄 Starting renaming process..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $SortedFiles.Count; $i++) {
    $OldFile = $SortedFiles[$i]
    $NewFilename = "$($i + 1).png"
    $NewFilePath = Join-Path $ImagesDir $NewFilename
    
    Write-Host "📝 Processing: $($OldFile.Name)" -ForegroundColor White
    Write-Host "   → New name: $NewFilename" -ForegroundColor Gray
    
    # Check if target file already exists
    if (Test-Path $NewFilePath) {
        Write-Host "   ️  WARNING: Target file $NewFilename already exists. Skipping rename." -ForegroundColor Yellow
        $FailedRenames++
        continue
    }
    
    if ($DryRun) {
        Write-Host "   ✅ Would rename (dry run)" -ForegroundColor Green
        $RenameMapping += [PSCustomObject]@{
            OldName = $OldFile.Name
            NewName = $NewFilename
            CreationTime = $OldFile.CreationTime
            Status = "Dry Run"
        }
    } else {
        try {
            Rename-Item -Path $OldFile.FullName -NewName $NewFilename -ErrorAction Stop
            Write-Host "   ✅ Renamed successfully" -ForegroundColor Green
            $RenameMapping += [PSCustomObject]@{
                OldName = $OldFile.Name
                NewName = $NewFilename
                CreationTime = $OldFile.CreationTime
                Status = "Success"
            }
            $SuccessfulRenames++
        } catch {
            Write-Host "   ❌ Failed to rename: $($_.Exception.Message)" -ForegroundColor Red
            $FailedRenames++
        }
    }
    Write-Host ""
}

# Output final summary
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📋 RENAMING SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🔍 DRY RUN COMPLETED - No files were actually renamed" -ForegroundColor Yellow
} else {
    Write-Host "Total files processed: $($SortedFiles.Count)" -ForegroundColor White
    Write-Host "Successfully renamed: $SuccessfulRenames" -ForegroundColor Green
    Write-Host "Failed: $FailedRenames" -ForegroundColor Red
}

Write-Host ""

if ($RenameMapping.Count -gt 0) {
    Write-Host "📊 File mapping (old name → new name):" -ForegroundColor Cyan
    Write-Host "-" * 60 -ForegroundColor Cyan
    $RenameMapping | ForEach-Object {
        if ($_.Status -eq "Success" -or $DryRun) {
            Write-Host "$($_.OldName) → $($_.NewName)" -ForegroundColor White
        }
    }
}

$ScriptEndTime = Get-Date
$Duration = $ScriptEndTime - $ScriptStartTime

Write-Host ""
if ($DryRun) {
    Write-Host "✅ Dry run completed in $($Duration.TotalSeconds.ToString('0.00')) seconds" -ForegroundColor Yellow
} else {
    Write-Host "✅ Renaming process completed in $($Duration.TotalSeconds.ToString('0.00')) seconds!" -ForegroundColor Green
}

# Usage instructions
Write-Host ""
Write-Host "💡 Usage tips:" -ForegroundColor Cyan
Write-Host "  - Run without parameters to perform actual renaming" -ForegroundColor Gray
Write-Host "  - Use -DryRun parameter to see what would be renamed" -ForegroundColor Gray
Write-Host "  - PowerShell execution policy may need to be set: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Gray