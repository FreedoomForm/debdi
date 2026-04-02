#!/usr/bin/env node

/**
 * Script to rename PNG files in the IMAGES folder sequentially
 * based on their actual creation timestamps
 */

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = './IMAGES';

// Function to get file creation time (birthtime)
function getFileCreationTime(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.birthtime;
    } catch (error) {
        console.error(`Error getting stats for ${filePath}:`, error.message);
        return new Date(0); // Return epoch date if error
    }
}

// Function to safely rename files with conflict handling
function safeRename(oldPath, newPath) {
    try {
        // Check if target file already exists
        if (fs.existsSync(newPath)) {
            console.warn(`⚠️  Target file ${newPath} already exists. Skipping rename.`);
            return false;
        }
        
        fs.renameSync(oldPath, newPath);
        return true;
    } catch (error) {
        console.error(`Error renaming ${oldPath} to ${newPath}:`, error.message);
        return false;
    }
}

// Main function
function main() {
    console.log('📁 Starting PNG file renaming process...\n');
    
    // Read all files in IMAGES directory
    let files;
    try {
        files = fs.readdirSync(IMAGES_DIR);
    } catch (error) {
        console.error(`Error reading directory ${IMAGES_DIR}:`, error.message);
        process.exit(1);
    }
    
    // Filter only PNG files
    const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));
    
    if (pngFiles.length === 0) {
        console.log('❌ No PNG files found in the IMAGES directory.');
        process.exit(0);
    }
    
    console.log(`📊 Found ${pngFiles.length} PNG files to process\n`);
    
    // Get file info with creation times
    const fileInfo = pngFiles.map(filename => {
        const filePath = path.join(IMAGES_DIR, filename);
        return {
            filename,
            filePath,
            creationTime: getFileCreationTime(filePath)
        };
    });
    
    // Sort files by creation time (earliest first)
    fileInfo.sort((a, b) => a.creationTime - b.creationTime);
    
    console.log('📅 Files sorted by creation time (earliest to latest):');
    fileInfo.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.filename} (${file.creationTime.toISOString()})`);
    });
    console.log();
    
    // Generate mapping and perform renaming
    const renameMapping = [];
    let successfulRenames = 0;
    
    console.log('🔄 Starting renaming process...\n');
    
    for (let i = 0; i < fileInfo.length; i++) {
        const oldFile = fileInfo[i];
        const newFilename = `${i + 1}.png`;
        const newFilePath = path.join(IMAGES_DIR, newFilename);
        
        console.log(`📝 Processing: ${oldFile.filename}`);
        console.log(`   → New name: ${newFilename}`);
        
        const success = safeRename(oldFile.filePath, newFilePath);
        
        if (success) {
            renameMapping.push({
                oldName: oldFile.filename,
                newName: newFilename,
                creationTime: oldFile.creationTime.toISOString()
            });
            successfulRenames++;
            console.log('   ✅ Renamed successfully\n');
        } else {
            console.log('    ❌ Failed to rename\n');
        }
    }
    
    // Output final summary
    console.log('='.repeat(60));
    console.log('📋 RENAMING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files processed: ${pngFiles.length}`);
    console.log(`Successfully renamed: ${successfulRenames}`);
    console.log(`Failed: ${pngFiles.length - successfulRenames}`);
    console.log();
    
    if (renameMapping.length > 0) {
        console.log('📊 File mapping (old name → new name):');
        console.log('-'.repeat(60));
        renameMapping.forEach(mapping => {
            console.log(`${mapping.oldName} → ${mapping.newName}`);
        });
    }
    
    console.log('\n✅ Renaming process completed!');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };