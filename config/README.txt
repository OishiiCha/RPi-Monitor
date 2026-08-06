# RPi-Monitor Docker Configuration
# 
# This directory is mounted to /etc/rpimonitor in the container.
# Edit daemon.conf to change port, auth, SSL, etc.
# Edit data.conf to select which templates to load.
# Add custom templates to the template/ subdirectory.

# daemon.conf settings optimized for Docker:
# - addr=0.0.0.0 (bind all interfaces)
# - testmode=1 (auto-detected in container; override here)
# - user/group disabled (run as root in container)
