import { describe, expect, it } from 'bun:test';
import { resolveAppPaths } from '@/app/paths';

describe('resolveAppPaths defaultOutputDir', () => {
  it('falls back to the instantiation directory (cwd)', () => {
    const paths = resolveAppPaths({
      baseDir: '/tmp/mtk-home',
      cwd: '/media/clips',
      env: {}
    });

    expect(paths.defaultOutputDir).toBe('/media/clips');
  });

  it('prefers the MULTIMEDIA_TOOLKIT_OUTPUT_DIR environment variable over cwd', () => {
    const paths = resolveAppPaths({
      baseDir: '/tmp/mtk-home',
      cwd: '/media/clips',
      env: { MULTIMEDIA_TOOLKIT_OUTPUT_DIR: '/mnt/exported' }
    });

    expect(paths.defaultOutputDir).toBe('/mnt/exported');
  });

  it('prefers an explicit defaultOutputDir over the environment variable', () => {
    const paths = resolveAppPaths({
      baseDir: '/tmp/mtk-home',
      defaultOutputDir: '/tmp/mtk-explicit',
      cwd: '/media/clips',
      env: { MULTIMEDIA_TOOLKIT_OUTPUT_DIR: '/mnt/exported' }
    });

    expect(paths.defaultOutputDir).toBe('/tmp/mtk-explicit');
  });

  it('uses process.cwd() when no cwd option is provided', () => {
    const paths = resolveAppPaths({ baseDir: '/tmp/mtk-home', env: {} });

    expect(paths.defaultOutputDir).toBe(process.cwd());
  });
});
