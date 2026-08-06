package RPi::Monitor::Server;
use strict;
use warnings;
use POSIX;
use IO::Handle;
use HTTP::Daemon;
use HTTP::Status;
use JSON -convert_blessed_universally;

sub new
{
  my $this = bless {}, shift;
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

sub SendFile
{
  my $this = shift;
  my $connection = shift;
  my $file = shift;
  $this->Debug(2,$file);

  $connection->send_file_response($file);
  $connection->close();

  return 1;
}

sub AddSecurityHeaders
{
  my $this = shift;
  my $response = shift;
  $this->Debug(4,"");

  $response->header( 'X-Content-Type-Options' => 'nosniff' );
  $response->header( 'X-Frame-Options' => 'SAMEORIGIN' );
  $response->header( 'X-XSS-Protection' => '1; mode=block' );
  $response->header( 'Referrer-Policy' => 'strict-origin-when-cross-origin' );
  $response->header( 'Content-Security-Policy' => "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'" );

  return $response;
}

sub SendJSON
{
  my $this = shift;
  my $message =shift;

  my $response = HTTP::Response->new(
      RC_OK, OK => [ 'Content-Type' => "application/json" ], $message
  );
  $response = $this->AddSecurityHeaders($response);
  $this->{'connection'}->send_response($response);
  $this->{'connection'}->close();

  return 1;
}

sub SendStatus
{
  my $this = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  my $var = $configuration->{'sharedmem'}->fetch();

  $var =~ s/\s+$//g;
  $this->Debug(3,"JSON: $var");
  $this->SendJSON($var);

  return 1;
}

sub SendRedirect
{
  my $this = shift;
  my $destination = shift;
  $this->Debug(2,$destination);

  $this->{'connection'}->send_redirect($destination, 302);
  $this->{'connection'}->close();

  return 1;
}

sub SendError
{
  my $this=shift;
  my $errorcode= shift;
  $this->Debug(2,$errorcode);

  $this->{'connection'}->send_error($errorcode);
  $this->{'connection'}->close();

  return 1;
}

sub Authenticate
{
  my $this = shift;
  my $request = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  # Skip auth if not enabled
  $configuration->{'daemon'}->{'auth'} or return 1;

  # Skip auth for static.json and dynamic.json in readonly mode
  my $path = $request->url->path;
  if ( $configuration->{'daemon'}->{'readonly'} &&
       ( $path =~ /static\.json$/ || $path =~ /dynamic\.json$/ ) ) {
    return 1;
  }

  my $auth_header = $request->header('Authorization');
  if ( !$auth_header || $auth_header !~ /^Basic\s+(.+)$/i ) {
    $this->Debug(2,"No auth header, sending 401");
    my $response = HTTP::Response->new( 401 );
    $response->header( 'WWW-Authenticate' =>
      'Basic realm="' . $configuration->{'daemon'}->{'authrealm'} . '"' );
    $this->{'connection'}->send_response($response);
    $this->{'connection'}->close();
    return 0;
  }

  require MIME::Base64;
  my $decoded = MIME::Base64::decode_base64($1);
  my ( $user, $pass ) = split( /:/, $decoded, 2 );

  if ( defined $user && defined $pass &&
       $user eq $configuration->{'daemon'}->{'authuser'} &&
       $pass eq $configuration->{'daemon'}->{'authpass'} ) {
    $this->Debug(2,"Auth successful for user: $user");
    return 1;
  }

  $this->Debug(2,"Auth failed for user: " . (defined $user ? $user : '<none>'));
  my $response = HTTP::Response->new( 401 );
  $response->header( 'WWW-Authenticate' =>
    'Basic realm="' . $configuration->{'daemon'}->{'authrealm'} . '"' );
  $this->{'connection'}->send_response($response);
  $this->{'connection'}->close();
  return 0;
}

sub DoGET
{
  my $this = shift;
  my $request = shift;
  my $configuration = shift;
  $this->Debug(2,"");

  my $connection = $this->{'connection'};
  $_ = $request->url->path;
  my $path = $_;
  $this->Debug(2, "$path");

  # Path traversal protection
  if ( $path =~ /\.\./ ) {
    $this->Debug(2, "Path traversal blocked: $path");
    $this->SendError(403);
    return;
  }

  #The file need to be known or we return an error
  my $isvalid;
  foreach(@{$this->{'paths'}}) {
    if ( $path =~ /$_$/ ){
      $isvalid=1;
      $path=$_;
      last;
    }
  }

  if( ! $configuration->{'daemon'}->{'readonly'}) {
    # Check if requested RRD exists, if not, send empty.rrd
    if ( $path =~ /\.rrd$/) {
      if ( ! -f "$configuration->{'daemon'}->{'datastore'}/$path" ) {
        $this->Debug(3, "$configuration->{'daemon'}->{'datastore'}/$path is not existing, sending empty.rrd");
        $path = '/stat/empty.rrd';
        $isvalid=1;
      }
    }

    # Check for valid addon (sanitize path components)
    if ( $path =~ /\/addons\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\.(js|html|css)/ ) {
      $path = "/addons/$1/$2.$3";
      $isvalid=1;
    }
  }

  $isvalid or $this->SendError(404);

  $path =~ /dynamic\.json/  and $this->SendStatus( $configuration ) and return;
  $path =~ /static\.json/  and $this->SendJSON($this->{'static'}) and return;
  
  if( ! $configuration->{'daemon'}->{'readonly'}) {
    $path =~ /([^\/]+)\.json/ and $this->SendJSON($this->{$1}) and return;
    
    #If requested rrd doesn't exist, return empty.rrd
    $path =~ /rrd$/ and ! -f "$configuration->{'daemon'}->{'datastore'}/$path" and $path="empty.rrd";

    #Recreate empty rrd on demand
    $path =~ /empty\.rrd/ and $configuration->CreateRRD( "$configuration->{'daemon'}->{'datastore'}/stat/empty.rrd", 'empty', 'GAUGE', 'U', 'U' );

    #The main page (/) is requested
    $path =~ /^\/$/ and $path = "/index.html";

    #Disable index page (until login screen is implemented)
    $path =~ /index\.html/ and $path =~ s/index/status/;

    #If the file exists we return it
    -f "$configuration->{'daemon'}->{'webroot'}/$path" and $this->SendFile($connection, "$configuration->{'daemon'}->{'webroot'}/$path") and return;
    -f "$configuration->{'daemon'}->{'datastore'}/$path" and $this->SendFile($connection, "$configuration->{'daemon'}->{'datastore'}/$path") and return;
  }

  $this->Debug(2,"Can't find $path");

  #Finally send error
  $this->SendError();
}

sub Run
{
  my $this = shift;
  my $configuration=shift;
  my $monitor=shift;
  $this->Debug(3,"");

  # List of files to be delivered
  my @paths = (
    "/static.json",
    "/dynamic.json"
  );
    
  if ( ! $configuration->{'daemon'}->{'readonly'} ) {
    @paths = ( @paths, (
      "/",
      "/all.json",
      "/addons.json",
      "/status.json",
      "/statistics.json",
      "/menu.json",
      "/friends.json",
      "/page.json",
      "/version.json",
      "/favicon.ico",

      "/index.html",
      "/addons.html",
      "/statistics.html",
      "/status.html",
      "/cacert.pem",
      "/certificate.p12",

      "/css/rpimonitor.css",
      "/css/bootstrap.min.css",

      "/fonts/glyphicons-halflings-regular.eot",
      "/fonts/glyphicons-halflings-regular.ttf",
      "/fonts/glyphicons-halflings-regular.svg",
      "/fonts/glyphicons-halflings-regular.woff",

      "/stat/empty.rrd",

      "/img/preloader.gif",

      "/js/rpimonitor.statistics.js",
      "/js/rpimonitor.status.js",
      "/js/rpimonitor.utils.js",
      "/js/rpimonitor.addons.js",
      "/js/rpimonitor.index.js",
      "/js/rpimonitor.js",
      "/js/jsqrencode.min.js",
      "/js/raphael.2.1.0.min.js",
      "/js/justgage.1.0.1.min.js",
      "/js/jquery.min.js",
      "/js/bootstrap.min.js",
      "/js/flot/jquery.flot.min.js",
      "/js/flot/jquery.flot.selection.min.js",
      "/js/flot/jquery.flot.tooltip.min.js",
      "/js/javascriptrrd/binaryXHR.js",
      "/js/javascriptrrd/rrdFlotMatrix.js",
      "/js/javascriptrrd/rrdFlot.js",
      "/js/javascriptrrd/rrdFilter.js",
      "/js/javascriptrrd/rrdMultiFile.js",
      "/js/javascriptrrd/rrdFile.js",
      "/js/javascriptrrd/rrdFlotSupport.js",
      "/js/Sortable.1.6.1.min.js"
    ));
  }
  $this->{'paths'} = \@paths;

  # Add rrds available and status file to the authorized pages
  foreach (glob("$configuration->{'daemon'}->{'webroot'}/img/*.png")){
    /(img\/.*\.png)$/;
    unshift ( @{$this->{'paths'}}, $1);
  }
  if ( ! $configuration->{'daemon'}->{'readonly'} ) { 
    $configuration->{'rrdlist'} and @{$this->{'paths'}} = ( @{ $configuration->{'rrdlist'}}, @{$this->{'paths'}} );
  }
  $this->{'status'} = to_json(\@{$configuration->{'web'}->{'status'}});
  $this->{'statistics'} = to_json(\@{$configuration->{'web'}->{'statistics'}});
  $this->{'friends'} = to_json(\@{$configuration->{'web'}->{'friends'}});
  $this->{'page'} = to_json(\%{$configuration->{'web'}->{'page'}});
  $monitor->{'static'}->{'alert'} = $configuration->{'alert'};
  $this->{'static'} = to_json(\%{$monitor->{'static'}});
  $this->{'menu'} = to_json(\%{$configuration->{'web'}->{'menu'}});
  $this->{'addons'} = to_json(\@{$configuration->{'web'}->{'addons'}});
  my $json = JSON->new;
  $json = $json->allow_blessed([$configuration]);
  $json = $json->convert_blessed([$configuration]);
  $this->{'all'} = $json->encode( \%{$configuration} );
  $this->{'version'} = "{\"version\":\"$configuration->{'version'}\"}";

  # Create the server
  my @server_args = (
    ReuseAddr => 1,
    Listen => SOMAXCONN,
    LocalAddr => $configuration->{'daemon'}->{'addr'},
    LocalPort => $configuration->{'daemon'}->{'port'},
  );

  if ( $configuration->{'daemon'}->{'ssl'} ) {
    require IO::Socket::SSL;
    push @server_args, (
      SSL => 1,
      SSL_cert_file => $configuration->{'daemon'}->{'sslcert'},
      SSL_key_file  => $configuration->{'daemon'}->{'sslkey'},
    );
    $this->Debug(1,"SSL enabled with cert: $configuration->{'daemon'}->{'sslcert'}");
  }

  $this->{'server'} = new HTTP::Daemon( @server_args )
    or die "Web server not started because of error: $!\n";

  $this->Debug(1,"< URL:", $this->{'server'}->url, ">");

  setgid($configuration->{'daemon'}->{'gid'});
  setuid($configuration->{'daemon'}->{'uid'});

  # Rate limiting state: { ip => { count => N, window_start => timestamp } }
  my %rate_limits;
  my $RATE_LIMIT = 60;       # max requests per minute
  my $RATE_WINDOW = 60;      # window in seconds

  #Process requests
  for (;;){
    while ( $this->{'connection'} = $this->{'server'}->accept) {
      while (my $request = $this->{'connection'}->get_request) {
        # Rate limiting
        my $client_ip = $this->{'connection'}->peerhost() || 'unknown';
        my $now = time();
        if ( !exists $rate_limits{$client_ip} ||
             $now - $rate_limits{$client_ip}->{'window_start'} > $RATE_WINDOW ) {
          $rate_limits{$client_ip} = { count => 0, window_start => $now };
        }
        $rate_limits{$client_ip}->{'count'}++;
        if ( $rate_limits{$client_ip}->{'count'} > $RATE_LIMIT ) {
          $this->Debug(2, "Rate limit exceeded for $client_ip");
          $this->SendError(429);
          next;
        }

        $this->Authenticate($request, $configuration) or next;
        my $method = "Do".$request->method();
        $this->can($method) and $this->$method($request,$configuration);
      }
      $this->{'connection'}->close;
      undef($this->{'connection'});
    }
  }
  $this->Debug(1,"Server stopped");

  $this->{'server'}->close();
}

1;
