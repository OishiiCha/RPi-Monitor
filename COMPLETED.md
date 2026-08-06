# RPi-Monitor Completed Improvements

> **How to use this file:**
>
> 1. When an item in `IMPROVEMENTS.md` is completed (checkbox ticked), move it here under the matching category heading.
> 2. Add a brief summary of what was done, the date completed, and reference any relevant commits or PRs.
> 3. Format: `- [x] **[Short title]** - Completed: YYYY-MM-DD - Summary of changes.`
> 4. Keep categories in the same order as `IMPROVEMENTS.md`.

---

## Security

- [x] **[P0] Remove `eval()` usage in JavaScript** - Completed: 2026-08-06 - Added `safeEval()` and `safeEvalStmt()` functions to `rpimonitor.utils.js` using `Function` constructor with sandboxed context (window/document/localStorage/eval/Function set to undefined). Replaced all `eval()` calls in `rpimonitor.js`, `rpimonitor.status.js`, `rpimonitor.statistics.js`, `rpimonitor.addons.js`, and `rpimonitor.utils.js`. Also replaced `eval("(" + localStorage.getItem(name) + ")")` with `JSON.parse()` in `getData()`.
- [x] **[P0] Remove `eval()` in Perl for postprocess/alert commands** - Completed: 2026-08-06 - Added `SafeEval` package with `Postprocess()` and `Compare()` functions that validate expressions against whitelisted regex patterns before evaluating. Replaced all 5 raw string `eval()` calls: postprocess in `Process()`, alert active/trigger in `Alert()`, SNMP postprocess in `UpdateTree()`, and formula check in `Interactive::CheckFormula()`.
- [x] **[P0] Add authentication to web interface** - Completed: 2026-08-06 - Added `Authenticate()` method to Server package implementing HTTP Basic Auth. Config options: `daemon.auth` (enable), `daemon.authuser`, `daemon.authpass`, `daemon.authrealm`. Auth check integrated into request loop. Readonly mode skips auth for static/dynamic JSON.
- [x] **[P0] Add HTTPS/TLS support** - Completed: 2026-08-06 - Added SSL/TLS support using `IO::Socket::SSL` when `daemon.ssl=1`. Config options: `daemon.sslcert`, `daemon.sslkey`. Server creation now conditionally adds SSL parameters to `HTTP::Daemon->new()`.
- [x] **[P1] Add CSRF protection** - Completed: 2026-08-06 - N/A: The server is GET-only (read-only monitoring). No state-changing POST/PUT/DELETE endpoints exist. Will revisit if write endpoints are added in the future.
- [x] **[P1] Add Content-Security-Policy headers** - Completed: 2026-08-06 - Added `AddSecurityHeaders()` method to Server package. Sends CSP (`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'`), X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, X-XSS-Protection: 1; mode=block, Referrer-Policy: strict-origin-when-cross-origin. Applied to all JSON responses.
- [x] **[P1] Add input validation/sanitization on server** - Completed: 2026-08-06 - Added path traversal protection in `DoGET()` rejecting any path containing `..`. Sanitized addon path regex from `(.*)` to `([a-zA-Z0-9_-]+)` and `([a-zA-Z0-9_.-]+)` to prevent path traversal via addon URLs.
- [x] **[P1] Add rate limiting to web server** - Completed: 2026-08-06 - Added per-client-IP rate limiting in server request loop. Tracks request counts in `%rate_limits` hash with 60-second sliding window. Limit: 60 requests/minute per IP. Returns HTTP 429 when exceeded.
- [x] **[P2] Remove deprecated `<font>` tags** - Completed: 2026-08-06 - Replaced `<font color=black>...</font>` with `<span style='color:black'>` in `ShowInfo()` function in `rpimonitor.utils.js`.

## Code Quality & Modernization

- [x] **[P1] Add Perl dependency manifest** - Completed: 2026-08-06 - Created `cpanfile` listing all required dependencies (IPC::ShareLite, HTTP::Daemon, HTTP::Status, JSON, RRDs, etc.) and recommended optional dependencies (IO::Socket::SSL, SNMP::Extension::PassPersist). Includes test dependencies.
- [x] **[P1] Add `use warnings` alongside `use strict`** - Completed: 2026-08-06 - Added `use warnings;` to all 7 packages: main, SafeEval, Configuration, Server, Monitor, Interactive, SnmpModule.
- [x] **[P2] Add `.editorconfig`** - Completed: 2026-08-06 - Created `.editorconfig` with UTF-8 charset, LF line endings, 2-space indentation (4 for Perl/PM/T files), tab indentation for Makefile, trailing whitespace trimming.
- [x] **[P2] Remove commented-out code** - Completed: 2026-08-06 - Removed all `#print Data::Dumper->Dump(...)` debug lines and `#use diagnostics` from `rpimonitord`.
- [x] **[P1] Split monolithic Perl file** - Completed: 2026-08-06 - Split `rpimonitord` (1717 lines, 6 inline packages) into 5 modules under `src/usr/share/rpimonitor/lib/RPi/Monitor/`: `SafeEval.pm`, `Configuration.pm`, `Server.pm`, `Monitor.pm`, `Interactive.pm`, `SnmpModule.pm`. Main script reduced to ~270 lines. Updated CI workflow to syntax-check all `.pm` files. Updated test to use new module paths.
- [x] **[P2] Add linter configuration** - Completed: 2026-08-06 - Added `.eslintrc.json` for JavaScript (no-eval, no-undef, curly rules) and `.perltidyrc` for Perl code formatting.

