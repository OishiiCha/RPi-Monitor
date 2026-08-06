package RPi::Monitor::Monitor;
use strict;
use warnings;
use POSIX;
use RRDs;
use JSON;
use Scalar::Util qw(looks_like_number);
use File::Which;
use RPi::Monitor::SafeEval;

sub new
{
  my $this = bless { }, shift;
  $this->Debug(2,"");
  @{$this->{'files'}} = ("static.json","status.json","statistics.json");
  $this->{'counter'} = 0;
  return $this;
}

sub Debug
{
  my $this = shift;
  my $level = shift;

  $level <= $main::loglevel or return;
  print STDERR "[", strftime("%Y/%m/%d-%H:%M:%S", localtime), "] ", "  " x ($level), (caller 1)[3], " @_\n";
}

eval 'sub IPC_CREAT {0001000}' unless defined &IPC_CREAT;
eval 'sub IPC_RMID {0}'        unless defined &IPC_RMID;

sub DetectPlatform
{
  my $this = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  # If daemon.testmode is explicitly set in config, honor it
  if ( defined $configuration->{'daemon'}->{'testmode'} ) {
    $this->{'static'}->{'testmode'} = $configuration->{'daemon'}->{'testmode'};
    $this->Debug(2, "Test mode forced by config: " . $this->{'static'}->{'testmode'});
    return;
  }

  # Auto-detect: check if running on a Raspberry Pi
  my $is_rpi = 0;

  # Check /proc/device-tree/model (present on RPi with device tree)
  if ( -f "/proc/device-tree/model" ) {
    open(my $fh, "<", "/proc/device-tree/model") or do {
      $this->{'static'}->{'testmode'} = 1;
      return;
    };
    local $/;
    my $model = <$fh>;
    close($fh);
    if ( $model =~ /Raspberry Pi/i ) {
      $is_rpi = 1;
    }
  }

  # Fallback: check /proc/cpuinfo for RPi hardware
  if ( !$is_rpi && -f "/proc/cpuinfo" ) {
    open(my $fh, "<", "/proc/cpuinfo") or do {
      $this->{'static'}->{'testmode'} = 1;
      return;
    };
    while ( <$fh> ) {
      if ( /Raspberry Pi/i || /BCM2708/i || /BCM2709/i || /BCM2710/i || /BCM2711/i || /BCM2712/i ) {
        $is_rpi = 1;
        last;
      }
    }
    close($fh);
  }

  $this->{'static'}->{'testmode'} = $is_rpi ? 0 : 1;
  $this->Debug(2, "Auto-detected RPi: $is_rpi, testmode: " . $this->{'static'}->{'testmode'});
}

sub Run
{
  # start main loop
  my $this = shift;
  my $configuration = shift;
  my $serverpid = shift;
  $this->Debug(2,"");

  if ($configuration->{'daemon'}->{'noserver'}) {
    if (! $configuration->{'daemon'}->{'readonly'}) {
      # write json if server is not running
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/static.json")
        or warn $!;
        print FILE to_json \%{$this->{'static'}} ;
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/status.json")
        or warn $!;
        print FILE to_json \@{$configuration->{'web'}->{'status'}} ;
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/page.json")
        or warn $!;
        print FILE to_json \%{$configuration->{'web'}->{'page'}} ;
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/statistics.json")
        or warn $!;
        print FILE to_json \@{$configuration->{'web'}->{'statistics'}} ;
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/friends.json")
        or warn $!;
        print FILE to_json(\@{$configuration->{'web'}->{'friends'}});
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/menu.json")
        or warn $!;
        print FILE to_json(\%{$configuration->{'web'}->{'menu'}});
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/addons.json")
        or warn $!;
        print FILE to_json(\@{$configuration->{'web'}->{'addons'}});
      close(FILE);
      open(FILE, "> $configuration->{'daemon'}->{'webroot'}/version.json")
        or warn $!;
        print FILE  "{\"version\":\"$configuration->{'version'}\"}";
      close(FILE);
    }
  }

  $this->{'counter'} = $configuration->{'maxinterval'}-1;
  for(;;)
  {
    # count loops
    $this->{'counter'}++;

    # Process data
    $this->Process($configuration,'dynamic');

    # Check alerts
    $this->Alert($configuration);

    # Store and show extracted data
    $this->Status($configuration);

    if ($this->{'counter'} >= $configuration->{'maxinterval'}){
      $this->{'counter'} = 0;
    }

    # Check if server is up
    if ( !$configuration->{'daemon'}->{'noserver'}) {
      kill(0,$serverpid) or last;
    }

    # tempo before next process
    $configuration->{'daemon'}->{'delay'} or last;
    sleep $configuration->{'daemon'}->{'delay'};
  }
  foreach (@{$this->{'files'}}) {
    -f "$configuration->{'daemon'}->{'datastore'}/$_"
      and unlink "$configuration->{'daemon'}->{'datastore'}/$_";
  }
}

