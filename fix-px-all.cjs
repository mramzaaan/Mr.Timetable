const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
    let content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
    
    // Replace text-[XXpx], w-[XXpx], h-[XXpx], max-w-[XXpx], etc.
    content = content.replace(/([a-zA-Z0-9-]*?)\[([0-9.]+)px\]/g, (match, prefix, pxValue) => {
        const px = parseFloat(pxValue);
        const rem = px / 16;
        return `${prefix}[${rem}rem]`;
    });

    fs.writeFileSync(path.join(componentsDir, file), content, 'utf8');
});

console.log("Done components");
