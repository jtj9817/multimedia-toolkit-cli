/**
 * Settings menu using the standard numbered layout.
 */

import { config } from '@/config/config';
import { VIDEO_TRANSCODE_PRESETS } from '@/media/video-presets';
import type { CLIInterface } from '@/cli/interface';
import { NumberedMenu, type NumberedChoice } from '@/cli/menus/numbered-menu';

export class SettingsMenu extends NumberedMenu<() => Promise<void>> {
  title = 'Settings';

  constructor(cli: CLIInterface) {
    super(cli);
  }

  exitLabel(): string {
    return 'Back';
  }

  choices(): NumberedChoice<() => Promise<void>>[] {
    return [
      {
        label: 'Change output directory',
        value: async () => {
          const dir = await this.cli.prompt('New output directory', config.get('defaultOutputDir'));
          config.set('defaultOutputDir', dir);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default quality',
        value: async () => {
          const quality = await this.cli.selectQuality();
          config.set('defaultQuality', quality);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default format',
        value: async () => {
          const format = await this.cli.selectFormat();
          config.set('defaultFormat', format);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video preset',
        value: async () => {
          const preset = await this.cli.selectVideoPreset(config.get('defaultVideoPreset'));
          config.set('defaultVideoPreset', preset);
          const presetData = VIDEO_TRANSCODE_PRESETS[preset];
          config.set('defaultVideoFormat', presetData.container);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video format',
        value: async () => {
          const format = await this.cli.selectVideoFormat(config.get('defaultVideoFormat'));
          config.set('defaultVideoFormat', format);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Change default video resolution',
        value: async () => {
          const resolution = await this.cli.selectVideoResolution(config.get('defaultVideoResolution'));
          config.set('defaultVideoResolution', resolution);
          this.cli.success('Updated');
        }
      },
      {
        label: 'Toggle auto-organize',
        value: async () => {
          config.set('autoOrganize', !config.get('autoOrganize'));
          this.cli.success(`Auto-organize: ${config.get('autoOrganize') ? 'ON' : 'OFF'}`);
        }
      },
      {
        label: 'Reset to defaults',
        value: async () => {
          if (await this.cli.confirm('Reset all settings?', false)) {
            config.reset();
            this.cli.success('Settings reset');
          }
        }
      }
    ];
  }
}
