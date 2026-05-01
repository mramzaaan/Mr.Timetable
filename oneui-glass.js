const fs = require("fs");
const path = require("path");
function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith(".tsx")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let modified = false;
      const bgRegex = /bg-\[var\(--bg-secondary\)\]/g;
      if (bgRegex.test(content)) {
        content = content.replace(bgRegex, "bg-white/60 dark:bg-black/20 backdrop-blur-[30px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/10");
        modified = true;
      }
      if (modified) {
        content = content.replace(/border border-\[var\(--border-(primary|secondary)\)\]/g, "");
        content = content.replace(/shadow-(sm|md|lg|xl|2xl)/g, "");
      }
      const roundedRegex = /rounded-(xl|2xl|3xl)/g;
      if (roundedRegex.test(content)) {
        content = content.replace(roundedRegex, "rounded-[2rem]");
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}
processDir("./components");
