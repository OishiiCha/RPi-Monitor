package RPi::Monitor::SnmpModule;
use strict;
use warnings;
use SNMP::Extension::PassPersist;
use Scalar::Util qw(looks_like_number);
use POSIX;
use JSON;
use Data::Dumper;
use RPi::Monitor::SafeEval;

sub new
{
  my $this = bless { }, shift;
  $this->Debug(2,"");
  return $this;
}

sub Debug
{
  my $this = shift;
  my $level = shift;

  $level <= $main::loglevel or return;
  print STDERR "[", strftime("%Y/%m/%d-%H:%M:%S", localtime), "] ", "  " x ($level), (caller 1)[3], " @_\n";
}

sub GetMib()
{
    my $this = shift;
    my $configuration = shift;

    my $snmpagent = $configuration->{'snmpagent'};
    my $mib = 
      "$snmpagent->{'mibname'} DEFINITIONS ::= BEGIN\n".
      "\n".
      "IMPORTS\n".
      "OBJECT-TYPE, MODULE-IDENTITY, enterprises, Integer32 ,TimeTicks\n".
      "FROM SNMPv2-SMI\n".
      "MODULE-COMPLIANCE,OBJECT-GROUP FROM SNMPv2-CONF;\n".
      "\n".
      "rpiexperiences MODULE-IDENTITY\n".
      "LAST-UPDATED \"$snmpagent->{'lastupdate'}\"\n".
      "ORGANIZATION \"$snmpagent->{'organisation'}\"\n".
      "CONTACT-INFO \"$snmpagent->{'contactionfo'}\"\n".
      "DESCRIPTION \"$snmpagent->{'description'}\"\n".
      "REVISION \"$snmpagent->{'revision'}\"\n".
      "DESCRIPTION \"$snmpagent->{'description'}\"\n".
      "::={ enterprises $snmpagent->{'enterpriseoid'} }\n".
      "\n".
      "rpimonitor OBJECT IDENTIFIER ::= { rpiexperiences $snmpagent->{'rpimonitoroid'}}\n".
      "";

    my $snmp = $configuration->{'snmp'};
    foreach my $key (keys %{$snmp}) {
      ( my $name = $key ) =~ s/_//;
      $mib .=
        "$name OBJECT-TYPE\n".
        "SYNTAX ".$snmp->{"$key"}->{'type'}."\n".
        "MAX-ACCESS read-only \n".
        "STATUS current\n".
        "DESCRIPTION\n".
        "\"".$snmp->{"$key"}->{'description'}."\"\n".
        "::= { rpimonitor ".$snmp->{"$key"}->{'id'}." }\n".
        "\n";
    }
 
    $mib .= "END\n";

    print $mib;
}

sub UpdateTree 
{
    my ($self) = @_;
 
    sub AddOid
    {
        my $configuration = shift;
        my $var = shift;
        my $key = shift;
        
        my $snmpagent = $configuration->{'snmpagent'};
        my $snmp = $configuration->{'snmp'};
        if ( $snmp->{"$key"} ){
            my $value = $var->{$key};
            if ( $snmp->{$key}->{'postprocess'} ) {
                $value =~ /(.*)/;
                $value=RPi::Monitor::SafeEval::Postprocess( $snmp->{$key}->{'postprocess'} );
            }
            $self->add_oid_entry("$snmpagent->{'rootoid'}.".
                                  "$snmpagent->{'enterpriseoid'}.".
                                  "$snmpagent->{'rpimonitoroid'}.".
                                  $snmp->{$key}->{'id'}, 
                                  $snmp->{$key}->{'type'}, 
                                  $value);
        }
    }
 
    my $configuration = $self->{'configuration'};
    my $var = $self->{'static'};
    foreach my $key (keys %{$var}) {
        AddOid($configuration, $var, $key);
    }
    # Read dynamic data from file-based IPC (dynamic.json)
    my $dyn_file = $configuration->{'daemon'}->{'datastore'} . "/dynamic.json";
    if ( -f $dyn_file ) {
        open my $fh, '<', $dyn_file or do {
            $self->Debug(1, "Cannot open $dyn_file: $!");
            return;
        };
        local $/;
        my $json_text = <$fh>;
        close $fh;
        $var = decode_json($json_text);
        foreach my $key (keys %{$var}) {
            AddOid($configuration, $var, $key);
        }
    }
}

sub Run 
{
    my $this = shift;
    my $configuration = shift;
    my $static = shift;

    my $extsnmp = SNMP::Extension::PassPersist->new(
        backend_collect => \&UpdateTree,
        refresh         => 10,      # refresh every 10 sec
    );
    $extsnmp->{'configuration'} = $configuration;
    $extsnmp->{'static'} = $static;
    $extsnmp->run;
}

1;

__END__

=head1 NAME

RPi::Monitor::SnmpModule - SNMP agent extension for RPi-Monitor

=head1 SYNOPSIS

  use RPi::Monitor::SnmpModule;
  my $snmp = RPi::Monitor::SnmpModule->new();
  $snmp->Run($configuration, $static);

=head1 DESCRIPTION

This module implements an SNMP agent extension using
L<SNMP::Extension::PassPersist>. It exposes RPi-Monitor's collected
data as SNMP OIDs, allowing integration with network monitoring
systems like Nagios, Zabbix, or PRTG.

=head1 METHODS

=head2 new()

Creates a new SnmpModule object.

=head2 Run($configuration, $static)

Starts the SNMP pass-persist agent. Refreshes OID tree every
10 seconds from shared memory data.

=head2 GetMib($configuration)

Prints the MIB tree to stdout and exits. Used for discovery.

=head1 AUTHOR

Xavier Berger - L<https://rpi-experiences.blogspot.com/>

=cut
