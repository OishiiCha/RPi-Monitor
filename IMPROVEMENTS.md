# RPi-Monitor Improvements Roadmap

> **How to use this file:**
>
> 1. **Adding new items:** Add new improvement items under the appropriate category heading. Use the checkbox format `- [ ] **[Short title]** - Description`. Include file references where relevant using `@path/to/file:line`.
> 2. **Working on items:** When you start working on an item, leave a comment like `<!-- In progress: @yourname, date -->` next to it. When done, tick the checkbox: `- [x]`.
> 3. **Completing items:** Once an item is ticked (`- [x]`), move it to `COMPLETED.md` under the corresponding category. Add a brief summary of what was done and the date completed.
> 4. **Priority labels:** Use `[P0]` (critical/security), `[P1]` (high), `[P2]` (medium), `[P3]` (low/nice-to-have).
> 5. **Keep categories aligned:** Both this file and `COMPLETED.md` share the same category structure. When moving items, place them under the matching heading.

---

## Security

- [ ] **[P2] Secure shared memory access** - IPC::ShareLite uses hardcoded default key. Ensure proper permissions and consider alternatives.

## Code Quality & Modernization

- [x] **[P1] Split monolithic Perl file** - Split into 5 modules under `src/usr/share/rpimonitor/lib/RPi/Monitor/`: SafeEval.pm, Configuration.pm, Server.pm, Monitor.pm, Interactive.pm, SnmpModule.pm. Main script now ~270 lines.
- [ ] **[P2] Add Perldoc documentation** - No inline POD in any Perl package. Add POD for all public methods.
- [ ] **[P2] Add JSDoc documentation** - No JSDoc in any JavaScript files. Document all functions.
- [ ] **[P2] Add linter configuration** - Add `.eslintrc`, `.perltidyrc` for linting.
- [ ] **[P3] Update copyright dates** - Most files say "Copyright 2013-2018" or "Copyright 2013-2014".

## Frontend Modernization

- [ ] **[P1] Upgrade jQuery** - Using jQuery 1.x. Upgrade to jQuery 3.x or replace with vanilla JS.
- [ ] **[P1] Upgrade Bootstrap** - Using Bootstrap 3.x (EOL). Upgrade to Bootstrap 5.x.
- [ ] **[P1] Upgrade/replace raphael.js** - Using raphael 2.1.0. Consider SVG directly or modern library.
- [ ] **[P1] Upgrade/replace justgage** - Using justgage 1.0.1. Upgrade or replace.
- [ ] **[P1] Upgrade/replace flot charts** - Flot is unmaintained. Consider Chart.js, ECharts, or D3.
- [ ] **[P1] Upgrade/replace javascriptrrd** - Unmaintained SourceForge project. Consider alternatives or vendor/fork.
- [ ] **[P1] Upgrade Sortable.js** - Using 1.6.1. Upgrade to latest (1.15.x).
- [ ] **[P2] Add package.json and build tooling** - Add modern build pipeline (Vite, webpack, or esbuild).
- [ ] **[P2] Eliminate global JS variables** - Wrap in modules (ESM or IIFE).
- [ ] **[P2] Replace inline HTML string construction** - Use template literals or templating engine.
- [ ] **[P2] Add responsive design improvements** - Fixed widths in CSS. Make responsive with flexbox/grid.
- [ ] **[P2] Add dark mode support** - Add CSS custom properties and `prefers-color-scheme` media query.
- [ ] **[P2] Add accessibility (a11y) improvements** - Add ARIA roles and labels.
- [ ] **[P2] Remove deprecated HTML attributes** - `border=0` in statistics.html. Use CSS.
- [ ] **[P3] Add PWA support** - Add manifest.json and service worker.
- [ ] **[P3] Replace QR code library** - jsqrencode is from Google Code (dead). Replace with modern library.

## Architecture

- [ ] **[P1] Replace HTTP::Daemon with modern web framework** - Consider Mojolicious, Dancer2, or Plack/PSGI.
- [ ] **[P1] Add WebSocket support for real-time updates** - Replace 10s polling with WebSocket or SSE.
- [ ] **[P2] Replace IPC::ShareLite with modern IPC** - Consider Redis, shared files, or Mojolicious IPC.
- [ ] **[P2] Consider replacing RRD with modern time-series storage** - Consider InfluxDB, Prometheus, or SQLite.
- [ ] **[P2] Design proper REST API** - Design RESTful API with versioning (`/api/v1/...`).
- [ ] **[P2] Add API documentation** - Add OpenAPI/Swagger specification.
- [ ] **[P2] Add Docker/containerization support** - Add Dockerfile and docker-compose.
- [ ] **[P3] Remove sysVinit support** - Consider deprecating sysVinit init script.
- [ ] **[P3] Remove upstart support** - Upstart is obsolete.

## Testing & CI/CD

- [ ] **[P2] Add test coverage reporting** - Add Devel::Cover for Perl, c8/istanbul for JS.
- [ ] **[P2] Add automated release process** - Add GitHub Actions release workflow with semver.
- [ ] **[P2] Add .deb package build automation** - Add `dpkg-deb` or `fpm` packaging.

## Documentation

- [ ] **[P2] Fix dead links** - Blogspot and Google Code links may be dead. Update all URLs.
- [ ] **[P3] Modernize docs build** - Consider migrating from Sphinx/RST to MkDocs or Docusaurus.

## Configuration

- [ ] **[P2] Add config validation** - Add schema validation with meaningful error messages.
- [ ] **[P2] Consider modern config format** - Consider YAML or TOML. Provide migration tool.
- [ ] **[P3] Remove obsolete hardware templates** - raspbmc, xbian templates for discontinued distros.
- [ ] **[P3] Add config migration tool** - Tool to migrate old config formats.

## Build & Deploy

- [ ] **[P2] Pin dependency versions** - Add version constraints for JS libraries (cpanfile done for Perl).
- [ ] **[P2] Add Makefile improvements** - Add `test`, `lint`, `check`, `dist` make targets.
- [ ] **[P3] Replace git submodule with npm/cpan dependency** - Use package manager instead of submodule.

## Miscellaneous

- [ ] **[P2] Clean up Zone.Identifier files** - Windows ADS artifacts. Add to `.gitignore` and remove.
- [ ] **[P2] Fix version string** - Hardcoded `$VERSION = "{DEVELOPMENT}"`. Implement version injection.
- [ ] **[P3] Add semantic versioning** - VERSION file contains `2.13`. Adopt semver.
- [ ] **[P3] Remove `rpimonitord-snmp` symlink file** - Should be proper symlink, not text file.
