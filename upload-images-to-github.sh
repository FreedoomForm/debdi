#!/bin/bash

# Script to upload PNG files to GitHub repository
# Repository: https://github.com/FreedoomForm/hi

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/FreedoomForm/hi.git"
BRANCH="main"
IMAGES_DIR="IMAGES"
TEMP_CLONE_DIR="temp_github_clone"

echo "Starting GitHub upload process..."
echo "Repository: $REPO_URL"
echo "Branch: $BRANCH"
echo "Images directory: $IMAGES_DIR"

# Check if images directory exists
if [ ! -d "$IMAGES_DIR" ]; then
    echo "Error: Images directory '$IMAGES_DIR' not found!"
    exit 1
fi

# Count PNG files
PNG_COUNT=$(find "$IMAGES_DIR" -name "*.png" | wc -l)
echo "Found $PNG_COUNT PNG files in $IMAGES_DIR"

if [ "$PNG_COUNT" -ne 108 ]; then
    echo "Warning: Expected 108 PNG files, found $PNG_COUNT"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Upload cancelled."
        exit 1
    fi
fi

# Check if Git is available
if ! command -v git &> /dev/null; then
    echo "Error: Git is not installed or not in PATH"
    exit 1
fi

# Create temporary directory for cloning
if [ -d "$TEMP_CLONE_DIR" ]; then
    echo "Removing existing temporary directory..."
    rm -rf "$TEMP_CLONE_DIR"
fi

echo "Cloning repository..."
git clone "$REPO_URL" "$TEMP_CLONE_DIR"

cd "$TEMP_CLONE_DIR"

# Switch to main branch
git checkout "$BRANCH"

echo "Copying PNG files to repository..."
# Copy all PNG files from IMAGES directory
cp ../"$IMAGES_DIR"/*.png .

# Check if files were copied successfully
COPIED_COUNT=$(ls *.png 2>/dev/null | wc -l || echo 0)
echo "Successfully copied $COPIED_COUNT PNG files"

if [ "$COPIED_COUNT" -eq 0 ]; then
    echo "Error: No PNG files were copied!"
    cd ..
    rm -rf "$TEMP_CLONE_DIR"
    exit 1
fi

# Add all PNG files to git
git add *.png

# Check if there are any changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit (files may already exist in repository)"
else
    echo "Committing changes..."
    git commit -m "Upload $COPIED_COUNT PNG images (1.png to 108.png)"
    
    echo "Pushing changes to GitHub..."
    git push origin "$BRANCH"
    
    echo "✅ Successfully uploaded $COPIED_COUNT PNG files to GitHub!"
fi

# Clean up
cd ..
rm -rf "$TEMP_CLONE_DIR"

echo "Upload process completed!"
echo "Files uploaded to: $REPO_URL/tree/$BRANCH"