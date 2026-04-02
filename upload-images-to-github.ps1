# PowerShell script to upload PNG files to GitHub repository
# Repository: https://github.com/FreedoomForm/hi

param(
    [string]$RepoUrl = "https://github.com/FreedoomForm/hi.git",
    [string]$Branch = "main",
    [string]$ImagesDir = "IMAGES",
    [string]$TempCloneDir = "temp_github_clone"
)

Write-Host "Starting GitHub upload process..." -ForegroundColor Green
Write-Host "Repository: $RepoUrl"
Write-Host "Branch: $Branch"
Write-Host "Images directory: $ImagesDir"

# Check if images directory exists
if (-not (Test-Path $ImagesDir -PathType Container)) {
    Write-Host "Error: Images directory '$ImagesDir' not found!" -ForegroundColor Red
    exit 1
}

# Count PNG files
$pngFiles = Get-ChildItem -Path $ImagesDir -Filter "*.png"
$pngCount = $pngFiles.Count
Write-Host "Found $pngCount PNG files in $ImagesDir"

if ($pngCount -ne 108) {
    Write-Host "Warning: Expected 108 PNG files, found $pngCount" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -notmatch '^[Yy]') {
        Write-Host "Upload cancelled." -ForegroundColor Yellow
        exit 1
    }
}

# Check if Git is available
try {
    $null = Get-Command git -ErrorAction Stop
} catch {
    Write-Host "Error: Git is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Create temporary directory for cloning
if (Test-Path $TempCloneDir) {
    Write-Host "Removing existing temporary directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $TempCloneDir
}

Write-Host "Cloning repository..." -ForegroundColor Green
git clone $RepoUrl $TempCloneDir

Set-Location $TempCloneDir

# Switch to main branch
git checkout $Branch

Write-Host "Copying PNG files to repository..." -ForegroundColor Green
# Copy all PNG files from IMAGES directory
Copy-Item "..\$ImagesDir\*.png" .

# Check if files were copied successfully
$copiedFiles = Get-ChildItem -Filter "*.png"
$copiedCount = $copiedFiles.Count
Write-Host "Successfully copied $copiedCount PNG files"

if ($copiedCount -eq 0) {
    Write-Host "Error: No PNG files were copied!" -ForegroundColor Red
    Set-Location ..
    Remove-Item -Recurse -Force $TempCloneDir
    exit 1
}

# Add all PNG files to git
git add *.png

# Check if there are any changes to commit
$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host "No changes to commit (files may already exist in repository)" -ForegroundColor Yellow
} else {
    Write-Host "Committing changes..." -ForegroundColor Green
    git commit -m "Upload $copiedCount PNG images (1.png to 108.png)"
    
    Write-Host "Pushing changes to GitHub..." -ForegroundColor Green
    git push origin $Branch
    
    Write-Host "✅ Successfully uploaded $copiedCount PNG files to GitHub!" -ForegroundColor Green
}

# Clean up
Set-Location ..
Remove-Item -Recurse -Force $TempCloneDir

Write-Host "Upload process completed!" -ForegroundColor Green
Write-Host "Files uploaded to: $RepoUrl/tree/$Branch" -ForegroundColor Cyan