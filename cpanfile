requires 'perl', '5.10.1';
requires 'Mojolicious';
requires 'JSON';
requires 'File::Which';
requires 'YAML::XS';
requires 'IO::Socket::SSL';

# Note: RRDs is provided by librrds-perl (system package), not CPAN.
# In Docker, the RRDs .pm and .so are copied from the system Perl path
# into the container Perl's @INC (see Dockerfile).
# Note: POSIX, Cwd, Data::Dumper, Sys::Hostname, File::Basename,
#       Scalar::Util, MIME::Base64 are Perl core modules.

# Optional dependencies for SNMP support
recommends 'SNMP::Extension::PassPersist';

on 'test' => sub {
    requires 'Test::More';
    requires 'Test::Harness';
};
