package RPi::Monitor::Configuration;
use strict;
use warnings;
use POSIX;
use Cwd 'abs_path';
use Data::Dumper;
use RRDs;
use IPC::ShareLite;

our $VERSION = "{DEVELOPMENT}";

sub new
{
  my $this = bless { }, shift;
  $this->Debug(2,"");
  $this->{'rrd'}=();
  $this->{'daemon'}->{'confFiles'} = [];
  return $this;
}

sub Debug
{
  my $this = shift;
  my $level = shift;

  $level <= $main::loglevel or return;
  print STDERR "[", strftime("%Y/%m/%d-%H:%M:%S", localtime), "] ", "  " x ($level), (caller 1)[3], " @_\n";
}

sub GreatestCommonDivisor
{
  my $this=shift;
  my $a = shift;
  my $b = shift;
  my $A = $a;
  my $B = $b;
  while ( $a != $b ){
    if ( $a < $b ) {
      $a += $A;
    }
    else {
     $b += $B;
    }
  }
  return $a;
}

sub Load
{
  my $this = shift;
  $this->Debug(2,"");

  $_ = abs_path($0);
  my ($path,$file) = /(.*)\/([^\/]*)$/;

  # Add default configuration file if not already defined by command line
  if ( !@{$this->{'daemon'}->{'confFiles'}} ) {
    push(@{$this->{'daemon'}->{'confFiles'}},"/etc/rpimonitor/data.conf");
    push(@{$this->{'daemon'}->{'confFiles'}},"/etc/rpimonitor/daemon.conf");
  }

  foreach ( @{$this->{'daemon'}->{'confFiles'}} ) {
    $this->LoadFile($_);
  }
  delete($this->{'daemon'}->{'confFiles'});

  # Set version (used by web pages cache mechanism)
  $this->{'version'} = localtime();

  # Load default values is not defined yet defined
  $this->{'daemon'}->{'user'}            ||= "pi";
  $this->{'daemon'}->{'group'}           ||= "pi";
  $this->{'daemon'}->{'noserver'}        ||= 0;
  $this->{'daemon'}->{'port'}            ||= 8888;
  $this->{'daemon'}->{'addr'}            ||= '0.0.0.0';
  $this->{'daemon'}->{'webroot'}         ||= "/usr/share/rpimonitor/web";
  $this->{'daemon'}->{'datastore'}       ||= "/var/lib/rpimonitor";
  $this->{'daemon'}->{'delay'}           ||= 10;
  $this->{'daemon'}->{'defaultinterval'} ||= 1;
  $this->{'daemon'}->{'readonly'}        ||= 0;
  $this->{'daemon'}->{'timeout'}         ||= 5;
  $this->{'daemon'}->{'sharedmemkey'}    ||= 20130906;
  $this->{'daemon'}->{'loglevel'}        ||= 0;
  $this->{'daemon'}->{'auth'}            ||= 0;
  $this->{'daemon'}->{'authuser'}        ||= "admin";
  $this->{'daemon'}->{'authpass'}        ||= "";
  $this->{'daemon'}->{'authrealm'}       ||= "RPi-Monitor";
  $this->{'daemon'}->{'ssl'}             ||= 0;
  $this->{'daemon'}->{'sslcert'}         ||= "/etc/rpimonitor/cert.pem";
  $this->{'daemon'}->{'sslkey'}          ||= "/etc/rpimonitor/key.pem";
  $main::loglevel ||= $this->{'daemon'}->{'loglevel'};

  # Check user and group
  $this->{'daemon'}->{'gid'} = getgrnam($this->{'daemon'}->{'group'})  || 1000;
  $this->{'daemon'}->{'uid'} = getpwnam($this->{'daemon'}->{'user'}) || 1000;

  if ( ! $this->{'daemon'}->{'readonly'} ){
    # Check rrd directory and files and create them if they are missing
    # Create storage directory if needed
    -d "$this->{'daemon'}->{'datastore'}/stat" or mkdir "$this->{'daemon'}->{'datastore'}/stat";
    # Create empty file at each start
    $this->CreateRRD( "$this->{'daemon'}->{'datastore'}/stat/empty.rrd", 'empty', 'GAUGE', 'U', 'U' );
    chown($this->{'daemon'}->{'uid'},$this->{'daemon'}->{'gid'},"$this->{'daemon'}->{'datastore'}/stat/empty.rrd");
  }

  # Load default values is not defined yet defined
  $this->{'snmpagent'}->{'rootoid'}        ||= ".1.3.6.1.4.1";
  $this->{'snmpagent'}->{'enterpriseoid'}  ||= 54321;
  $this->{'snmpagent'}->{'rpimonitoroid'}  ||= 42;
  $this->{'snmpagent'}->{'mibname'}        ||= "RPIMONITOR-MIB";
  $this->{'snmpagent'}->{'lastupdate'}     ||= "201802030000Z";
  $this->{'snmpagent'}->{'moduleidentity'} ||= "rpi-experiences";
  $this->{'snmpagent'}->{'organisation'}   ||= "RPi-Monitor";
  $this->{'snmpagent'}->{'contactionfo'}   ||= "http://rpi-experiences.blogspot.fr/";
  $this->{'snmpagent'}->{'description'}    ||= "description";
  $this->{'snmpagent'}->{'revision'}       ||= "201802030000Z";

  if ( ! $this->{'daemon'}->{'readonly'} ){
    # manage rrds
    foreach (@{$this->{'rrd'}}){
      my @name = split (',',$_->{'name'});
      my $type = $_->{'rrd'};
      my $min = defined($_->{'min'}) ? $_->{'min'} : "U";
      my $max = defined($_->{'max'}) ? $_->{'max'} : "U";
      foreach (@name) {
        my $filename="$this->{'daemon'}->{'datastore'}/stat/$_.rrd";
        -f "$filename" or $this->CreateRRD($filename,$_,$type,$min,$max);
        push(@{$this->{'rrdlist'}},"stat/$_.rrd");
      }
    }
  }

  # manage page header default parameters
  $this->{'web'}->{'page'}->{'icon'}       ||= "img/logo.png";
  $this->{'web'}->{'page'}->{'menutitle'}  ||= "'RPi-Monitor  <sub>('+data.hostname+')</sub>'";
  $this->{'web'}->{'page'}->{'pagetitle'}  ||= "'RPi-Monitor ('+data.hostname+')'";

  # manage menu
  foreach (@{$this->{'web'}->{'status'}}) {
    $_->{'title'} and push(@{$this->{'web'}->{'menu'}->{'status'}}, $_->{'title'})
                  or  push(@{$this->{'web'}->{'menu'}->{'status'}}, "Status");
  }
  foreach (@{$this->{'web'}->{'statistics'}}) {
    $_->{'title'} and push(@{$this->{'web'}->{'menu'}->{'statistics'}}, $_->{'title'})
                  or  push(@{$this->{'web'}->{'menu'}->{'statistics'}}, "Statistics");
  }
  foreach (@{$this->{'web'}->{'addons'}}) {
    $_->{'title'} and push(@{$this->{'web'}->{'menu'}->{'addons'}}, $_->{'title'});
  }

  # manage default value for dynamic data
  $this->{'maxinterval'} = 1;
  foreach (@{$this->{'dynamic'}}) {
    $_->{'interval'} ||= $this->{'daemon'}->{'defaultinterval'};
    if ($_->{'interval'} > $this->{'maxinterval'} ) {
      $this->{'maxinterval'} = $this->GreatestCommonDivisor($this->{'maxinterval'}, $_->{'interval'});
    }
  }

  if ( $this->{'show'} ) {
    $Data::Dumper::Indent = 1;
    print Data::Dumper->Dump([$this]);
    die "loglevel = $main::loglevel\n";
  }

  $this->{'sharedmem'} = IPC::ShareLite->new(
        -key     => $this->{'daemon'}->{'sharedmemkey'},
        -create  => 'yes',
        -destroy => 'no'
    ) or die $!;
}

