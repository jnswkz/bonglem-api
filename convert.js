const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp before proceeding...');
  execSync('npm install sharp --no-save', { stdio: 'inherit' });
}

const sharp = require('sharp');
const picDir = path.join(__dirname, 'pic');

async function processDir(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            await processDir(fullPath);
        } else if (/\.(png|jpe?g|heic)$/i.test(file)) {
            const ext = path.extname(file);
            const webpPath = fullPath.replace(new RegExp(`${ext}$`, 'i'), '.webp');
            console.log(`Converting ${fullPath} to ${webpPath}`);
            try {
                await sharp(fullPath).webp({ quality: 80 }).toFile(webpPath);
                fs.unlinkSync(fullPath);
                console.log(`Successfully converted and removed original: ${file}`);
            } catch (err) {
                console.error(`Error converting ${file}:`, err);
            }
        }
    }
}

processDir(picDir).then(() => {
    console.log('\nAll complete!');
}).catch(console.error);
