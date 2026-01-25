/**
 * Standard numbered menu template with 0 for exit/back.
 */

import type { CLIInterface } from '@/cli/interface';

export interface NumberedChoice<T> {
  label: string;
  description?: string;
  value: T;
}

export abstract class NumberedMenu<T> {
  constructor(protected cli: CLIInterface) {}

  abstract title: string;
  abstract choices(): NumberedChoice<T>[];

  exitLabel(): string {
    return 'Exit';
  }

  async run(): Promise<T | null> {
    const choices = this.choices();
    this.render(choices);

    while (true) {
      const input = await this.cli.prompt('Enter your choice');
      const selection = Number.parseInt(input, 10);

      if (Number.isNaN(selection)) {
        this.cli.error('Invalid selection. Enter a number.');
        continue;
      }

      if (selection === 0) {
        return null;
      }

      if (selection < 1 || selection > choices.length) {
        this.cli.error(`Invalid selection. Enter 1-${choices.length} or 0 to ${this.exitLabel().toLowerCase()}.`);
        continue;
      }

      return choices[selection - 1].value;
    }
  }

  private render(choices: NumberedChoice<T>[]): void {
    console.log(`\n${this.title}\n`);

    choices.forEach((choice, index) => {
      const description = choice.description ? ` - ${choice.description}` : '';
      console.log(`${index + 1}. [${choice.label}]${description}`);
    });

    console.log(`0. ${this.exitLabel()}\n`);
  }
}
