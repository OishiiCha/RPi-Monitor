package RPi::Monitor::Interactive;
use strict;
use warnings;
use POSIX;
use File::Which;
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

sub Title
{
  my $this = shift;
  system("clear");
  print "**********************************************************************\n";
  print "*           RPi-Monitor Interactive Configuration Helper             *\n";
  print "**********************************************************************\n";
}

sub Welcome
{
  my $this = shift;
  print " RPi-Monitor Interactive is a tool to help you to define the\n";
  print " parameter of the configuration file: source, regexp, postprocess\n";
  print " and type\n";
  print "\n";
  print " Press [Enter] to continue: ";
}

sub GetSource
{
  my $this = shift;
  my $prevAnswer = shift;
  print " First you have to define the source. The source can be a file or a\n";
  print " command to be executed.\n";
  print "\n";
  print " If source is a command, RPi-Monitor executes this command and parse\n";
  print " <STDOUT>. If you need to parse <STDERR> add 2>&1 at the end of the\n";
  print " command to redirect <STDERR> to <STDOUT>.\n";
  print "\n";
  print " If the source is a flat file, RPi-Monitor parses it line by line.\n";
  print "\n";
  print " Enter here the command or the file to use as source [$prevAnswer]: \n ";
}

sub Executable
{
  my $this = shift;
  my $executable = shift;
  my $command = shift;
  $this->Title();
  print " Find executable file: '$executable'\n";
  print " Is that correct? Yes/No [Yes]: ";
  $_=<>;
  /^n(?:o)?$/i and return 0;
  print "\n Execution of the command '$command' returns:\n\n";
  system($command);
  print "\n Is that the expected output? Yes/No [Yes]: ";
  $_=<>;
  /^n(?:o)?$/i and return 0;
  return 1;
}

sub FlatFile
{
  my $this = shift;
  my $file = shift;
  $this->Title();
  print " '$file' is a flat file\n";
  print " Is that correct? Yes/No [Yes]: ";
  $_=<>;
  /^n(?:o)?$/i and return 0;
  return 1;
}

sub GetRegExp
{
  my $this = shift;

  $this->Title();
  print " The Regular Expression is here to extract the information from the\n";
  print " source. To learn Perl Regular Expression you can refer to the\n";
  print " documentation: http://perldoc.perl.org/perlretut.html \n";
  print " It is required to put the value to extract into parenthesis.\n";
}

sub ApplyRegExp
{
  my $this = shift;
  my $source = shift;
  my $regexp = shift;
  my $print = shift;

  $source =~ /^(\S+)/;
  my $file = ( -x $1 || -x which($1) ) ? "$source 2>/dev/null|" : $source;
  open(FEED, $file) or die "Can't open $file because $!\n";
  while (<FEED>){
    @_=/$regexp/ or next;
    my $i=0;
    foreach ( @_ ) {
      $i++;
      if ( $print ) {
        print " \$$i = $_\n";
      }
      else {
        close(FEED);
        return $_;
      }
    }
  }
  close(FEED);
}

sub CheckRegExp
{
  my $this = shift;
  my $source = shift;
  my $regexp = shift;

  $this->Title();
  my $test = eval { qr/$regexp/ };
  if ( $@ ) {
    print "The regular expression is not correct:\n";
    print "\n $@";
    print "\n";
    print " Press [Enter] to continue: ";
    <>;
  }
  else {
    print " Applying the Regular Expression '$regexp'\n";
    print " on the source '$source' gives the following result:\n\n";
    $this->ApplyRegExp($source,$regexp,1);
    print "\n Is that correct? Yes/No [No]: ";
    $_=<>;
    /^Y(?:es)?$/i and return 1;
  }
  return 0;
}

sub GetFormula
{
  my $this = shift;

  $this->Title();
  print " The post processing formula is designed to adjust the value extracted\n";
  print " by the regular expression. This value is accessible using \$1 \n";
  print " \n";
}

