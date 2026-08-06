#!/usr/bin/env node
/**
 * vendor-deps.js - Copy required files from node_modules to webroot/js/
 *
 * This script replaces the old practice of vendoring JS libraries directly
 * in the repository (flot, javascriptrrd, jsqrencode). Now dependencies are
 * managed by npm (package.json) and this script copies the needed dist files
 * into the webroot.
 *
 * Usage: node scripts/vendor-deps.js
 * Run after `npm install` to populate webroot/js/ with vendor libraries.
 */

const fs = require('fs');
const path = require('path');

const webrootJs = path.resolve(__dirname, '..', 'src', 'usr', 'share', 'rpimonitor', 'web', 'js');

const copies = [
  // Chart.js
  {
    src: 'node_modules/chart.js/dist/chart.umd.js',
    dest: 'chart.umd.min.js',
  },
  // Chart.js date-fns adapter
  {
    src: 'node_modules/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.kurkle.js',
    dest: 'chartjs-adapter-date-fns.bundle.kurkle.min.js',
  },
  // QRCode.js
  {
    src: 'node_modules/qrcodejs/qrcode.min.js',
    dest: 'qrcode.min.js',
  },
];

let ok = 0;
let skip = 0;

for (const { src, dest } of copies) {
  const srcPath = path.resolve(__dirname, '..', src);
  const destPath = path.join(webrootJs, dest);

  if (!fs.existsSync(srcPath)) {
    console.warn(`  SKIP: ${src} not found (run npm install first)`);
    skip++;
    continue;
  }

  fs.mkdirSync(webrootJs, { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  console.log(`  COPY: ${src} -> ${dest}`);
  ok++;
}

console.log(`\nVendored ${ok} file(s), skipped ${skip}.`);
if (skip > 0) {
  console.log('Run "npm install" first to download dependencies.');
  process.exit(1);
}