sub ParseCommand
{
  my $this = shift;
  my $configuration = shift;
  my $file = shift;
  $this->Debug(2,"Parsing command '$file'");
  $_ = $file;

  while ( /data\.alert\.(\w+)\.(\w+)/ ) {
    my $data = $configuration->{'alert'}->{$1}->{$2};
    $data = defined $data ? $data :  $this->{'dynamic'}->{'alert'}->{$1}->{$2};
    $file =~ s/data\.alert\.$1\.$2/$data/;
    $_ = $file;
  }
  while ( /data\.(\w+)/ ) {
    my $data = $this->{'dynamic'}->{$1};
    $data = defined $data ? $data : $this->{'static'}->{$1};
    $file =~ s/data\.$1/$data/;
    $_ = $file;
  }

  $this->Debug(3,"Parsed command '$_'");

  return $_;
}

sub Process
{
  my $this = shift;
  my $configuration = shift;
  my $list = shift;
  $this->Debug(2,"Processing $list");

  foreach my $kpi ( @{$configuration->{$list}} ) {
    $kpi or next;
    if ( $list =~ /dynamic/) {
      $this->{'counter'} % $kpi->{'interval'} and next;
    }
    # if file is executable, execute it and process output else, read file content
    my $file = $kpi->{'source'};
    $file =~ /^(\S+)/;
    if ( (-x $1) || ( which($1) ) ) {
      $file = "$file 2>/dev/null |";
      $_ = $kpi->{'source'};
      $file = $this->ParseCommand($configuration,$file);
    }

    $this->Debug(4,"Opening '$file'");
    my $pid = 0;
    eval {
      local $SIG{ALRM} = sub { die "Timeout\n" };
      alarm $configuration->{'daemon'}->{'timeout'};

      # Extract dynamic data
      my @values;
      $pid = open(FEED, $file);
      while (<FEED>){
        /$kpi->{'regexp'}/ and (@values = /$kpi->{'regexp'}/) or next;
      }
      close(FEED);
      alarm 0;
      $pid = 0;

      # Store dynamic data
      my $i=0;
      my @postprocess = split(',',$kpi->{'postprocess'});
      my @default = split(',',$kpi->{'default'} );
      my @names = split(',',$kpi->{'name'});
      foreach ( @names ) {
        my $val = $values[$i];
        # Post process
        if ( defined($val) ) {
          if ( $postprocess[$i] ) {
            $val =~ /(.*)/;
            $val = RPi::Monitor::SafeEval::Postprocess( $postprocess[$i] );
          }
        }
        else {
          # Set default value is no data is present
          $val = $default[$i];
        }
        $this->{$list}->{$names[$i]}=$val;
        $i++;
      }
    };
    $pid and kill( 9, $pid);
  }
}

sub SendAlarm
{
  my $this = shift;
  my $configuration = shift;
  my $commandline = shift;
  $this->Debug(2,"");

  $commandline = $this->ParseCommand($configuration, $commandline);

  $this->Debug(4,"Executing command: $commandline");
  my $pid = 0;
  eval {
    local $SIG{ALRM} = sub { die "Timeout\n" };
    alarm $configuration->{'daemon'}->{'timeout'};
    $pid = open(CMD, "$commandline |") or die "Can't execute $commandline because $!\n";
    close(CMD);
    alarm 0;
    $pid = 0;
  };
  $pid and kill( 9, $pid);
}

