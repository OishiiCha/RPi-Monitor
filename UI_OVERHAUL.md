# RPi-Monitor UI Overhaul Plan

A complete modernization of the RPi-Monitor web interface.

---

## Phase 1: Foundation & Design System

- [x] Remove `testmode=1` from Dockerfile so daemon runs in production
- [x] Define CSS design tokens (colors, spacing, radius, shadows, fonts)
- [x] Implement dark theme as default (`data-bs-theme="dark"` on all pages)
- [x] Add Inter font from Google Fonts (all pages)
- [x] Update `manifest.json` theme color to `#6366f1`
- [x] Update `sw.js` cache version and include chart.js assets
- [x] Create modern SVG favicon (`img/favicon.svg`)
- [x] Create modern SVG logo (`img/logo.svg`)
- [x] Update all HTML pages to reference SVG favicon
- [x] Update manifest.json with SVG icon entry

## Phase 2: CSS Rewrite

- [x] Replace entire `rpimonitor.css` with modern design system
- [x] Dark background (`#0f1117`), surface cards (`#181b24`)
- [x] Indigo/violet accent gradient (`#6366f1` → `#8b5cf6`)
- [x] Glassmorphism cards with subtle borders and hover effects
- [x] Modern navbar styling (blur, accent hover states)
- [x] Modern footer styling (minimal, clean links)
- [x] Styled modals, popovers, dropdowns for dark theme
- [x] CSS spinner replacing `preloader.gif`
- [x] Responsive masonry columns (1/2/3/4 based on viewport)
- [x] Mobile-first responsive breakpoints
- [x] Card entry animation (fade-in + slide-up with stagger)
- [x] `prefers-reduced-motion` media query for accessibility
- [x] Loading skeleton placeholders (shimmer animation)
- [x] JustGage dark theme text colors
- [x] Light theme override variables for theme toggle
- [x] Search bar styling with bootstrap-icon
- [x] Collapsible section chevron animation
- [x] Sparkline container styling
- [x] Ring/donut chart SVG styling
- [x] Theme toggle button styling
- [x] Keyboard hint (`<kbd>`) styling
- [x] Export button styling
- [x] Temperature color coding classes (cool/warm/hot)
- [x] Compact uptime monospace styling
- [x] Live clock styling in navbar
- [x] Status indicator badge with pulse animation
- [x] Auto-refresh indicator spinning animation

## Phase 3: Index / Landing Page

- [x] Hero section with gradient title text
- [x] Tagline: "Real-time monitoring for embedded devices"
- [x] "Get Started" button with gradient + hover lift
- [x] Feature cards (Status, Statistics, Add-ons) with bootstrap-icons
- [x] Remove old jumbotron / Bootstrap 3 card

## Phase 4: Navigation Bar

- [x] Bootstrap-icons for each nav item (speedometer, graph, puzzle, gear, info)
- [x] Clean brand with rounded favicon
- [x] Dropdown menus with icons (book, link, github, etc.)
- [x] Friends dropdown with people icon
- [x] Active state highlighting
- [x] Mobile collapse menu
- [x] Live clock element in navbar
- [x] Status indicator badge (Online/Offline with pulse dot)
- [x] Theme toggle button (sun/moon icon)

## Phase 5: Status Page

- [x] Card-based layout (each metric group = a card)
- [x] Replace old PNG icons with bootstrap-icons mapping:
  - `cpu.png` → `bi-cpu`
  - `cpu_temp.png` → `bi-thermometer-half`
  - `memory.png` → `bi-memory`
  - `swap.png` → `bi-hdd-stack`
  - `sd.png` → `bi-sd-card`
  - `usb_hdd.png` → `bi-hdd`
  - `network.png` → `bi-ethernet`
  - `wifi.png` → `bi-wifi`
  - `uptime.png` → `bi-clock-history`
  - `pmu.png` → `bi-power`
  - `daemons.png` → `bi-gear`
  - `version.png` → `bi-tag`
  - `user.png` → `bi-person`
  - `avatar.png` → `bi-person-circle`
  - `warning.png` → `bi-exclamation-triangle`
  - `ok.png` → `bi-check-circle`
  - `timesync.png` → `bi-clock`
  - `tor.png` → `bi-shield`
  - `printer.png` → `bi-printer`