sub CheckFormula
{
  my $this = shift;
  my $source = shift;
  my $regexp = shift;
  my $formula = shift;

  $this->Title();
  print " After applying the post precessing formule, the result is: \n\n";
  $_ = $this->ApplyRegExp($source,$regexp,0);
  /(.*)/;
  print RPi::Monitor::SafeEval::Postprocess($formula);
  print "\n\n Is that correct? Yes/No [No]: ";
  $_=<>;
  /^Y(?:es)?$/i and return 1;

  return 0;
}

sub GetType
{
  my $this = shift;

  $this->Title();
  print " RPi-Monitor manage 2 types of data; static or dynamic.\n";
  print " static data are not changing over the time like disk size.\n";
  print " dynamic data can change over the time like disk usage.\n";
  print "\n";
  print " Is is a static data? [Yes]";
  $_=<>;
  return /^N(?:o)?$/i ? "dynamic" : "static";
}

sub PrintConfiguration
{
  my $this = shift;
  my $source = shift;
  my $regexp = shift;
  my $formula = shift;
  my $type = shift;

  my $configuration = RPi::Monitor::Configuration->new();
  $configuration->Load();
  my $id = ( scalar @{$configuration->{$type}} ) + 1;

  $this->Title();
  print " We have now defined all the parameters allowing RPi-Monitor to\n";
  print " extract the data from the system. Here is a template of configuration\n";
  print " base on your actual configuration.\n";
  print "\n";
  print "$type.$id.name=<Add here the name>\n";
  print "$type.$id.source=$source\n";
  print "$type.$id.regexp=$regexp\n";
  print "$type.$id.postprocess=$formula\n";
  $_ = $type;
  /dynamic/ and print "dynamic.$id.rrd=<Define the rrd type>\n";
  print "\n You now have to copy it into an existing configuration file or\n";
  print " add a new file into /etc/rpimonitor/.\n";
  print " <Note the some text require a manual update>\n";
  print " Once the configuration will be apply, restart RPi-Monitor with the\n";
  print " command: /etc/init.d/rpimonitor restart or systemctl restart rpimonitord\n";
}

sub Run
{
  my $this = shift;

  # Show welcome page
  $this->Title();
  $this->Welcome();
  <>;

  # Get the source
  my $source="";
  for (;;) {
    $this->Title();
    $this->GetSource($source);
    $_ =<>;
    chomp;
    $source = $_ || $source;

    $source =~ /^(\S+)/;
    ( -x $1 || -x which($1) ) and $this->Executable( $1, $source ) and last;

    -f $source and $this->FlatFile($source) and last;
  }

  # Get the regular expression
  $this->Title();
  $this->GetRegExp();
  my $regexp="(.*)";
  for (;;) {
    print "\n";
    print " Enter your regular expression /$regexp/:";
    $_=<>;
    chomp;
    $regexp = $_ || $regexp;
    $this->CheckRegExp($source,$regexp) and last;
  }

  # Get post processing formula
  $this->Title();
  $this->GetFormula();
  my $formula="";
  for (;;) {
    print "\n";
    print " Enter your formula [$formula]:";
    $_=<>;
    chomp;
    $formula = $_ || $formula;
    $this->CheckFormula($source,$regexp,$formula) and last;
  }

  # Get type static or dynamic
  my $type = $this->GetType();

  # Print configuration
  $this->PrintConfiguration( $source, $regexp, $formula, $type );

  exit();
}

1;

__END__

=head1 NAME

RPi::Monitor::Interactive - Interactive configuration explorer for RPi-Monitor

=head1 SYNOPSIS

  use RPi::Monitor::Interactive;
  my $interactive = RPi::Monitor::Interactive->new();
  $interactive->Run();

=head1 DESCRIPTION

This module provides an interactive command-line interface for
exploring RPi-Monitor configuration. Users can browse static and
dynamic data sources, view formulas, and inspect extracted values.

=head1 METHODS

=head2 new()

Creates a new Interactive object.

=head2 Run()

Starts the interactive exploration loop. Prompts the user for
a data source name and displays configuration details.

=head1 AUTHOR

Xavier Berger - L<https://rpi-experiences.blogspot.com/>

=cut
