#!/usr/bin/perl
use strict;
use warnings;
use FindBin;
use lib "$FindBin::Bin/../src/usr/share/rpimonitor/lib";
use Test::More;

plan tests => 4;

use RPi::Monitor::SafeEval;

# Test 1: Postprocess with valid arithmetic
my $result = RPi::Monitor::SafeEval::Postprocess('$1 * 1024');
is(defined $result, 1, 'Postprocess returns defined value for valid expression');

# Test 2: Postprocess rejects unsafe expressions
my $unsafe = RPi::Monitor::SafeEval::Postprocess('system("rm -rf /")');
is($unsafe, undef, 'Postprocess rejects unsafe expression');

# Test 3: Compare with valid comparison
my $cmp = RPi::Monitor::SafeEval::Compare('1 < 2');
ok($cmp, 'Compare returns true for valid true expression');

# Test 4: Compare rejects unsafe expressions
my $unsafe_cmp = RPi::Monitor::SafeEval::Compare('system("whoami")');
is($unsafe_cmp, 0, 'Compare rejects unsafe expression');

done_testing();
