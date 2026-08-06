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

*(No items remaining.)*

## Frontend Modernization

- [ ] **[P1] Upgrade/replace flot charts** - Flot is unmaintained. Consider Chart.js, ECharts, or D3.
- [ ] **[P1] Upgrade/replace javascriptrrd** - Unmaintained SourceForge project. Consider alternatives or vendor/fork.
- [ ] **[P2] Add package.json and build tooling** - Add modern build pipeline (Vite, webpack, or esbuild).
- [ ] **[P2] Eliminate global JS variables** - Wrap in modules (ESM or IIFE).
- [ ] **[P2] Replace inline HTML string construction** - Use template literals or templating engine.
- [ ] **[P3] Replace QR code library** - jsqrencode is from Google Code (dead). Replace with modern library.

## Architecture

- [ ] **[P1] Replace HTTP::Daemon with modern web framework** - Consider Mojolicious, Dancer2, or Plack/PSGI.
- [ ] **[P1] Add WebSocket support for real-time updates** - Replace 10s polling with WebSocket or SSE.
- [ ] **[P2] Replace IPC::ShareLite with modern IPC** - Consider Redis, shared files, or Mojolicious IPC.
- [ ] **[P2] Consider replacing RRD with modern time-series storage** - Consider InfluxDB, Prometheus, or SQLite.

## Testing & CI/CD

*(No items remaining.)*

## Documentation

*(No items remaining.)*

## Configuration

- [ ] **[P2] Consider modern config format** - Consider YAML or TOML. Provide migration tool.
- [ ] **[P3] Add config migration tool** - Tool to migrate old config formats.

## Build & Deploy

- [ ] **[P3] Replace git submodule with npm/cpan dependency** - Use package manager instead of submodule.

## Miscellaneous

*(No items remaining.)*
