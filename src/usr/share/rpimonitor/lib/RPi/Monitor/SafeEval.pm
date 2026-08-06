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

__END__

=head1 NAME

RPi::Monitor::SafeEval - Safe expression evaluation using whitelist filtering

=head1 SYNOPSIS

  use RPi::Monitor::SafeEval;
  my $result = RPi::Monitor::SafeEval::Postprocess('$1 + 5');
  my $match  = RPi::Monitor::SafeEval::Compare('5 > 3');

=head1 DESCRIPTION

This module provides safe evaluation of string expressions by filtering
input through regex whitelists before using Perl's C<eval>. It is used
to evaluate postprocess formulas and alert comparison expressions from
configuration files.

=head1 FUNCTIONS

=head2 Postprocess($expr)

Evaluates a postprocess expression. Allows C<$1>, numbers, arithmetic
operators, parentheses, and comparison operators. Returns the result
or C<undef> if the expression is unsafe or fails evaluation.

=head2 Compare($expr)

Evaluates a comparison expression. Allows numbers, comparison and
logical operators, and parentheses. Returns the result (truthy) or
C<0> if the expression is unsafe or fails evaluation.

=head1 AUTHOR

Xavier Berger - L<https://rpi-experiences.blogspot.com/>

=cut