- [x] Card hover effects (border glow, shadow lift)
- [x] Clean text layout with proper line-height and wrapping
- [x] Remove old `<hr>` separators in rows
- [x] Sortable drag handle preserved
- [x] Card entry animation (staggered fade-in)
- [x] Collapsible sections (click title to collapse/expand)
- [x] Search/filter bar for status cards
- [x] Export status data as JSON button
- [x] Auto-refresh indicator (spinning icon on refresh)
- [x] Keyboard shortcuts hint in options

## Phase 6: Statistics Page

- [x] Chart.js canvas wrapped in styled `#graph-container` card
- [x] Dark theme chart styling:
  - Grid lines: `rgba(255,255,255,0.05)`
  - Tick/label colors: `#9ba1ae`
  - Legend: circle point style, `#e4e6eb` text
  - Tooltip: dark background, rounded, bordered
- [x] Updated dataset colors to match accent palette
- [x] Graph selector dropdown styled for dark theme
- [x] Page title styling
- [x] Removed `preloader.gif` image (CSS spinner handles it)

## Phase 7: Add-ons Page

- [x] Dark theme applied via `data-bs-theme="dark"`
- [x] Inter font loaded
- [x] Inherits all global styling (navbar, footer, modals)

## Phase 8: Shared Components (rpimonitor.js)

- [x] Modern navbar HTML with bootstrap-icons
- [x] Clean footer (removed `navbar-dark bg-dark` classes)
- [x] QR code link uses `bi-qr-code` icon
- [x] About dialog updated with Bootstrap Icons attribution
- [x] ShowInfo icon → `bi-info-circle` (in utils.js)
- [x] Live clock function (`StartClock`)
- [x] Status badge function (`AddStatusBadge`)
- [x] Theme toggle function (`AddThemeToggle`)
- [x] Keyboard shortcuts (`AddKeyboardShortcuts`): S/G/A/H/?

## Phase 9: Utility Functions (rpimonitor.utils.js)

- [x] `CompactUptime(value)` — "1d 2h 3m 4s" format
- [x] `TempColor(temp, warn, crit)` — color-coded temperature
- [x] `Sparkline(values, w, h, color)` — inline SVG sparkline
- [x] `RingChart(percent, label, size, color)` — SVG ring/donut chart
- [x] `ExportData(name, data)` — download JSON file

## Phase 10: Bug Fixes (Pre-UI)

- [x] Fix `IPC::ShareLite` missing — removed from SnmpModule.pm, use file-based IPC
- [x] Fix `Subroutine Load redefined` — `use YAML::XS ()` empty import
- [x] Fix `SNMP::Extension::PassPersist` missing — optional `eval { require }`
- [x] Guard SNMP code paths with `defined &RPi::Monitor::SnmpModule::new`

---

## Phase 11: Testing

- [ ] Test Docker build with new UI
- [ ] Test on actual Raspberry Pi
- [ ] Test on mobile (phone + tablet)
- [ ] Test on Chrome, Firefox, Safari
- [ ] Verify all old PNG image references still work (fallback)
- [ ] Verify theme toggle persists across pages
- [ ] Verify keyboard shortcuts work
- [ ] Verify search/filter works with dynamic content
- [ ] Verify export downloads valid JSON
- [ ] Verify collapsible sections persist state

---

## Notes

- All changes maintain backward compatibility with existing config files
- Bootstrap 5 + jQuery + Chart.js stack preserved
- No backend changes required (all frontend)
- Google Fonts loaded via CDN (requires internet access at runtime)
- Old PNG images kept in `img/` as fallback
- Theme toggle stores preference in `localStorage` key `rpm-theme`
- Service worker cache bumped to `rpimonitor-v2`
