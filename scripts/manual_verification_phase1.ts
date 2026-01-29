
import { createAppContext } from '@/app/context';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmdirSync, existsSync } from 'fs';

// Force Test Environment
process.env.NODE_ENV = 'test';

const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string) => console.error(`[ERROR] ${msg}`);
const logPass = (msg: string) => console.log(`[PASS] ${msg}`);
const logFail = (msg: string) => console.error(`[FAIL] ${msg}`);

async function run() {
  logInfo('=== Starting Manual Verification: Phase 1 (Core Context) ===');

  const tempDirs: string[] = [];
  const createTempDir = () => {
    const dir = join(tmpdir(), `mat-manual-verify-${Date.now()}-${Math.random()}`);
    // We don't actually create it, createAppContext might? 
    // Or we create it to pass as baseDir?
    // Let's create it.
    // actually, let's just use the path.
    return dir;
  };

  // Test 1: Valid Context Creation
  try {
    logInfo('Test 1: Creating Valid Context (Isolated)...');
    const baseDir = createTempDir();
    tempDirs.push(baseDir); // Track for cleanup if created (unlikely by context itself now, but good practice)
    
    const app = createAppContext({
      baseDir,
      paths: { dbPath: ':memory:' }
    });
    
    if (app.paths.baseDir === baseDir && app.db.dbPath === ':memory:') {
      logPass('Valid context created successfully.');
    } else {
      logFail('Valid context creation failed assertions.');
    }
  } catch (e) {
    logFail(`Valid context creation threw error: ${e}`);
  }

  // Test 2: Invalid Context Creation (Home Dir)
  try {
    logInfo('Test 2: Creating Invalid Context (Home Dir)...');
    // We expect this to fail
    createAppContext({});
    logFail('Invalid context creation SHOULD have thrown an error but did not.');
  } catch (e: any) {
    if (e.message.includes('In-memory database required') || e.message.includes('Context isolation required')) {
      logPass(`Invalid context creation correctly threw error: ${e.message}`);
    } else {
      logFail(`Invalid context creation threw UNEXPECTED error: ${e.message}`);
    }
  }

  // Test 3: Invalid Context Creation (File DB)
  try {
    logInfo('Test 3: Creating Invalid Context (File DB)...');
    const baseDir = createTempDir();
    createAppContext({
        baseDir,
        paths: { dbPath: join(baseDir, 'test.db') }
    });
    logFail('Context creation with File DB SHOULD have thrown an error but did not.');
  } catch (e: any) {
    if (e.message.includes('In-memory database required')) {
      logPass(`Context creation with File DB correctly threw error: ${e.message}`);
    } else {
      logFail(`Context creation with File DB threw UNEXPECTED error: ${e.message}`);
    }
  }

  logInfo('=== Verification Complete ===');
}

run().catch(e => {
    logError(`Script failed: ${e}`);
    process.exit(1);
});
