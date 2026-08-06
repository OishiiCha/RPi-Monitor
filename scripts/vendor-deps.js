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
const webrootCss = path.resolve(__dirname, '..', 'src', 'usr', 'share', 'rpimonitor', 'web', 'css');
const webrootFonts = path.resolve(__dirname, '..', 'src', 'usr', 'share', 'rpimonitor', 'web', 'fonts');

const copies = [
  // Chart.js
  {
    src: 'node_modules/chart.js/dist/chart.umd.js',
    dest: 'chart.umd.min.js',
    dir: webrootJs,
  },
  // Chart.js date-fns adapter
  {
    src: 'node_modules/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js',
    dest: 'chartjs-adapter-date-fns.bundle.min.js',
    dir: webrootJs,
  },
  // QRCode.js
  {
    src: 'node_modules/qrcodejs/qrcode.min.js',
    dest: 'qrcode.min.js',
    dir: webrootJs,
  },
  // Bootstrap Icons CSS
  {
    src: 'node_modules/bootstrap-icons/font/bootstrap-icons.min.css',
    dest: 'bootstrap-icons.min.css',
    dir: webrootCss,
    patch: (content) => content.replace(/\.\/fonts\//g, '../fonts/'),
  },
];

// Font files (entire directory)
const fontSrcDir = path.resolve(__dirname, '..', 'node_modules', 'bootstrap-icons', 'font', 'fonts');
const fontDestDir = path.join(webrootFonts, 'fonts');

let ok = 0;
let skip = 0;

for (const { src, dest, dir, patch } of copies) {
  const srcPath = path.resolve(__dirname, '..', src);
  const destPath = path.join(dir, dest);

  if (!fs.existsSync(srcPath)) {
    console.warn(`  SKIP: ${src} not found (run npm install first)`);
    skip++;
    continue;
  }

  fs.mkdirSync(dir, { recursive: true });
  if (patch) {
    let content = fs.readFileSync(srcPath, 'utf8');
    content = patch(content);
    fs.writeFileSync(destPath, content);
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
  console.log(`  COPY: ${src} -> ${dest}`);
  ok++;
}

// Copy bootstrap-icons font files
if (fs.existsSync(fontSrcDir)) {
  fs.mkdirSync(webrootFonts, { recursive: true });
  for (const f of fs.readdirSync(fontSrcDir)) {
    fs.copyFileSync(path.join(fontSrcDir, f), path.join(webrootFonts, f));
    console.log(`  COPY FONT: ${f}`);
    ok++;
  }
} else {
  console.warn('  SKIP: bootstrap-icons fonts not found');
  skip++;
}

console.log(`\nVendored ${ok} file(s), skipped ${skip}.`);
if (skip > 0) {
  console.log('Run "npm install" first to download dependencies.');
  process.exit(1);
}
