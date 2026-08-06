# Changelog

All notable changes to RPi-Monitor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Removed all `eval()` usage in JavaScript files, replaced with `safeEval()` / `safeEvalStmt()` using `Function` constructor with sandboxed context
- Added `SafeEval` Perl package with whitelisted expression validation for postprocess and alert formulas
- Added HTTP Basic Authentication support (`daemon.auth`, `daemon.authuser`, `daemon.authpass`, `daemon.authrealm`)
- Added HTTPS/TLS support via `IO::Socket::SSL` (`daemon.ssl`, `daemon.sslcert`, `daemon.sslkey`)
- Added security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- Added path traversal protection in web server (rejects `..` in paths)
- Sanitized addon path regex to prevent path traversal
- Added rate limiting (60 requests/minute per IP)

### Code Quality
- Added `use warnings` to all Perl packages
- Removed deprecated `<font>` HTML tags from JavaScript
- Split monolithic `rpimonitord` (1717 lines, 6 inline packages) into 5 modules under `lib/RPi/Monitor/`: `SafeEval.pm`, `Configuration.pm`, `Server.pm`, `Monitor.pm`, `Interactive.pm`, `SnmpModule.pm`
- Updated all copyright headers to "Copyright 2013-2026" across Perl, JavaScript, CSS, and HTML files
- Fixed dead/outdated links: blogspot.fr → blogspot.com (HTTPS), raspberrypi.org → HTTPS
- Replaced `rpimonitord-snmp` text file with proper symlink in Makefile and Dockerfile
- Added POD documentation to all 6 Perl modules (SafeEval, Configuration, Server, Monitor, Interactive, SnmpModule)
- Added JSDoc comments to key functions in rpimonitor.js and rpimonitor.utils.js

### Frontend Modernization
- Upgraded jQuery from 1.x to 3.7.1
- Upgraded Bootstrap from 3.x to 5.3.3 (navbar, modals, dropdowns, popovers, progress bars, labels)
- Added Bootstrap 3 → 5 compatibility CSS classes (`.hide`, `.pull-right`, `.sr-only`, `.well`, `.label-*`, `.alert-error`)
- Upgraded Raphael from 2.1.0 to 2.3.0
- Upgraded JustGage from 1.0.1 to 1.6.1
- Upgraded Sortable.js from 1.6.1 to 1.15.2
- Replaced glyphicon icons with inline SVG
- Updated all HTML pages with Bootstrap 5 markup and `bootstrap-icons.min.css` link
- Updated `Server.pm` paths list for new library filenames
- Removed deprecated `border=0` HTML attribute from statistics.html
- Added dark mode support via `prefers-color-scheme` media query
- Added responsive design breakpoints (768px, 480px) for mobile/tablet layouts
- Added ARIA roles and labels to all HTML pages for accessibility
- Added PWA support: `manifest.json`, service worker (`sw.js`), offline caching, theme-color meta
- Replaced Flot charts with Chart.js 4.x (time-scale x-axis via chartjs-adapter-date-fns)
- Replaced javascriptrrd with server-side RRD extraction (`/stat/:name.json` endpoint using `RRDs::fetch`)
- Replaced jsqrencode (dead Google Code project) with qrcodejs; added `setupqr()`/`doqr()` to `rpimonitor.js`
- Added Vite 5.x build tooling (`vite.config.js`, `npm run build`/`npm run dev`)
- Wrapped all page JS modules in IIFEs with `'use strict'` (utils, status, statistics, addons, index, rpimonitor.js)
- Converted all inline HTML string concatenation to ES6 template literals
- Deleted legacy vendored JS files: `flot/`, `javascriptrrd/`, `jsqrencode.min.js`, old `Sortable.1.6.1`, `raphael.2.1.0`, `justgage.1.0.1`, non-minified `bootstrap.js`
- Fixed `getData()` bug: `name.json` (string property access) → `name + '.json'` (concatenation) in error message
- Updated About dialog: replaced references to jsqrencode/javascriptrrd/Flot with Chart.js/qrcodejs
- Updated docker-compose: external port 3080, removed obsolete `shm_size` (IPC::ShareLite removed)

### Build & Deploy
- Hardened systemd unit file with `NoNewPrivileges`, `ProtectSystem`, `ProtectHome`, `PrivateTmp`, `RestrictAddressFamilies`, etc.
- Added restart policy to systemd unit
- Added Docker support: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and `config/` directory
- Added Makefile targets: `test`, `check`, `lint`, `dist`
- Fixed version string: reads from VERSION file at runtime instead of hardcoded `{DEVELOPMENT}`
- Added `.gitignore` with Zone.Identifier exclusion
- Added linter configuration: `.eslintrc.json` (JavaScript) and `.perltidyrc` (Perl)
- Added `package.json` pinning JS dependency versions (jQuery, Bootstrap, Raphael, JustGage, Sortable.js, bootstrap-icons)
- Added `make deb` target for building .deb packages with `dpkg-deb`
- Added YAML config support: `LoadYAML()` in `Configuration.pm` using `YAML::XS`, auto-detects `.yaml`/`.yml` files
- Added config migration tool: `tools/conf2yaml.pl` (installed as `rpimonitor-conf2yaml`) converts legacy `.conf` to YAML
- Added sample YAML configs: `daemon.yaml.example`, `data.yaml.example`, `cpu.yaml.example`
- Added `npm run vendor` script and `scripts/vendor-deps.js` to copy JS libs from `node_modules` to webroot
- Replaced vendored JS libraries (flot, javascriptrrd, jsqrencode) with npm-managed dependencies; no git submodules remain
### Architecture
- Replaced HTTP::Daemon with Mojolicious web framework in Server.pm
- Added WebSocket endpoint (`/ws`) for real-time dynamic data push
- Added `rpimonitorSubscribe()` in frontend JS with HTTP polling fallback
- Replaced IPC::ShareLite shared memory with file-based IPC (`dynamic.json`)
- Removed `sharedmemkey` configuration option
- RRD retained as primary storage with file-based IPC abstraction layer
- Added config validation: `Validate()` method in `Configuration.pm` checks port, delay, timeout, SSL, auth, webroot, and RRD entries
- Marked raspbmc and xbian templates as deprecated (discontinued distros)
- Removed sysVinit and upstart support from Makefile (systemd is now default)
- Added OpenAPI 3.0 specification (`openapi.yaml`) documenting all REST API endpoints
- Added GitHub Actions release workflow (`.github/workflows/release.yml`) with tag-triggered releases
- Added test coverage job to CI using Devel::Cover
- Modernized README with Docker quick start, configuration reference, and project structure

### Documentation
- Created `CONTRIBUTING.md` with development guidelines
- Created `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- Added GitHub issue templates (bug report, feature request)
- Added pull request template
- Fixed README typos ("RPi-Monotor" → "RPi-Monitor", "detailled" → "detailed")

### Infrastructure
- Added `cpanfile` for Perl dependency management
- Added `.editorconfig` for consistent formatting
- Added GitHub Actions CI workflow (syntax check, lint, test)
- Added basic test framework with `t/00-safeeval.t`

## [2.13] - Previous release
- See `docs/source/43_changelog.rst` for historical changelog
