import fs from 'node:fs';
const path='index.html';
let h=fs.readFileSync(path,'utf8');

// Keep the hero section in the source but hide it from the UI.
h=h.replace(/\/\* OVERVIEW HIDE V1 START \*\/[\s\S]*?\/\* OVERVIEW HIDE V1 END \*\//,'');
const css='/* OVERVIEW HIDE V1 START */\n.hero#overview{display:none!important}\n/* OVERVIEW HIDE V1 END */\n';
const styleEnd=h.indexOf('</style>');
if(styleEnd<0)throw new Error('style end not found');
h=h.slice(0,styleEnd)+css+h.slice(styleEnd);

// Remove the sidebar footer card completely.
const before=h;
h=h.replace(/<div class="side-foot"><strong>两条备考线，<br>一张时间表。<\/strong><p>9月主攻考公；10月开始三高；国考后转向考博。每个完成项都留下记录。<\/p><\/div>/,'');
if(h===before && h.includes('两条备考线，'))throw new Error('side footer block not removed');

fs.writeFileSync(path,h);
console.log('Overview hidden and sidebar footer removed.');
