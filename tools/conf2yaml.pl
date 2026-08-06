#!/usr/bin/perl
#
# conf2yaml.pl - Migrate RPi-Monitor .conf files to YAML format
#
# Usage: conf2yaml.pl <input.conf> [output.yaml]
#
# If output is not specified, writes to stdout.
# Handles include= directives by emitting YAML 'include:' entries.
# Converts dot-separated keys (e.g. daemon.port=8888) into nested YAML.
#
# Copyright 2013-2026 - Xavier Berger
# Licensed under GPL-3.0
#

use strict;
use warnings;
use YAML::XS;
use Getopt::Long;

my $help;
my $output;

GetOptions(
  'output=s' => \$output,
  'help'     => \$help,
) or die "Usage: conf2yaml.pl [--output file.yaml] <input.conf>\n";

if ( $help || !@ARGV ) {
  print STDERR "Usage: conf2yaml.pl [--output file.yaml] <input.conf>\n";
  print STDERR "  Converts RPi-Monitor .conf format to YAML.\n";
  print STDERR "  Supports include= directives and dot-separated keys.\n";
  exit 1;
}

my $input = $ARGV[0];
die "Input file not found: $input\n" unless -f $input;

# Parse the .conf file into a nested hash structure
my $config = {};
my @includes;

open my $fh, '<', $input or die "Cannot open $input: $!\n";
while ( my $line = <$fh> ) {
  chomp $line;
  $line =~ s/^\s+|\s+$//g;       # trim
  next if $line =~ /^#/ || $line eq '';  # skip comments and blanks

  # Handle include= directives
  if ( $line =~ /^include=(.+)$/ ) {
    push @includes, $1;
    next;
  }

  # Parse key=value
  if ( $line =~ /^([^=]+)=(.*)$/ ) {
    my ( $key, $value ) = ( $1, $2 );
    $key =~ s/^\s+|\s+$//g;
    $value =~ s/^\s+|\s+$//g;

    # Convert dot-separated key into nested hash
    my @parts = split /\./, $key;
    my $ref = $config;

    # Handle array indices (numeric segments)
    my $i = 0;
    while ( $i < $#parts ) {
      my $part = $parts[$i];
      my $next = $parts[$i + 1];

      if ( $next =~ /^\d+$/ ) {
        # Next part is numeric array index
        $ref->{$part} ||= [];
        $ref = $ref->{$part};
        # Move to the numeric index (0-based)
        my $idx = $next - 1;
        $ref->[$idx] ||= {};
        $ref = $ref->[$idx];
        $i += 2;
      }
      else {
        $ref->{$part} ||= {};
        $ref = $ref->{$part};
        $i++;
      }
    }

    # Last part is the value key
    if ( $i == $#parts ) {
      my $last = $parts[$i];
      # Try to convert value to appropriate type
      if ( $value =~ /^\d+$/ ) {
        $ref->{$last} = int($value);
      }
      elsif ( $value =~ /^\d+\.\d+$/ ) {
        $ref->{$last} = $value + 0;
      }
      elsif ( $value eq '' ) {
        $ref->{$last} = '';
      }
      else {
        $ref->{$last} = $value;
      }
    }
  }
}
close $fh;

# Add includes at the top level
if (@includes) {
  $config->{'include'} = \@includes;
}

# Generate YAML
my $yaml = YAML::XS::Dump($config);

if ($output) {
  open my $out, '>', $output or die "Cannot write $output: $!\n";
  print $out $yaml;
  close $out;
  print "Converted $input -> $output\n";
}
else {
  print $yaml;
}
