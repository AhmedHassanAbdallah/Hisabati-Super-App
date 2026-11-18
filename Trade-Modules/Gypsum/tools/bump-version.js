#!/usr/bin/env node
/*
 * تغيير رقم الإصدار في كل الأماكن مرة واحدة
 * الاستخدام: node tools/bump-version.js 1.0.1 "ملاحظة 1" "ملاحظة 2"
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const [ver, ...notes] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(ver || '')) { console.error('اكتب رقم إصدار زي 1.0.1'); process.exit(1); }
const rep = (f, re, s) => { const p = path.join(root, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(re, s)); };
rep('js/app.js', /const APP_VERSION = '[^']*'/, `const APP_VERSION = '${ver}'`);
rep('service-worker.js', /const SW_VERSION = "[^"]*"/, `const SW_VERSION = "${ver}"`);
const vj = path.join(root, 'version.json');
const d = JSON.parse(fs.readFileSync(vj, 'utf8'));
d.version = ver; d.date = new Date().toISOString().slice(0, 10);
if (notes.length) d.notes = notes;
fs.writeFileSync(vj, JSON.stringify(d, null, 2) + '\n');
console.log('✔ الإصدار الآن ' + ver);