sub LoadFile
{
  my $this = shift;
  my $confFile = shift;
  my @dict;
  $this->Debug(3,"Loading file: $confFile");

  open (FILE, $confFile)
    or die "Error while openning configuration file \"$confFile\" because $!\n";
  while (<FILE>){
    chomp;
    /^\s*#|^$/ and next;                 # Ignore comments
    /^include=(.*)/ and -f $1 and push(@{$this->{'daemon'}->{'confFiles'}}, $1) and next;
    my ($key, $value) = /^([^=]*)=(.*)/; # Extract key and value
    my @leaves=split('\.', $key);        # Explode key and construct config hash
    my $tree=$this;
    my $previous;
    my $current;
    my $next;
    my $root;
    my $page = 0;                         # page = 0 for static and dynamic
    while (scalar(@leaves) > 0) {         # While @leaves contains data
      $current ||= shift (@leaves);       # If root is empty, shift the first element of @leaves to $current
      $root ||= $current;
      if ( ( $root eq 'alert' ) || ( $root eq 'web' ) ) { $root = $current }
      $next = shift (@leaves);            # Shift the first element of @leaves in $next
      if ( $next =~ /^\d+$/ ) {           # If $next is an integer -> we are in an array
        if ($current =~ /^\d+$/) {        # If $current is an integer -> we are in an array
          @{$tree}[$current-1] ||= [];    # If the branch is not an array, create an empty array
          $tree=@{$tree}[$current-1];     # Define this array as $tree root
        }
        else {
          $tree->{$current} ||= [];       # If the branch is not an array, create an empty array
          $tree=$tree->{$current};        # Define this array as $tree root
        }
      } else {                            # If $next is not an integer -> We are in a hash
        if ($current =~ /^\d+$/) {        # If $current is an integer -> we are in an array
          my $index = $current;

          if ( ($previous eq 'status' )    ||
               ($previous eq 'statistics' ) )
          {
            $page=$current;
          }
          # Manage per file indexes unicity
          if ( ($root eq "addons")            ||
               ($root eq "static")            ||
               ($root eq "dynamic")           ||
               ( ( ($root eq 'status' )       ||
                   ($root eq 'statistics' ) ) &&
                 ($previous eq "content") ) )
          {
            # If $index is not in $dict, add it with counter++
            if ( ! $dict[$page]->{$root}[$current] )
            {
              $dict[$page]->{$root}[$current] = ++$this->{'counter'}[$page]->{$root};
            }
            $index = $dict[$page]->{$root}[$current];
          }

          @{$tree}[$index-1] ||= {};      # If the branch is not an array, create an empty hash
          $tree=@{$tree}[$index-1];       # Define this hash as $tree root
        }
        else {                            # We are in a hash
          $tree->{$current} ||= {};       # If the branch is not an array, create an empty hash
          $tree=$tree->{$current};        # Define this hash as $tree root
        }
      }
      if ( ($next eq 'rrd') and $value) { push(@{$this->{'rrd'}},$tree) };
      $previous = $current;
      $current = $next;
    }

    # Add value
    if ($current =~ /^\d+$/) {
      @{$tree}[$current-1] = $value;
    }
    else {
      $tree->{$current} = $value;
    }
  }
}

