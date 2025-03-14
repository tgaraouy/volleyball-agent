const fs = require('fs-extra');
const path = require('path');

async function setupModel() {
    const sourceDir = path.join(__dirname, '../model/volleyball_pose_model/web_model');
    const targetDir = path.join(__dirname, '../client/public/volleyball_pose_model');

    try {
        // Ensure target directory exists
        await fs.ensureDir(targetDir);

        // Copy model files
        await fs.copy(sourceDir, targetDir);
        console.log('Model files copied successfully to public directory');
    } catch (error) {
        console.error('Error copying model files:', error);
        process.exit(1);
    }
}

setupModel(); 