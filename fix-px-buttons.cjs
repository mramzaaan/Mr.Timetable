const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Simple button rounding replacement
            // Let's replace button rounded-md with rounded-[1.25rem] (if it's not already)
            // But doing this with regex safely across all elements might be hard...
            
            // Let's change other square corners to One UI soft corners
            const roundedRegex = /rounded-lg/g;
            if (roundedRegex.test(content)) {
                content = content.replace(roundedRegex, 'rounded-[1.25rem]');
                modified = true;
            }
            
            const roundedMdRegex = /rounded-md/g;
            if (roundedMdRegex.test(content)) {
                content = content.replace(roundedMdRegex, 'rounded-[1rem]');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir('./components');
