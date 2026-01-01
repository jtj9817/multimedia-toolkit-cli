#!/usr/bin/env bun
/**
 * Test script for FZF integration
 * Run with: bun run test-fzf.ts
 */

import { fzfSelector } from './src/utils/fzf';
import { cli } from './src/cli/interface';

const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function testFzfIntegration() {
  console.log(`\n${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}          ${c.bright}FZF Integration Test Suite${c.reset}                    ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}\n`);

  // Test 1: Check if FZF is available
  console.log(`${c.yellow}Test 1:${c.reset} Checking if FZF is available...`);
  const isAvailable = await fzfSelector.isFzfAvailable();
  if (isAvailable) {
    console.log(`   ${c.green}✓${c.reset} FZF is installed and available\n`);
  } else {
    console.log(`   ${c.red}✗${c.reset} FZF is NOT installed`);
    console.log(`   ${c.dim}Install with: sudo apt install fzf${c.reset}\n`);
    console.log(`${c.yellow}Note:${c.reset} Tests will use manual input fallback\n`);
  }

  // Test 2: Test single file selection with feedback loop
  console.log(`${c.yellow}Test 2:${c.reset} Testing single file selection with feedback loop`);
  console.log(`   ${c.dim}This test includes: FZF search, selection confirmation, retry, and back options${c.reset}\n`);

  const singleFile = await cli.selectMediaFile(process.cwd());

  if (singleFile) {
    console.log(`\n   ${c.green}✓${c.reset} Single file selected: ${c.bright}${singleFile}${c.reset}\n`);
  } else {
    console.log(`\n   ${c.yellow}⚠${c.reset} User chose to go back (no file selected)\n`);
  }

  // Test 3: Test multiple file selection with feedback loop
  console.log(`${c.yellow}Test 3:${c.reset} Testing multiple file selection with feedback loop`);
  console.log(`   ${c.dim}This test includes: Multi-select, confirmation, and navigation options${c.reset}\n`);

  const multipleFiles = await cli.selectMediaFiles(process.cwd());

  if (multipleFiles.length > 0) {
    console.log(`\n   ${c.green}✓${c.reset} ${multipleFiles.length} file(s) selected:`);
    multipleFiles.forEach((f, i) => {
      console.log(`      ${i + 1}. ${f}`);
    });
    console.log();
  } else {
    console.log(`\n   ${c.yellow}⚠${c.reset} User chose to go back (no files selected)\n`);
  }

  // Summary
  console.log(`${c.cyan}╔══════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}                  ${c.bright}Test Summary${c.reset}                           ${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚══════════════════════════════════════════════════════════╝${c.reset}\n`);
  console.log(`   FZF Available: ${isAvailable ? `${c.green}Yes${c.reset}` : `${c.red}No${c.reset}`}`);
  console.log(`   Single File Selected: ${singleFile ? `${c.green}Yes${c.reset}` : `${c.yellow}No (back)${c.reset}`}`);
  console.log(`   Multiple Files Selected: ${multipleFiles.length > 0 ? `${c.green}${multipleFiles.length} file(s)${c.reset}` : `${c.yellow}None (back)${c.reset}`}`);
  console.log();

  cli.close();
  console.log(`${c.green}All tests completed!${c.reset}\n`);
}

testFzfIntegration().catch((error) => {
  console.error(`${c.red}Test failed:${c.reset}`, error);
  cli.close();
  process.exit(1);
});
