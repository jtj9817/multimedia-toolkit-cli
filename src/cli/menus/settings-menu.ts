/**
 * Settings menu using the standard numbered layout.
 */

import type { ConfigManager } from '@/config/config';
import { VIDEO_TRANSCODE_PRESETS } from '@/media/video-presets';
import type { CLIInterface } from '@/cli/interface';
import { NumberedMenu, type NumberedChoice } from '@/cli/menus/numbered-menu';

export class SettingsMenu extends NumberedMenu<() => Promise<void>> {
  title = 'Settings';
  private config: ConfigManager;

  constructor(cli: CLIInterface, config: ConfigManager) {
    super(cli);
    this.config = config;
  }

  exitLabel(): string {
    return 'Back';
  }

  choices(): NumberedChoice<() => Promise<void>>[] {
    return [
      {
        label: 'Change output directory',
        value: async () => {
          const dir = await this.cli.prompt('New output directory', this.config.get('defaultOutputDir'));
          this.config.set('defaultOutputDir', dir);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default quality',
        value: async () => {
          const quality = await this.cli.selectQuality();
          this.config.set('defaultQuality', quality);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default format',
        value: async () => {
          const format = await this.cli.selectFormat();
          this.config.set('defaultFormat', format);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video preset',
        value: async () => {
          const preset = await this.cli.selectVideoPreset(this.config.get('defaultVideoPreset'));
          this.config.set('defaultVideoPreset', preset);
          const presetData = VIDEO_TRANSCODE_PRESETS[preset];
          this.config.set('defaultVideoFormat', presetData.container);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video format',
        value: async () => {
          const format = await this.cli.selectVideoFormat(this.config.get('defaultVideoFormat'));
          this.config.set('defaultVideoFormat', format);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video resolution',
        value: async () => {
          const resolution = await this.cli.selectVideoResolution(this.config.get('defaultVideoResolution'));
          this.config.set('defaultVideoResolution', resolution);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Toggle auto-organize',
        value: async () => {
          this.config.set('autoOrganize', !this.config.get('autoOrganize'));
          this.cli.success(`Auto-organize: ${this.config.get('autoOrganize') ? 'ON' : 'OFF'}`);
        }
      },
      {
        label: 'Reset to defaults',
        value: async () => {
          if (await this.cli.confirm('Reset all settings?', false)) {
            this.config.reset();
            this.cli.success('Settings reset');
          }
        }
      }
    ];
  }
}
