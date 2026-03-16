const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Remove non-pixel-art rules
css = css.replace(/border-radius:\s*[^;]+;/g, '');
css = css.replace(/backdrop-filter:\s*[^;]+;/g, '');
css = css.replace(/box-shadow:\s*[^;]+;/g, '');
// For pixel art, we want crisp transitions or none. I'll remove transitions to make it snappier.
css = css.replace(/transition:\s*[^;]+;/g, '');

// 2. We'll replace the :root and body section manually via standard replace_file_content tool, 
// so we don't mess it up here.

fs.writeFileSync(cssPath, css);
console.log('Cleaned CSS of radiuses, blur, and shadows');
