requires 'perl', '5.10.1';
requires 'Mojolicious';
requires 'YAML::XS';

# Note: RRDs is provided by librrds-perl (system package), not CPAN
# Note: JSON is provided by libjson-perl (system package)
# Note: File::Which is provided by libfile-which-perl (system package)
# Note: POSIX, Cwd, Data::Dumper, Sys::Hostname, File::Basename,
#       Scalar::Util, MIME::Base64 are Perl core modules

# Optional dependencies for SSL/TLS support
recommends 'IO::Socket::SSL';

# Optional dependencies for SNMP support
recommends 'SNMP::Extension::PassPersist';

on 'test' => sub {
    requires 'Test::More';
    requires 'Test::Harness';
};
