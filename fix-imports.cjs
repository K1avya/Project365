const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      let content = fs.readFileSync(full, 'utf8');

      // Fix backtick-corrupted imports like from '`../../../../lib/auth'  -> from '../../../../lib/auth'
      const cleaned = content
        .replace(/from '`(\.\.?\/[^']*)'/g, "from '$1'")
        .replace(/from "`(\.\.?\/[^"]*)"/g, 'from "$1"');

      // Strip any remaining .js extensions on relative imports
      const updated = cleaned
        .replace(/from '(\.\.?\/[^']*?)\.js'/g, "from '$1'")
        .replace(/from "(\.\.?\/[^"]*?)\.js"/g, 'from "$1"');

      if (updated !== content) {
        fs.writeFileSync(full, updated, 'utf8');
        console.log('Fixed:', full);
      }
    }
  }
}

walk('src');
console.log('Done.');
