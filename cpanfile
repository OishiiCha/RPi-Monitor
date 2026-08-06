requires 'perl', '5.10.1';
requires 'IPC::ShareLite';
requires 'HTTP::Daemon';
requires 'HTTP::Status';
requires 'HTTP::Response';
requires 'JSON';
requires 'RRDs';
requires 'Scalar::Util';
requires 'File::Which';
requires 'POSIX';
requires 'Cwd';
requires 'Data::Dumper';
requires 'IO::Handle';
requires 'Sys::Hostname';
requires 'File::Basename';
requires 'MIME::Base64';

# Optional dependencies for SSL/TLS support
recommends 'IO::Socket::SSL';

# Optional dependencies for SNMP support
recommends 'SNMP::Extension::PassPersist';

on 'test' => sub {
    requires 'Test::More';
    requires 'Test::Harness';
};
