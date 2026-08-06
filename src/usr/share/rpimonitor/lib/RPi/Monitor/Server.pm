package RPi::Monitor::Server;
use strict;
use warnings;
use POSIX;
use Mojolicious;
use Mojo::Server::Daemon;
use Mojo::IOLoop;
use JSON -convert_blessed_universally;
use RRDs;

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

sub _read_dynamic
{
  my $this = shift;
  my $configuration = shift;
  $this->Debug(3,"");

  my $file = "$configuration->{'daemon'}->{'datastore'}/dynamic.json";
  if ( -f $file ) {
    open my $fh, '<', $file or return '{}';
    local $/;
    my $json = <$fh>;
    close $fh;
    $json =~ s/\s+$//g;
    return $json;
  }
  return '{}';
}

sub _read_rrd_as_json
{
  my $this = shift;
  my $configuration = shift;
  my $name = shift;
  $this->Debug(2, $name);

  my $file = "$configuration->{'daemon'}->{'datastore'}/stat/$name.rrd";
  if ( !-f $file ) {
    $file = "$configuration->{'daemon'}->{'datastore'}/stat/empty.rrd";
    if ( !-f $file ) {
      $configuration->CreateRRD($file, 'empty', 'GAUGE', 'U', 'U');
    }
  }

  my $rra_index = $configuration->{'daemon'}->{'default_rra'} || 0;

  my ($rra, $ds_names, $data) = RRDs::fetch($file, "AVERAGE", "--rra", $rra_index);
  my $err = RRDs::error;
  if ( $err ) {
    $this->Debug(1, "RRD fetch error: $err");
    return '{"error":"RRD fetch failed"}';
  }

  my @series;
  for my $i ( 0 .. $#$ds_names ) {
    my @points;
    for my $row ( 0 .. $#$data ) {
      my $ts = $rra->[$row];
      my $val = $data->[$row][$i];
      next unless defined $val;
      push @points, [ $ts, $val + 0 ];
    }
    push @series, { name => $ds_names->[$i], data => \@points };
  }

  return to_json({ series => \@series });
}

