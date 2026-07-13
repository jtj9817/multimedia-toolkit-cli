import { describe, expect, test } from 'bun:test';
import type { CLIInterface } from '@/cli/interface';
import { NumberedMenu } from '@/cli/menus/numbered-menu';

function createCli(inputs: string[]) {
  const errors: string[] = [];
  const cli = {
    prompt: async () => inputs.shift() ?? '',
    error: (message: string) => errors.push(message)
  } as unknown as CLIInterface;

  return { cli, errors };
}

describe('NumberedMenu', () => {
  test('maps a numeric selection to its typed value', async () => {
    const { cli } = createCli(['2']);
    const menu = new NumberedMenu(cli, {
      title: 'Formats',
      choices: [
        { label: 'MP3', value: 'mp3' },
        { label: 'FLAC', value: 'flac' }
      ],
      exitLabel: 'Back'
    });

    await expect(menu.run()).resolves.toBe('flac');
  });

  test('retries invalid input before returning a selection', async () => {
    const { cli, errors } = createCli(['flac', '3', '1']);
    const menu = new NumberedMenu(cli, {
      title: 'Formats',
      choices: [
        { label: 'MP3', value: 'mp3' },
        { label: 'FLAC', value: 'flac' }
      ]
    });

    await expect(menu.run()).resolves.toBe('mp3');
    expect(errors).toHaveLength(2);
  });

  test('returns null when the user chooses back', async () => {
    const { cli } = createCli(['0']);
    const menu = new NumberedMenu(cli, {
      title: 'Formats',
      choices: [{ label: 'MP3', value: 'mp3' }],
      exitLabel: 'Back'
    });

    await expect(menu.run()).resolves.toBeNull();
  });

  test('maps comma-separated selections to typed values', async () => {
    const { cli } = createCli(['1,3']);
    const menu = new NumberedMenu(cli, {
      title: 'Files',
      choices: [
        { label: 'one', value: '/tmp/one.mp3' },
        { label: 'two', value: '/tmp/two.mp3' },
        { label: 'three', value: '/tmp/three.mp3' }
      ],
      exitLabel: 'Back'
    });

    await expect(menu.runMultiple()).resolves.toEqual(['/tmp/one.mp3', '/tmp/three.mp3']);
  });

  test('supports selecting all items and cancelling multi-select', async () => {
    const allMenu = new NumberedMenu(createCli(['all']).cli, {
      title: 'Files',
      choices: [
        { label: 'one', value: 'one' },
        { label: 'two', value: 'two' }
      ]
    });
    await expect(allMenu.runMultiple()).resolves.toEqual(['one', 'two']);

    const backMenu = new NumberedMenu(createCli(['0']).cli, {
      title: 'Files',
      choices: [{ label: 'one', value: 'one' }],
      exitLabel: 'Back'
    });
    await expect(backMenu.runMultiple()).resolves.toBeNull();
  });
});
