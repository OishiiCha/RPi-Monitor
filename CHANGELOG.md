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

### Build & Deploy
- Hardened systemd unit file with `NoNewPrivileges`, `ProtectSystem`, `ProtectHome`, `PrivateTmp`, `RestrictAddressFamilies`, etc.
- Added restart policy to systemd unit
- Added Docker support: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and `config/` directory
- Added Makefile targets: `test`, `check`, `lint`, `dist`
- Fixed version string: reads from VERSION file at runtime instead of hardcoded `{DEVELOPMENT}`
- Added `.gitignore` with Zone.Identifier exclusion
- Added linter configuration: `.eslintrc.json` (JavaScript) and `.perltidyrc` (Perl)
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
