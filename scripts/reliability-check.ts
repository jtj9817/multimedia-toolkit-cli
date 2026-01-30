#!/usr/bin/env bun
/**
 * Reliability verification script
 * Runs the test suite multiple times to detect flakiness.
 */

import { spawn } from 'bun';

const ITERATIONS = 10;
const TEST_COMMAND = ['bun', 'test'];

async function runTests(iteration: number): Promise<boolean> {
  console.log(`\n[${iteration}/${ITERATIONS}] Running test suite...`);
  
  const proc = spawn(TEST_COMMAND, {
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;
  
  if (exitCode === 0) {
    console.log(`[${iteration}/${ITERATIONS}] ✅ Passed`);
    return true;
  } else {
    console.log(`[${iteration}/${ITERATIONS}] ❌ Failed with exit code ${exitCode}`);
    return false;
  }
}

async function main() {
  console.log(`Starting reliability check: ${ITERATIONS} iterations of '${TEST_COMMAND.join(' ')}'`);
  const startTime = Date.now();
  
  let passedCount = 0;
  
  for (let i = 1; i <= ITERATIONS; i++) {
    const passed = await runTests(i);
    if (passed) {
      passedCount++;
    } else {
      console.error(`\nReliability check FAILED at iteration ${i}`);
      process.exit(1);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSummary:`)
  console.log(`- Total Iterations: ${ITERATIONS}`);
  console.log(`- Passed: ${passedCount}`);
  console.log(`- Duration: ${duration}s`);
  console.log(`\n✅ Reliability check PASSED. Zero flakiness detected.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
