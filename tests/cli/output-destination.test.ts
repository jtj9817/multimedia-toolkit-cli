import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { OutputDestinationDialog } from '@/cli/dialogs/output-destination';
import { OutputOrganizer } from '@/utils/logger';
import { createConfigManager } from '@/config/config';
import { resolveAppPaths, type AppPaths } from '@/app/paths';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import type { CLIInterface } from '@/cli/interface';
import type { Clock } from '@/utils/clock';

class MockClock implements Clock {
  constructor(private _now: number) {}
  now(): number { return this._now; }
}

type ChoiceKey = 'default' | 'browse' | 'manual';

interface StubOptions {
  fzfAvailable?: boolean;
  selections: ChoiceKey[][];  // per selectFromList call: chosen keys ([] = Back)
  prompts?: string[];         // sequential prompt() answers
  confirms?: boolean[];       // sequential confirm() answers
  browsedDir?: string;        // selectDirectoryWithFzf return value ('' = canceled)
}

function createStubCli(options: StubOptions) {
  let selectionIndex = 0;
  let promptIndex = 0;
  let confirmIndex = 0;
  const menuLabels: string[][] = [];
  const errors: string[] = [];

  const cli = {
    isFzfAvailable: async () => options.fzfAvailable ?? true,
    selectFromList: async <T extends { key: ChoiceKey }>(_title: string, items: T[]): Promise<T[]> => {
      menuLabels.push(items.map(item => item.key));
      const wanted = options.selections[selectionIndex++] ?? [];
      return items.filter(item => wanted.includes(item.key));
    },
    selectDirectoryWithFzf: async () => options.browsedDir ?? '',
    prompt: async (_question: string, defaultValue?: string) =>
      options.prompts?.[promptIndex++] ?? defaultValue ?? '',
    confirm: async () => options.confirms?.[confirmIndex++] ?? false,
    error: (message: string) => { errors.push(message); }
  };

  return { cli: cli as unknown as CLIInterface, menuLabels, errors };
}

describe('OutputDestinationDialog', () => {
  let tempBaseDir: string;
  let paths: AppPaths;
  const clock = new MockClock(new Date('2023-01-01T12:00:00Z').getTime());

  beforeEach(() => {
    tempBaseDir = mkdtempSync(join(tmpdir(), 'mat-test-dialog-'));
    paths = resolveAppPaths({
      baseDir: tempBaseDir,
      defaultOutputDir: join(tempBaseDir, 'output')
    });
  });

  afterEach(() => {
    if (existsSync(tempBaseDir)) {
      rmSync(tempBaseDir, { recursive: true, force: true });
    }
  });

  function buildDialog(stub: ReturnType<typeof createStubCli>) {
    const config = createConfigManager({ paths });
    const organizer = new OutputOrganizer({ config, clock });
    return {
      dialog: new OutputDestinationDialog(stub.cli, organizer, config),
      config
    };
  }

  it('uses the default directory and creates it when missing', async () => {
    const stub = createStubCli({ selections: [['default']] });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result).not.toBeNull();
    expect(result!.outputDir).toBe(paths.defaultOutputDir);
    expect(existsSync(paths.defaultOutputDir)).toBe(true);
  });

  it('uses a browsed directory from fzf', async () => {
    const browsed = join(tempBaseDir, 'picked');
    const stub = createStubCli({ selections: [['browse']], browsedDir: browsed });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result!.outputDir).toBe(browsed);
    expect(existsSync(browsed)).toBe(true);
  });

  it('returns to the choice menu when browsing is canceled, then accepts the default', async () => {
    const stub = createStubCli({ selections: [['browse'], ['default']], browsedDir: '' });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result!.outputDir).toBe(paths.defaultOutputDir);
    expect(stub.menuLabels).toHaveLength(2);
  });

  it('accepts a manually typed path', async () => {
    const manualDir = join(tempBaseDir, 'manual-out');
    const stub = createStubCli({ selections: [['manual']], prompts: [manualDir] });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result!.outputDir).toBe(resolve(manualDir));
    expect(existsSync(manualDir)).toBe(true);
  });

  it('loops back to the choice menu on empty manual input', async () => {
    const stub = createStubCli({ selections: [['manual'], ['default']], prompts: [''] });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result!.outputDir).toBe(paths.defaultOutputDir);
    expect(stub.menuLabels).toHaveLength(2);
  });

  it('returns null when the user backs out of the choice menu', async () => {
    const stub = createStubCli({ selections: [[]] });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result).toBeNull();
  });

  it('shows an error and returns to the menu when the directory cannot be created', async () => {
    // A regular file at the parent path makes mkdirSync fail with ENOTDIR,
    // regardless of user privileges.
    const blocker = join(tempBaseDir, 'blocker');
    writeFileSync(blocker, 'not a directory');
    const impossibleDir = join(blocker, 'sub');

    const stub = createStubCli({
      selections: [['manual'], ['default']],
      prompts: [impossibleDir]
    });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(stub.errors).toHaveLength(1);
    expect(stub.errors[0]).toContain('Cannot create directory');
    expect(result!.outputDir).toBe(paths.defaultOutputDir);
  });

  it('omits the browse option when fzf is unavailable', async () => {
    const manualDir = join(tempBaseDir, 'no-fzf-out');
    const stub = createStubCli({
      fzfAvailable: false,
      selections: [['manual']],
      prompts: [manualDir]
    });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForOutputDirectory({
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(stub.menuLabels[0]).not.toContain('browse');
    expect(result!.outputDir).toBe(resolve(manualDir));
  });

  it('routes promptForSingleOutput custom directories through the same flow', async () => {
    const manualDir = join(tempBaseDir, 'single-out');
    const stub = createStubCli({
      selections: [['manual']],
      prompts: [manualDir],
      confirms: [false, false] // decline default path, decline full output path
    });
    const { dialog } = buildDialog(stub);

    const result = await dialog.promptForSingleOutput({
      format: 'mp3',
      defaultBaseName: 'song',
      allowRename: false
    });

    expect(result).not.toBeNull();
    expect(result!.outputDir).toBe(resolve(manualDir));
    expect(result!.outputPath).toContain('song');
    expect(result!.outputPath!.startsWith(resolve(manualDir))).toBe(true);
  });
});
