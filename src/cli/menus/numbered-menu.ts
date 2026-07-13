/**
 * Standard numbered menu template with 0 for exit/back.
 */

import type { CLIInterface } from '@/cli/interface';

export interface NumberedChoice<T> {
  label: string;
  description?: string;
  value: T;
}

export interface NumberedMenuOptions<T> {
  title: string;
  choices: NumberedChoice<T>[];
  exitLabel?: string;
  allowExit?: boolean;
}

export class NumberedMenu<T> {
  title: string;
  private readonly configuredChoices?: NumberedChoice<T>[];
  private readonly configuredExitLabel?: string;
  private readonly allowExit: boolean;

  constructor(
    protected cli: CLIInterface,
    options?: NumberedMenuOptions<T>
  ) {
    this.title = options?.title ?? 'Menu';
    this.configuredChoices = options?.choices;
    this.configuredExitLabel = options?.exitLabel;
    this.allowExit = options?.allowExit ?? true;
  }

  choices(): NumberedChoice<T>[] {
    return this.configuredChoices ?? [];
  }

  exitLabel(): string {
    return this.configuredExitLabel ?? 'Exit';
  }

  async run(): Promise<T | null> {
    const choices = this.choices();
    this.render(choices);

    while (true) {
      const input = await this.cli.prompt('Enter your choice');
      const selection = this.parseSelection(input);

      if (selection === null) {
        this.cli.error('Invalid selection. Enter a number.');
        continue;
      }

      if (selection === 0 && this.allowExit) {
        return null;
      }

      if (selection < 1 || selection > choices.length) {
        const exitHint = this.allowExit
          ? ` or 0 to ${this.exitLabel().toLowerCase()}`
          : '';
        this.cli.error(`Invalid selection. Enter 1-${choices.length}${exitHint}.`);
        continue;
      }

      return choices[selection - 1].value;
    }
  }

  async runMultiple(): Promise<T[] | null> {
    const choices = this.choices();
    this.render(choices);

    while (true) {
      const input = await this.cli.prompt('Enter choices (comma-separated, "all" or 0 to go back)');

      if (input === '0' && this.allowExit) {
        return null;
      }

      if (input.toLowerCase() === 'all') {
        return choices.map(choice => choice.value);
      }

      const tokens = input.split(',').map(token => token.trim());
      const selections = tokens.map(token => this.parseSelection(token));

      if (
        tokens.length === 0 ||
        selections.some(selection => selection === null || selection < 1 || selection > choices.length)
      ) {
        this.cli.error(`Invalid selection. Enter numbers from 1-${choices.length}, separated by commas.`);
        continue;
      }

      return selections.map(selection => choices[selection! - 1].value);
    }
  }

  private render(choices: NumberedChoice<T>[]): void {
    console.log(`\n${this.title}\n`);

    choices.forEach((choice, index) => {
      const description = choice.description ? ` - ${choice.description}` : '';
      console.log(`${index + 1}. [${choice.label}]${description}`);
    });

    if (this.allowExit) {
      console.log(`0. ${this.exitLabel()}\n`);
    } else {
      console.log();
    }
  }

  private parseSelection(input: string): number | null {
    if (!/^\d+$/.test(input)) {
      return null;
    }

    return Number(input);
  }
}
