FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    perl \
    librrds-perl \
    libmojolicious-perl \
    libjson-perl \
    libyaml-libyaml-perl \
    libfile-which-perl \
    libio-socket-ssl-perl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

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
