#!/usr/bin/env node
console.error('TEST: Basic console.error works');
console.log('TEST: Basic console.log works');
process.stderr.write('TEST: Direct stderr write works\n');
process.stdout.write('TEST: Direct stdout write works\n');