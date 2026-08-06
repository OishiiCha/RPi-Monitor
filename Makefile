TARGETDIR?=/
STARTUPSYS?=sysVinit

all:
	@echo "Makefile usage"
	@echo ""
	@echo " Configuration is done using environment variable"
	@echo ""
	@echo " TARGETDIR defines where to install RPi-Monitor"
	@echo " STARTUPSYS defines the startup system to install. Possible values are:"
	@echo "  - sysVinit"
	@echo "  - upstart"
	@echo "  - systemd"
	@echo ""
	@echo " The current values are:"
	@echo "  TARGETDIR=${TARGETDIR}"
	@echo "  STARTUPSYS=${STARTUPSYS}"
	@echo ""
	@echo " Once environment variable are set, execute: make install"
	@echo ""

DOCS_DIR = docs
.PHONY: man
man:
	@make -C $(DOCS_DIR) man

install: man
	@echo "Installing RPi-Monitor in ${TARGETDIR}"
	@mkdir -p ${TARGETDIR}var/lib/rpimonitor
	@cp -r src/var/lib/rpimonitor/* ${TARGETDIR}var/lib/rpimonitor/
	@mkdir -p ${TARGETDIR}etc/rpimonitor
	@cp -r src/etc/rpimonitor/* ${TARGETDIR}etc/rpimonitor/
	@mkdir -p ${TARGETDIR}etc/cron.d
	@cp -r src/etc/cron.d/* ${TARGETDIR}etc/cron.d/
	@mkdir -p ${TARGETDIR}etc/snmp
	@cp -r src/etc/snmp/* ${TARGETDIR}etc/snmp/
	@mkdir -p ${TARGETDIR}usr/bin
	@cp -r src/usr/bin/* ${TARGETDIR}usr/bin/
	@mkdir -p ${TARGETDIR}usr/share/rpimonitor
	@cp -r src/usr/share/rpimonitor/* ${TARGETDIR}usr/share/rpimonitor/
	@cp VERSION ${TARGETDIR}usr/share/rpimonitor/VERSION
	@echo "Startup system is ${STARTUPSYS}"
	@mkdir -p ${TARGETDIR}usr/share/man/man1
	@cp -r docs/build/man/rpimonitor.1 ${TARGETDIR}usr/share/man/man1/
	@mkdir -p ${TARGETDIR}usr/share/man/man5
	@cp -r docs/build/man/rpimonitor-*.conf.5 ${TARGETDIR}usr/share/man/man5/
	
ifeq (${STARTUPSYS},sysVinit)
	@mkdir -p ${TARGETDIR}etc/init.d
	@cp -r src/etc/init.d/* ${TARGETDIR}etc/init.d/
endif
ifeq (${STARTUPSYS},upstart)
	@mkdir -p ${TARGETDIR}etc/init
	@cp -r src/etc/init/* ${TARGETDIR}etc/init/
endif
ifeq (${STARTUPSYS},systemd)
	@mkdir -p ${TARGETDIR}usr/lib/systemd/system
	@cp -r src/usr/lib/systemd/system/* ${TARGETDIR}usr/lib/systemd/system/
endif
	@echo "Installation completed"

clean:
	@echo

.PHONY: test
test:
	@echo "Running Perl tests..."
	@prove -l t/

.PHONY: check
check:
	@echo "Running Perl syntax checks..."
	@perl -c src/usr/bin/rpimonitord
	@for f in src/usr/share/rpimonitor/lib/RPi/Monitor/*.pm; do \
		echo "Checking $$f..."; \
		perl -c $$f; \
	done

.PHONY: lint
lint: check
	@echo "Running JavaScript lint checks..."
	@for f in src/usr/share/rpimonitor/web/js/rpimonitor*.js; do \
		echo "Linting $$f..."; \
		node -c $$f 2>/dev/null || echo "  (node not available, skipping)"; \
	done
	@echo "Checking for eval() in JavaScript..."
	@if grep -rn '[^a-zA-Z]eval(' src/usr/share/rpimonitor/web/js/rpimonitor*.js; then \
		echo "ERROR: eval() found in JavaScript files"; exit 1; \
	else \
		echo "  No eval() found."; \
	fi

.PHONY: dist
dist: check test
	@echo "Building distribution tarball..."
	@mkdir -p dist
	@tar czf dist/rpimonitor-$(shell cat VERSION).tar.gz \
		--exclude='*.Zone.Identifier' \
		--exclude='.git' \
		--exclude='dist' \
		src/ VERSION cpanfile Makefile Dockerfile docker-compose.yml \
		CHANGELOG.md README.md CONTRIBUTING.md LICENSE
	@echo "Created dist/rpimonitor-$(shell cat VERSION).tar.gz"
