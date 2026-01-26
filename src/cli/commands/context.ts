/**
 * Default command context wired from the app context factory.
 */

import { createAppContext } from '@/app/context';
import type { CommandContext } from '@/cli/commands/command';

export function createCommandContext(): CommandContext {
  return createAppContext();
}
