/**
 * Preset management menu using the standard numbered layout.
 */

import { join } from 'path';
import type { ConfigManager } from '@/config/config';
import type { CLIInterface } from '@/cli/interface';
import { NumberedMenu, type NumberedChoice } from '@/cli/menus/numbered-menu';
import type { PresetManager } from '@/utils/presets';

export class PresetManagementMenu extends NumberedMenu<() => Promise<void>> {
  title = 'Preset Management';
  private config: ConfigManager;
  private presets: PresetManager;

  constructor(cli: CLIInterface, config: ConfigManager, presets: PresetManager) {
    super(cli);
    this.config = config;
    this.presets = presets;
  }

  exitLabel(): string {
    return 'Back';
  }

  choices(): NumberedChoice<() => Promise<void>>[] {
    return [
      {
        label: 'List Presets',
        value: async () => {
          console.log('\n' + this.presets.listPresets() + '\n');
        }
      },
      {
        label: 'View Preset Details',
        value: async () => {
          const name = await this.cli.prompt('Preset name');
          const result = this.presets.get(name);
          if (result.success && result.data) {
            console.log('\n' + this.presets.formatPreset(result.data) + '\n');
          } else {
            this.cli.error(result.error || 'Preset not found');
          }
        }
      },
      {
        label: 'Create Preset',
        value: async () => {
          const name = await this.cli.prompt('Preset name');
          const sourcePattern = await this.cli.prompt('Source file pattern (regex, optional)');
          const clips = await this.cli.promptMultipleClips();
          const result = this.presets.createFromClips(name, clips, sourcePattern || undefined);
          if (result.success) {
            this.cli.success(`Preset "${name}" created`);
          } else {
            this.cli.error(result.error || 'Failed to create preset');
          }
        }
      },
      {
        label: 'Delete Preset',
        value: async () => {
          const name = await this.cli.prompt('Preset name to delete');
          if (await this.cli.confirm(`Delete preset "${name}"?`, false)) {
            const result = this.presets.delete(name);
            if (result.success) {
              this.cli.success(`Preset "${name}" deleted`);
            } else {
              this.cli.error(result.error || 'Failed to delete');
            }
          }
        }
      },
      {
        label: 'Export Presets',
        value: async () => {
          const json = this.presets.exportToJson();
          const outputPath = join(this.config.getOutputDir(), `presets_export_${Date.now()}.json`);
          await Bun.write(outputPath, json);
          this.cli.success(`Exported to: ${outputPath}`);
        }
      }
    ];
  }
}
