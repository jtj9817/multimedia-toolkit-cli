import { createAppContext } from '../src/app/context';
import { ensureDirectoryExists } from '../src/utils/path';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

console.log('Starting Phase 2 Manual Verification...');

// Setup
const testDir = '/tmp/phase2-verify';
if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });

// Mock Clock
const fixedTime = new Date('2025-01-01T12:00:00Z').getTime();
const mockClock = { now: () => fixedTime };

console.log('Creating AppContext with MockClock...');
const ctx = createAppContext({
    clock: mockClock,
    paths: {
        baseDir: testDir,
        dbPath: ':memory:',
        defaultOutputDir: join(testDir, 'output')
    },
    baseDir: testDir // explicit override
});

console.log('Testing OutputOrganizer path generation...');
// Test OutputOrganizer via ctx.organizer
const organizer = ctx.organizer;

// Test 1: Date-based organization
const path1 = organizer.getOutputPath('test1', 'mp4', { source: 'source1' });
console.log(`Path 1 (Date): ${path1}`);

if (path1.includes('2025/01/01') && path1.includes(String(fixedTime))) {
    console.log('✅ Path 1 correct');
} else {
    console.error('❌ Path 1 incorrect');
    process.exit(1);
}

// Test 2: Custom Dir
const customDir = join(testDir, 'custom');
const path2 = organizer.getOutputPath('test2', 'mp3', { customDir });
console.log(`Path 2 (Custom): ${path2}`);

if (path2.startsWith(customDir) && existsSync(customDir)) {
    console.log('✅ Path 2 correct and directory created');
} else {
    console.error('❌ Path 2 incorrect or directory missing');
    process.exit(1);
}

// Test 3: ensureDirectoryExists
console.log('Testing ensureDirectoryExists...');
const newDir = join(testDir, 'new-dir');
ensureDirectoryExists(ctx, newDir);
if (existsSync(newDir)) {
    console.log('✅ new-dir created');
} else {
    console.error('❌ new-dir not created');
    process.exit(1);
}

console.log('Phase 2 Verification Complete!');