sub Run
{
  my $this = shift;
  my $configuration = shift;
  my $monitor = shift;
  $this->Debug(3,"");

  # Prepare JSON data for endpoints
  $this->{'status'}     = to_json(\@{$configuration->{'web'}->{'status'}});
  $this->{'statistics'} = to_json(\@{$configuration->{'web'}->{'statistics'}});
  $this->{'friends'}    = to_json(\@{$configuration->{'web'}->{'friends'}});
  $this->{'page'}       = to_json(\%{$configuration->{'web'}->{'page'}});
  $monitor->{'static'}->{'alert'} = $configuration->{'alert'};
  $this->{'static'}     = to_json(\%{$monitor->{'static'}});
  $this->{'menu'}       = to_json(\%{$configuration->{'web'}->{'menu'}});
  $this->{'addons'}     = to_json(\@{$configuration->{'web'}->{'addons'}});
  my $json = JSON->new;
  $json = $json->allow_blessed([$configuration]);
  $json = $json->convert_blessed([$configuration]);
  $this->{'all'}        = $json->encode( \%{$configuration} );
  $this->{'version'}    = "{\"version\":\"$configuration->{'version'}\"}";

  my $webroot   = $configuration->{'daemon'}->{'webroot'};
  my $datastore = $configuration->{'daemon'}->{'datastore'};
  my $readonly  = $configuration->{'daemon'}->{'readonly'};
  my $delay     = $configuration->{'daemon'}->{'delay'} || 10;

  # Create Mojolicious app
  my $app = Mojolicious->new;
  $app->static->paths([$webroot]);
  $app->log->level( $main::loglevel >= 4 ? 'debug' : $main::loglevel >= 2 ? 'info' : 'warn' );

  # Security headers hook
  $app->hook(after_render => sub {
    my ($c, $output, $format) = @_;
    $c->res->headers->header('X-Content-Type-Options' => 'nosniff');
    $c->res->headers->header('X-Frame-Options' => 'SAMEORIGIN');
    $c->res->headers->header('X-XSS-Protection' => '1; mode=block');
    $c->res->headers->header('Referrer-Policy' => 'strict-origin-when-cross-origin');
    $c->res->headers->header('Content-Security-Policy' =>
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:");
  });

  # Rate limiting state
  my %rate_limits;
  my $RATE_LIMIT  = 60;
  my $RATE_WINDOW = 60;

  # Auth + rate limiting hook
  $app->hook(before_dispatch => sub {
    my $c = shift;
    my $path = $c->req->url->path;

    # Rate limiting
    my $client_ip = $c->tx->remote_address || 'unknown';
    my $now = time();
    if ( !exists $rate_limits{$client_ip} ||
         $now - $rate_limits{$client_ip}->{'window_start'} > $RATE_WINDOW ) {
      $rate_limits{$client_ip} = { count => 0, window_start => $now };
    }
    $rate_limits{$client_ip}->{'count'}++;
    if ( $rate_limits{$client_ip}->{'count'} > $RATE_LIMIT ) {
      $this->Debug(2, "Rate limit exceeded for $client_ip");
      $c->render(status => 429, text => 'Too Many Requests');
      return;
    }

    # Auth
    if ( $configuration->{'daemon'}->{'auth'} ) {
      # Skip auth for static.json and dynamic.json in readonly mode
      unless ( $readonly && ( $path =~ /static\.json$/ || $path =~ /dynamic\.json$/ ) ) {
        my $auth_header = $c->req->headers->authorization;
        if ( !$auth_header || $auth_header !~ /^Basic\s+(.+)$/i ) {
          $c->res->headers->www_authenticate(
            'Basic realm="' . $configuration->{'daemon'}->{'authrealm'} . '"'
          );
          $c->render(status => 401, text => 'Authentication required');
          return;
        }
        require MIME::Base64;
        my $decoded = MIME::Base64::decode_base64($1);
        my ($user, $pass) = split(/:/, $decoded, 2);
        unless ( defined $user && defined $pass &&
                 $user eq $configuration->{'daemon'}->{'authuser'} &&
                 $pass eq $configuration->{'daemon'}->{'authpass'} ) {
          $c->res->headers->www_authenticate(
            'Basic realm="' . $configuration->{'daemon'}->{'authrealm'} . '"'
          );
          $c->render(status => 401, text => 'Authentication failed');
          return;
        }
      }
    }
  });

  my $r = $app->routes;

  # JSON endpoints (always available)
  $r->get('/static.json' => sub {
    my $c = shift;
    $c->render(text => $this->{'static'}, format => 'json');
  });

  $r->get('/dynamic.json' => sub {
    my $c = shift;
    my $json = $this->_read_dynamic($configuration);
    $c->render(text => $json, format => 'json');
  });

  unless ( $readonly ) {
    # JSON config endpoints
    $r->get('/all.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'all'}, format => 'json');
    });
    $r->get('/status.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'status'}, format => 'json');
    });
    $r->get('/statistics.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'statistics'}, format => 'json');
    });
    $r->get('/addons.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'addons'}, format => 'json');
    });
    $r->get('/friends.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'friends'}, format => 'json');
    });
    $r->get('/menu.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'menu'}, format => 'json');
    });
    $r->get('/page.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'page'}, format => 'json');
    });
    $r->get('/version.json' => sub {
      my $c = shift;
      $c->render(text => $this->{'version'}, format => 'json');
    });

    # Main page redirect
    $r->get('/' => sub {
      my $c = shift;
      $c->redirect_to('/status.html');
    });

    # RRD files from datastore (binary, for backward compat)
    $r->get('/stat/:name.rrd' => [name => qr/[a-zA-Z0-9_-]+/] => sub {
      my $c = shift;
      my $name = $c->stash('name');
      my $file = "$datastore/stat/$name.rrd";
      if ( !-f $file ) {
        $file = "$datastore/stat/empty.rrd";
        $configuration->CreateRRD("$datastore/stat/empty.rrd", 'empty', 'GAUGE', 'U', 'U');
      }
      $c->reply->file($file);
    });

    # RRD data as JSON (replaces binary RRD + javascriptrrd frontend)
    $r->get('/stat/:name.json' => [name => qr/[a-zA-Z0-9_-]+/] => sub {
      my $c = shift;
      my $name = $c->stash('name');
      my $json = $this->_read_rrd_as_json($configuration, $name);
      $c->render(text => $json, format => 'json');
    });

    # Addon files (sanitized path components)
    $r->get('/addons/:dir/:file' => [
      dir  => qr/[a-zA-Z0-9_-]+/,
      file => qr/[a-zA-Z0-9_.-]+\.(js|html|css)/
    ] => sub {
      my $c = shift;
      my $path = "/addons/" . $c->stash('dir') . "/" . $c->stash('file');
      my $file = "$datastore$path";
      -f $file or $file = "$webroot$path";
      -f $file ? $c->reply->file($file) : $c->reply->not_found;
    });

    # WebSocket endpoint for real-time updates
    $r->websocket('/ws' => sub {
      my $c = shift;
      $this->Debug(2, "WebSocket client connected");
      $c->inactivity_timeout(0);

      # Send initial data
      my $initial = $this->_read_dynamic($configuration);
      $c->send({text => $initial});

      # Recurring update push
      my $id = Mojo::IOLoop->recurring($delay => sub {
        my $json = $this->_read_dynamic($configuration);
        $c->send({text => $json});
      });

      # Clean up on disconnect
      $c->on(finish => sub {
        Mojo::IOLoop->remove($id);
        $this->Debug(2, "WebSocket client disconnected");
      });
    });

    # Fallback: serve static files from webroot, then datastore
    $r->get('/*' => sub {
      my $c = shift;
      my $path = $c->req->url->path;
      $path =~ s/^\///;

      # Path traversal protection
      if ( $path =~ /\.\./ ) {
        return $c->reply->not_found;
      }

      # index.html -> status.html
      $path =~ s/^index\.html$/status.html/;

      # Try webroot
      my $file = "$webroot/$path";
      if ( -f $file ) {
        return $c->reply->file($file);
      }

      # Try datastore
      $file = "$datastore/$path";
      if ( -f $file ) {
        return $c->reply->file($file);
      }

      $c->reply->not_found;
    });
  }

  # Build listen specification
  my $proto = $configuration->{'daemon'}->{'ssl'} ? 'https' : 'http';
  my $listen = "$proto://$configuration->{'daemon'}->{'addr'}:$configuration->{'daemon'}->{'port'}";

  my @listen_args = ($listen);
  if ( $configuration->{'daemon'}->{'ssl'} ) {
    $listen_args[0] = {
      listen   => $listen,
      tls      => 1,
      tls_cert => $configuration->{'daemon'}->{'sslcert'},
      tls_key  => $configuration->{'daemon'}->{'sslkey'},
    };
    $this->Debug(1, "SSL enabled with cert: $configuration->{'daemon'}->{'sslcert'}");
  }

  # Drop privileges
  setgid($configuration->{'daemon'}->{'gid'});
  setuid($configuration->{'daemon'}->{'uid'});

  # Start server
  my $daemon = Mojo::Server::Daemon->new(
    app    => $app,
    listen => \@listen_args,
  );

  $this->Debug(1, "Server starting on $listen");
  $daemon->run;
  $this->Debug(1, "Server stopped");
}

1;

__END__

=head1 NAME

RPi::Monitor::Server - Mojolicious-based web server for RPi-Monitor

=head1 SYNOPSIS

  use RPi::Monitor::Server;
  my $server = RPi::Monitor::Server->new();
  $server->Run($configuration, $monitor);

=head1 DESCRIPTION

This module implements the web server using L<Mojolicious> that serves
the RPi-Monitor web interface. It handles static file serving, JSON
API endpoints (C<static.json>, C<dynamic.json>, C<version.json>, etc.),
WebSocket real-time updates at C</ws>, authentication, rate limiting,
and security headers.

Dynamic data is read from a file (C<$datastore/dynamic.json>) instead
of shared memory, replacing the former IPC::ShareLite approach.

=head1 METHODS

=head2 new()

Creates a new Server object.

=head2 Run($configuration, $monitor)

Starts the Mojolicious web server. Sets up routes for all JSON
endpoints, static files, RRD files, addon files, and a WebSocket
endpoint for real-time push updates. Blocks indefinitely.

=head2 Debug($level, @msg)

Outputs debug messages to STDERR.

=head1 AUTHOR

Xavier Berger - L<https://rpi-experiences.blogspot.com/>

=cut
