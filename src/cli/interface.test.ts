import { describe, expect, test } from 'bun:test';
import { CLIInterface } from '@/cli/interface';
import type { FzfSelector } from '@/utils/fzf';

function withInputs(cli: CLIInterface, inputs: string[]): void {
  cli.prompt = async () => inputs.shift() ?? '';
}

describe('CLIInterface operational numbered views', () => {
  test('selectFormat maps a numeric choice to the output format', async () => {
    const cli = new CLIInterface();
    withInputs(cli, ['2']);

    await expect(cli.selectFormat()).resolves.toBe('wav');
  });

  test('selectFromList delegates single selection to NumberedMenu', async () => {
    const cli = new CLIInterface();
    withInputs(cli, ['2']);

    await expect(cli.selectFromList('Files', ['one', 'two'], item => item)).resolves.toEqual(['two']);
  });

  test('selectFromList delegates multi-selection to NumberedMenu', async () => {
    const cli = new CLIInterface();
    withInputs(cli, ['1,3']);

    await expect(cli.selectFromList('Files', ['one', 'two', 'three'], item => item, true))
      .resolves.toEqual(['one', 'three']);
  });

  test('FZF confirmation uses a numeric choice', async () => {
    const fzf = {
      isFzfAvailable: async () => true,
      selectFile: async () => ({ success: true, data: '/tmp/example.mp3' })
    } as unknown as FzfSelector;
    const cli = new CLIInterface({ fzf });
    withInputs(cli, ['1']);

    await expect(cli.selectFileWithFzf({ allowBack: true })).resolves.toBe('/tmp/example.mp3');
  });
});