sub CreateRRD
{
  my $this = shift;
  my $filename = shift;
  my $name = shift;
  my $type = shift;
  my $min = shift;
  my $max = shift;
  $this->Debug(3,"$filename - $name - $type - $min < value < $max");

  my $current = time();
  my $start = $current - 60;

  unlink $filename;

  $this->Debug(4,"$filename",
                "--start", $start,
                "--step", $this->{'daemon'}->{'delay'},
                "DS:$name:$type:600:$min:$max",
                "RRA:AVERAGE:0.5:1:8640",    # 1 day with interval of 10sec
                "RRA:AVERAGE:0.5:6:2880",    # 2 day with interval of 1min
                "RRA:AVERAGE:0.5:60:2016",   # 2 week with interval of 10min
                "RRA:AVERAGE:0.5:180:1488",  # 1 mounth with interval of 30min
                "RRA:AVERAGE:0.5:360:8784"   # 1 year with interval of 1hour
                );

  RRDs::create( "$filename",
                "--start", $start,
                "--step", $this->{'daemon'}->{'delay'},
                "DS:$name:$type:600:$min:$max",
                "RRA:AVERAGE:0.5:1:8640",    # 1 day with interval of 10sec
                "RRA:AVERAGE:0.5:6:2880",    # 2 day with interval of 1min
                "RRA:AVERAGE:0.5:60:2016",   # 2 week with interval of 10min
                "RRA:AVERAGE:0.5:180:1488",  # 1 mounth with interval of 30min
                "RRA:AVERAGE:0.5:360:8784"   # 1 year with interval of 1hour
                );
}

1;
