#!/usr/bin/env bun
/**
 * Verification script for Phase 3: Process Runner and FZF Logic Refactor
 */

import { $ } from 'bun';

console.log('🔍 Running Phase 3 Verification...');

try {
  console.log('\n▶️  Testing Process Runner...');
  await $`bun test src/utils/process-runner.test.ts`;

  console.log('\n▶️  Testing FZF Logic...');
  await $`bun test src/utils/fzf.test.ts`;

  console.log('\n✅ Phase 3 Verification Passed!');
} catch (error) {
  console.error('\n❌ Phase 3 Verification Failed!');
  process.exit(1);
}
