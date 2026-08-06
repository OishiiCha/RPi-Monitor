FROM perl:5.36-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    librrds-perl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy RRDs from system Perl path into container Perl's @INC
# (apt installs to /usr/share/perl5 and /usr/lib/*/perl5, but the
# perl:5.36-slim image uses /usr/local/lib/perl5)
RUN set -e; \
    find /usr/share/perl5 /usr/lib -name 'RRDs.pm' -exec cp {} /usr/local/lib/perl5/site_perl/5.36.3/ \; ; \
    RRD_SO=$(find /usr/lib -path '*/auto/RRDs/RRDs.so' -print -quit); \
    if [ -n "$RRD_SO" ]; then \
      mkdir -p /usr/local/lib/perl5/site_perl/5.36.3/aarch64-linux-gnu/auto/RRDs; \
      cp "$RRD_SO" /usr/local/lib/perl5/site_perl/5.36.3/aarch64-linux-gnu/auto/RRDs/; \
    fi

WORKDIR /build

COPY cpanfile .
RUN cpanm --installdeps --notest . && rm -rf /root/.cpanm

COPY src/ /build/src/
COPY VERSION /build/VERSION

RUN mkdir -p /usr/share/rpimonitor \
    /etc/rpimonitor \
    /var/lib/rpimonitor \
    /usr/bin \
    /usr/share/rpimonitor/web \
    /usr/share/rpimonitor/lib \
    && cp -r src/usr/bin/rpimonitord /usr/bin/rpimonitord \
    && cp -r src/usr/share/rpimonitor/lib/* /usr/share/rpimonitor/lib/ \
    && cp -r src/usr/share/rpimonitor/web/* /usr/share/rpimonitor/web/ \
    && cp -r src/etc/rpimonitor/* /etc/rpimonitor/ \
    && cp -r src/var/lib/rpimonitor/* /var/lib/rpimonitor/ \
    && cp /build/VERSION /usr/share/rpimonitor/VERSION \
    && chmod +x /usr/bin/rpimonitord \
    && ln -sf rpimonitord /usr/bin/rpimonitord-snmp \
    && echo 'daemon.addr=0.0.0.0' >> /etc/rpimonitor/daemon.conf \
    && echo 'daemon.testmode=1' >> /etc/rpimonitor/daemon.conf \
    && rm -rf /build

VOLUME /etc/rpimonitor
VOLUME /var/lib/rpimonitor

EXPOSE 8888

CMD ["perl", "/usr/bin/rpimonitord", "-b", "0.0.0.0"]
