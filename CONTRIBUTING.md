# Contributing to RPi-Monitor

Thank you for your interest in contributing to RPi-Monitor! This document outlines the process for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Make sure you have Perl 5.10.1+ and the required modules installed:
   ```bash
   cpanm --installdeps .
   ```
4. Create a branch for your feature or bugfix: `git checkout -b my-feature`

## Development Guidelines

### Perl Code
- Always use `use strict;` and `use warnings;` in all packages
- Follow the existing code style (4-space indentation)
- Do not use string `eval()` — use the `SafeEval` module for expression evaluation
- Add POD documentation for new public methods

### JavaScript Code
- Do not use `eval()` — use `safeEval()` / `safeEvalStmt()` from `rpimonitor.utils.js`
- Avoid global variables where possible
- Follow existing style (2-space indentation, no semicolons at end of simple statements)

### Configuration Files
- Document new config options in `daemon.conf` with commented examples
- Provide sensible defaults in the Configuration package

## Testing

- Run any existing tests before submitting: `perl -Ilib t/*.t`
- Add tests for new functionality when possible

## Submitting Changes

1. Push your branch to your fork
2. Open a Pull Request with a clear description of the changes
3. Reference any related issues in the PR description
4. Ensure your code passes basic linting: `perl -c src/usr/bin/rpimonitord`

## Reporting Issues

- Use the GitHub Issues tracker
- Include the RPi-Monitor version, OS, and Perl version
- Describe the expected vs actual behavior
- Include relevant log output (with loglevel set to 3)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
