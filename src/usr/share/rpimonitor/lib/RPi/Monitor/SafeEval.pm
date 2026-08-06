package RPi::Monitor::SafeEval;
use strict;
use warnings;

# Whitelist patterns for safe expression evaluation
# Postprocess: allows $1, numbers, arithmetic, parentheses, and math functions
my $POSTPROCESS_RE = qr/^[\s\d.\+\-\*\/\%\(\)\$1_,;:=>\!<]+$/;
# Alert/comparison: allows numbers, comparison and logical operators, parentheses
my $COMPARE_RE = qr/^[\s\d.\+\-\*\/\%\(\)\<\>\=\!\&\|_]+$/;

sub Postprocess
{
  my $expr = shift;
  if ( !defined $expr || $expr eq '' ) { return undef; }
  if ( $expr =~ $POSTPROCESS_RE ) {
    my $result = eval $expr;
    if ( $@ ) {
      warn "SafeEval::Postprocess error in '$expr': $@";
      return undef;
    }
    return $result;
  }
  warn "SafeEval::Postprocess rejected unsafe expression: '$expr'";
  return undef;
}

sub Compare
{
  my $expr = shift;
  if ( !defined $expr || $expr eq '' ) { return 0; }
  if ( $expr =~ $COMPARE_RE ) {
    my $result = eval $expr;
    if ( $@ ) {
      warn "SafeEval::Compare error in '$expr': $@";
      return 0;
    }
    return $result;
  }
  warn "SafeEval::Compare rejected unsafe expression: '$expr'";
  return 0;
}

1;
