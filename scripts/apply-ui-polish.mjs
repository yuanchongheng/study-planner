import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261004-0140';

const scriptRe = /<script\s+src=["']\.\/notion-sync-v2\.js(?:\?v=[^"']*)?["']\s*><\/script>/;
if (!scriptRe.test(h)) {
  throw new Error('Missing notion-sync-v2.js script tag in index.html');
}
h = h.replace(scriptRe, `<script src="./notion-sync-v2.js?v=${version}"></script>`);

if (h === before) {
  console.log('index.html already uses the current planner version.');
} else {
  fs.writeFileSync(path, h);
  console.log(`Updated index.html planner script to v=${version}.`);
}
