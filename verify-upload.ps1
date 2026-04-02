# PowerShell script to verify PNG files in GitHub repository

param(
    [string]$RepoOwner = "FreedoomForm",
    [string]$RepoName = "hi",
    [string]$Branch = "main"
)

Write-Host "Verifying PNG files in GitHub repository..." -ForegroundColor Green
Write-Host "Repository: $RepoOwner/$RepoName"
Write-Host "Branch: $Branch"

# Function to get repository contents using GitHub API
function Get-RepoContents {
    param([string]$Path = "")
    
    $apiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/contents/$Path?ref=$Branch"
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get
        return $response
    } catch {
        Write-Host "Error accessing repository: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "`nChecking repository contents..." -ForegroundColor Cyan
$contents = Get-RepoContents

if ($null -eq $contents) {
    Write-Host "Failed to access repository. It may be private or require authentication." -ForegroundColor Red
    Write-Host "Try accessing via web: https://github.com/$RepoOwner/$RepoName" -ForegroundColor Yellow
    exit 1
}

# Count PNG files
$pngFiles = $contents | Where-Object { $_.name -like "*.png" }
$pngCount = $pngFiles.Count

Write-Host "Found $pngCount PNG files in the repository" -ForegroundColor Green

if ($pngCount -gt 0) {
    Write-Host "`nPNG files found:" -ForegroundColor Cyan
    $pngFiles | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor White }
}

# Check expected files
$expectedCount = 108
Write-Host "`nExpected: $expectedCount PNG files (1.png to 108.png)" -ForegroundColor Yellow

if ($pngCount -eq $expectedCount) {
    Write-Host "✅ SUCCESS: All $expectedCount PNG files are present in the repository!" -ForegroundColor Green
} elseif ($pngCount -eq 0) {
    Write-Host "❌ No PNG files found in repository. Files need to be uploaded." -ForegroundColor Red
} else {
    Write-Host "⚠️  Partial upload: $pngCount out of $expectedCount PNG files found" -ForegroundColor Yellow
    
    # Check which files are missing
    $missingFiles = @()
    for ($i = 1; $i -le $expectedCount; $i++) {
        $expectedFile = "$i.png"
        if ($pngFiles.name -notcontains $expectedFile) {
            $missingFiles += $expectedFile
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Host "Missing files ($($missingFiles.Count)):" -ForegroundColor Red
        $missingFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    }
}

# Provide direct links
Write-Host "`nRepository URL: https://github.com/$RepoOwner/$RepoName" -ForegroundColor Cyan
Write-Host "Direct file access: https://github.com/$RepoOwner/$RepoName/tree/$Branch" -ForegroundColor Cyan

if ($pngCount -gt 0) {
    Write-Host "`nSample file URLs:" -ForegroundColor Cyan
    Write-Host "1.png: https://github.com/$RepoOwner/$RepoName/raw/$Branch/1.png" -ForegroundColor White
    Write-Host "108.png: https://github.com/$RepoOwner/$RepoName/raw/$Branch/108.png" -ForegroundColor White
}