## Frontend Modernization

- [x] **[P1] Upgrade jQuery** - Completed: 2026-08-06 - Upgraded from jQuery 1.x to jQuery 3.7.1.
- [x] **[P1] Upgrade Bootstrap** - Completed: 2026-08-06 - Upgraded from Bootstrap 3.x to Bootstrap 5.3.3. Updated navbar (navbar-dark bg-dark fixed-top, navbar-toggler, nav-item/nav-link), modals (data-bs-dismiss, btn-close, modal-title), dropdowns (data-bs-toggle, dropdown-item, dropdown-divider, dropdown-menu-end), popovers (BS5 Popover API), progress bars (bg-warning/bg-danger), labels (compat CSS). Added BS3→5 compatibility CSS classes. Replaced glyphicon with inline SVG. Updated all HTML pages and JS files.
- [x] **[P1] Upgrade/replace raphael.js** - Completed: 2026-08-06 - Upgraded from raphael 2.1.0 to 2.3.0.
- [x] **[P1] Upgrade/replace justgage** - Completed: 2026-08-06 - Upgraded from justgage 1.0.1 to 1.6.1.
- [x] **[P1] Upgrade Sortable.js** - Completed: 2026-08-06 - Upgraded from Sortable 1.6.1 to 1.15.2.
- [x] **[P2] Remove deprecated HTML attributes** - Completed: 2026-08-06 - Replaced `border=0` in statistics.html with `class="border-0"`.

## Architecture

- [x] **[P2] Add Docker/containerization support** - Completed: 2026-08-06 - Created `Dockerfile` (perl:5.36-slim-bookworm base, installs all deps), `docker-compose.yml` (port 8888, named volume for RRD data, optional config mount), `.dockerignore`, and `config/` directory with default daemon.conf.

## Testing & CI/CD

- [x] **[P1] Add test framework** - Completed: 2026-08-06 - Created `t/00-safeeval.t` with Test::More testing SafeEval::Postprocess and SafeEval::Compare for valid expressions, unsafe expression rejection, and comparison logic.
- [x] **[P1] Add CI/CD pipeline** - Completed: 2026-08-06 - Created `.github/workflows/ci.yml` with two jobs: `perl-syntax-check` (runs `perl -c` and `prove`) and `lint` (checks for `eval()` in JS and raw string `eval()` in Perl).

## Documentation

- [x] **[P1] Add CONTRIBUTING.md** - Completed: 2026-08-06 - Created contributing guidelines covering Perl/JS coding standards, testing, PR process, and issue reporting.
- [x] **[P1] Add CODE_OF_CONDUCT.md** - Completed: 2026-08-06 - Created Contributor Covenant 2.1 code of conduct.
- [x] **[P2] Add issue/PR templates** - Completed: 2026-08-06 - Created `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, and `.github/PULL_REQUEST_TEMPLATE.md`.
- [x] **[P2] Add CHANGELOG.md** - Completed: 2026-08-06 - Created root-level CHANGELOG.md following Keep a Changelog format with [Unreleased] section documenting all security, code quality, build, documentation, and infrastructure changes.
- [x] **[P3] Update git submodule URL** - Completed: 2026-08-06 - Changed `.gitmodules` URL from `git@github.com:snide/sphinx_rtd_theme.git` (SSH) to `https://github.com/snide/sphinx_rtd_theme.git` (HTTPS).

## Configuration

*(No items completed yet.)*

## Build & Deploy

- [x] **[P1] Improve systemd unit file** - Completed: 2026-08-06 - Added `Wants=network-online.target`, `Restart=on-failure`, `RestartSec=5`, and hardening directives: NoNewPrivileges, ProtectSystem=full, ProtectHome, PrivateTmp, ReadWritePaths, RestrictAddressFamilies, LockPersonality, RestrictRealtime, RestrictSUIDSGID.
- [x] **[P2] Add Makefile improvements** - Completed: 2026-08-06 - Added `test` (prove), `check` (perl -c syntax), `lint` (JS eval check + syntax), and `dist` (tarball) make targets. VERSION file now installed to `/usr/share/rpimonitor/VERSION`.

## Miscellaneous

- [x] **[P3] Fix typo in README** - Completed: 2026-08-06 - Fixed "RPi-Monotor" → "RPi-Monitor" in title and "detailled" → "detailed" in installation section. Also updated contributing link to point to new CONTRIBUTING.md.
- [x] **[P2] Clean up Zone.Identifier files** - Completed: 2026-08-06 - Created `.gitignore` with `*Zone.Identifier` pattern to exclude Windows ADS artifacts.
- [x] **[P2] Fix version string** - Completed: 2026-08-06 - Replaced hardcoded `$VERSION = "{DEVELOPMENT}"` with runtime VERSION file lookup. Searches `$FindBin::Bin/../../VERSION`, `/usr/share/rpimonitor/VERSION`, and `VERSION`. Makefile and Dockerfile updated to install VERSION file.
