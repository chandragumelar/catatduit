#!/usr/bin/env node
// scripts/bump-sw-version.js
// Inject versi dari package.json ke CACHE_NAME di sw.js
// Dijalankan otomatis via `npm run build` sebelum deploy ke Vercel

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const pkgPath = path.join(ROOT, 'package.json');
const swPath = path.join(ROOT, 'sw.js');

const { version } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const cacheName = `catatduit-v${version}`;

let sw = fs.readFileSync(swPath, 'utf8');

// Replace baris CACHE_NAME — pattern fleksibel, tidak peduli nilai lama
sw = sw.replace(
  /^const CACHE_NAME = ['"`][^'"`]*['"`];.*$/m,
  `const CACHE_NAME = '${cacheName}'; // auto-generated — jangan edit manual`
);

fs.writeFileSync(swPath, sw, 'utf8');
console.log(`[bump-sw] CACHE_NAME → '${cacheName}'`);
