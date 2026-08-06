# RPi-Monitor

![RPi-Monitor logo](docs/source/_static/logo.png)

Real-time monitoring for embedded devices, originally built for the [Raspberry Pi](http://raspberrypi.org).

## Features

- **Embedded web server** — no external dependencies, serves a responsive UI on port 8888
- **Real-time metrics** — CPU, memory, temperature, network, disk, and more via RRDtool
- **Customizable dashboards** — gauges (JustGage), progress bars, graphs (Flot), and sortable status rows
- **Alert system** — threshold-based alerts with postprocess formulas
- **SNMP integration** — expose metrics via SNMP agent
- **Multi-device** — monitor friends/remote devices from a single instance
- **Add-ons** — extend with custom HTML pages
- **Authentication & TLS** — HTTP Basic Auth and HTTPS support
- **Testing mode** — run on non-Pi hardware with a visual banner

## Screenshots

![MainPage](docs/source/_static/features002.png)

More screenshots in the [documentation](https://xavierberger.github.io/RPi-Monitor-docs/02_screenshots.html).

## Quick Start

### Docker (recommended)

```bash
docker compose up -d --build
```

Access at `http://localhost:8888`. The UI will show a "Testing Mode" banner when not running on a Raspberry Pi.

To customize configuration, uncomment the volume mount in `docker-compose.yml` and copy the default configs:

```bash
mkdir -p config
cp -r src/etc/rpimonitor/* config/
# Edit config/daemon.conf as needed
docker compose restart
```

### Debian/Raspbian

Install the `.deb` package from the latest [release](https://github.com/XavierBerger/RPi-Monitor/releases):

```bash
sudo dpkg -i rpimonitor_<version>_all.deb
sudo systemctl enable --now rpimonitor
```

### From Source

```bash
sudo make install
sudo systemctl enable --now rpimonitor
```

Dependencies: `perl`, `librrds-perl`, `libipc-sharelite-perl`, `libhttp-daemon-perl`, `libjson-perl` (see [`cpanfile`](cpanfile) for full list).

## Configuration

RPi-Monitor is configured via files in `/etc/rpimonitor/`:

| File | Purpose |
|------|---------|
| `daemon.conf` | Server settings: port, auth, SSL, log level, test mode |
| `data.conf` | Which templates to load (one per line) |
| `template/*.conf` | Metric definitions: what to collect, how to display |

Key `daemon.conf` options:

```ini
daemon.port=8888
daemon.addr=0.0.0.0
daemon.testmode=0          # Auto-detected; set 1 to force
daemon.auth=0              # Enable HTTP Basic Auth
daemon.ssl=0               # Enable HTTPS
daemon.loglevel=0          # 0=info, 1=warning, 2=error, 3=debug
```

See the [`template/`](src/etc/rpimonitor/template/) directory for example configurations covering CPU, memory, network, storage, temperature, and more.

## Development

### Project Structure

```
src/
  usr/bin/rpimonitord              # Main daemon script
  usr/share/rpimonitor/
    lib/RPi/Monitor/               # Perl modules (SafeEval, Configuration, Server, Monitor, etc.)
    web/                           # Web UI (HTML, CSS, JS)
  etc/rpimonitor/                  # Default config files and templates
  var/lib/rpimonitor/              # RRD data storage
```

### Frontend Stack

| Library | Version | Purpose |
|---------|---------|---------|
| jQuery | 3.7.1 | DOM manipulation, AJAX |
| Bootstrap | 5.3.3 | UI framework |
| Raphael | 2.3.0 | SVG rendering for gauges |
| JustGage | 1.6.1 | Circular gauges |
| Sortable.js | 1.15.2 | Drag-and-drop list reordering |
| Flot | (legacy) | Graph rendering |
| javascriptrrd | (legacy) | RRD file parsing |

### Running Tests

```bash
perl -c src/usr/bin/rpimonitord
prove -l t/
```

### Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines. Pull requests should target the `develop` branch.

## Documentation

- [Features](https://xavierberger.github.io/RPi-Monitor-docs/01_features.html)
- [Installation](https://xavierberger.github.io/RPi-Monitor-docs/11_installation.html)
- [Configuration & Usage](https://xavierberger.github.io/RPi-Monitor-docs/30_index.html)
- [FAQ](https://xavierberger.github.io/RPi-Monitor-docs/14_faq.html)

## License

[GPLv3](LICENSE) — Copyright (c) 2013-2026, Xavier Berger and contributors.