sub Status
{
  my $this = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  $this->{'dynamic'} or return;

  my ($sec,$min,$hour,$mday,$mon,$year) = (localtime)[0,1,2,3,4,5];
  @{$this->{'dynamic'}->{'localtime'}}=($year+1900,$mon+1,$mday,$hour,$min,$sec);

  my $json=to_json \%{$this->{'dynamic'}};

  $this->Debug(4,"\n$json");

  # write current status (JSON) in shared memory
  $configuration->{'sharedmem'}->store( $json );

  # If embeded server is not used and not readonly, write the json file on disk
  if ( ( $configuration->{'daemon'}->{'noserver'} ) 
    && ( ! $configuration->{'daemon'}->{'readonly'} ) ){
    push (@{$this->{'files'}},"dynamic.json");
    open(FILE, "> $configuration->{'daemon'}->{'webroot'}/dynamic.json")
      or warn $!;
      print FILE $json ;
    close(FILE);
  }

  if ( ! $configuration->{'daemon'}->{'readonly'} ){
    # add data in round robin database
    foreach (@{$configuration->{'rrd'}}){
      foreach my $name ( split(',',$_->{'name'}) ) {
        if ( looks_like_number( $this->{'dynamic'}->{$name} ) ) {
          RRDs::update("$configuration->{'daemon'}->{'datastore'}/stat/$name.rrd", "N:".$this->{'dynamic'}->{$name});
        }
        else {
          RRDs::update("$configuration->{'daemon'}->{'datastore'}/stat/$name.rrd", "N:U");
        }
      }
    }
  }
}

sub Alert
{
  my $this = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  while( my ( $alertname, $alertconf) = each %{$configuration->{'alert'}} ) {
      defined ($alertconf->{'active'}) or  $alertconf->{'active'}= 1;
      RPi::Monitor::SafeEval::Compare($this->ParseCommand($configuration,$alertconf->{'active'})) or next;

      $this->{'dynamic'}->{'alert'}->{$alertname} ||= {};
      my $alert = $this->{'dynamic'}->{'alert'}->{$alertname};
      $alert->{'currentalertdate'}  ||= 0;
      $alert->{'alertstate'}        ||= 0;
      $alert->{'lastsendalertdate'} ||= 0;
      $alert->{'currentcanceldate'} ||= 0;

      # Check the state of the alert
      if ( RPi::Monitor::SafeEval::Compare( $this->ParseCommand($configuration,$alertconf->{'trigger'}) ) ){
        # Alert is active
        # If the state changed, remember the date of change
        if ( $alert->{'alertstate'} != 1 ) {                                              # Previous alert state was OK
          $alert->{'currentalertdate'} = time;                                            # Remember when alert occurs
          $alert->{'alertstate'} = 1;                                                     # Current alert state is alert
          $this->Debug(3,"Alert just raised for '$alertname' : $this->{'dynamic'}->{$alertconf->{'kpi'}}$alertconf->{'comparator'}$alertconf->{'limit'}");
        }
        # Alert state exceed max duration: Houston, we have a problem
        if ( time > $alert->{'currentalertdate'} + $alertconf->{'maxalertduration'}){     # Alert duration exceed max duration
          if ( time > $alert->{'lastsendalertdate'} + $alertconf->{'resendperiod'}){      # Shall we send and alert?
            $this->Debug(3,"Sending alert command for '$alertname'");
            $this->SendAlarm($configuration,$alertconf->{'raisecommand'});
            $alert->{'lastsendalertdate'}=time;                                           # When lastsendalertdate is set, an alert is on going
          }
        }
      }
      else {
        # Alert is not active
        if ( $alert->{'alertstate'} != 0 ) {                                              # Previous alert state was 1:  KO
          $alert->{'currentcanceldate'} = time;                                           # Remerber when cancel occurs
          $alert->{'alertstate'} = 0;                                                     # Current alert state is 0: OK
          $this->Debug(3,"Alert just cancelled for '$alertname' : $this->{'dynamic'}->{$alertconf->{'kpi'}}$alertconf->{'comparator'}$alertconf->{'limit'}");
        }
        # If alert was active (lastsendalertdate !=0) and now, inactive duration exceed validation time
        if ( ( $alert->{'lastsendalertdate'} != 0) &&                                     # lastsendalertdate is set, an alert is on going
             ( time > $alert->{'currentcanceldate'} + $alertconf->{'cancelvalidation'})){ # Cancel duration is long enough
          $this->Debug(3,"Sending cancel command for '$alertname'");
          $this->SendAlarm($configuration,$alertconf->{'cancelcommand'});
          $alert->{'lastsendalertdate'} = 0;                                              # No more ongoing alert, reset times
          $alert->{'currentalertdate'}  = 0;
          $alert->{'currentcanceldate'} = 0;
        }
      }
  }
}

1;
