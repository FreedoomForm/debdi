# GitHub Upload Setup Guide

This guide will help you set up authentication for uploading the 108 PNG files to the GitHub repository.

## Repository Information
- **Repository URL**: https://github.com/FreedoomForm/hi
- **Branch**: main
- **Files to upload**: 108 PNG files (1.png to 108.png) from the IMAGES folder

## Authentication Options

### Option 1: Personal Access Token (Recommended)

1. **Create a Personal Access Token**:
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with the following permissions:
     - `repo` (full control of private repositories)
     - `workflow` (if needed for CI/CD)
   - Copy the token immediately (you won't see it again)

2. **Set up authentication**:
   - The upload scripts will prompt for credentials when needed
   - Alternatively, set up Git credentials permanently:

   ```bash
   git config --global user.name "Your GitHub Username"
   git config --global user.email "your.email@example.com"
   git config --global credential.helper store
   ```

### Option 2: SSH Key Authentication

1. **Generate SSH key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. **Add SSH key to GitHub**:
   - Copy the public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub.com → Settings → SSH and GPG keys → New SSH key
   - Paste your public key

3. **Update repository URL in scripts**:
   Change `https://github.com/FreedoomForm/hi.git` to `git@github.com:FreedoomForm/hi.git`

## Upload Scripts Available

### For Windows (PowerShell):
```powershell
.\upload-images-to-github.ps1
```

### For Linux/macOS (Bash):
```bash
chmod +x upload-images-to-github.sh
./upload-images-to-github.sh
```

## Manual Upload Alternative

If automated scripts don't work, you can manually upload via GitHub web interface:

1. Go to https://github.com/FreedoomForm/hi
2. Click "Add file" → "Upload files"
3. Drag and drop all 108 PNG files from the IMAGES folder
4. Add commit message: "Upload 108 PNG images (1.png to 108.png)"
5. Commit directly to the main branch

## Verification

After upload, verify files are available at:
https://github.com/FreedoomForm/hi/tree/main

## Troubleshooting

### Common Issues:

1. **Authentication failed**:
   - Ensure your token has proper permissions
   - Check if the repository is public/private and you have access

2. **Repository not found**:
   - Verify the repository URL is correct
   - Check if you have access to the repository

3. **Files already exist**:
   - The script will detect existing files and skip upload
   - If you want to overwrite, delete existing files first

### Need Help?
- Check GitHub documentation: https://docs.github.com/en/authentication
- Verify repository accessibility: https://github.com/FreedoomForm/hi