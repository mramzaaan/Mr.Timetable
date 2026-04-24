const fs = require('fs');
const path = require('path');

const files = [
    'components/AlternativeTimetablePage.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    
    // Replace text-[XXpx], w-[XXpx], h-[XXpx], max-w-[XXpx], etc.
    content = content.replace(/([a-zA-Z0-9-]*?)\[([0-9.]+)px\]/g, (match, prefix, pxValue) => {
        const px = parseFloat(pxValue);
        const rem = px / 16;
        return `${prefix}[${rem}rem]`;
    });

    fs.writeFileSync(path.join(__dirname, file), content, 'utf8');
});

console.log("Done");
