/**
 * Preset Management Module
 * Handles saving/loading time presets for frequently clipped segments
 */

import { db } from '../db/database';
import type { ClipPreset, TimeClip, OperationResult } from '../types';

export class PresetManager {
  /**
   * Save a new preset or update existing one
   */
  save(preset: ClipPreset): OperationResult<number> {
    try {
      if (!preset.name || preset.name.trim() === '') {
        return { success: false, error: 'Preset name is required' };
      }

      if (!preset.clips || preset.clips.length === 0) {
        return { success: false, error: 'At least one clip is required' };
      }

      // Validate clips
      for (const clip of preset.clips) {
        if (!clip.startTime) {
          return { success: false, error: 'Each clip must have a start time' };
        }
        if (!clip.duration && !clip.endTime) {
          return { success: false, error: 'Each clip must have either duration or end time' };
        }
      }

      const id = db.savePreset(preset);
      return { success: true, data: id };
    } catch (error) {
      return { success: false, error: `Failed to save preset: ${error}` };
    }
  }

  /**
   * Get a preset by name
   */
  get(name: string): OperationResult<ClipPreset> {
    try {
      const preset = db.getPreset(name);
      if (!preset) {
        return { success: false, error: `Preset not found: ${name}` };
      }
      return { success: true, data: preset };
    } catch (error) {
      return { success: false, error: `Failed to get preset: ${error}` };
    }
  }

  /**
   * Get all presets
   */
  getAll(): OperationResult<ClipPreset[]> {
    try {
      const presets = db.getAllPresets();
      return { success: true, data: presets };
    } catch (error) {
      return { success: false, error: `Failed to get presets: ${error}` };
    }
  }

  /**
   * Delete a preset
   */
  delete(name: string): OperationResult<boolean> {
    try {
      const deleted = db.deletePreset(name);
      if (!deleted) {
        return { success: false, error: `Preset not found: ${name}` };
      }
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `Failed to delete preset: ${error}` };
    }
  }

  /**
   * Find presets matching a source file pattern
   */
  findMatchingPresets(sourcePath: string): ClipPreset[] {
    const allPresets = db.getAllPresets();

    return allPresets.filter(preset => {
      if (!preset.sourcePattern) return false;
      try {
        const regex = new RegExp(preset.sourcePattern, 'i');
        return regex.test(sourcePath);
      } catch {
        return false;
      }
    });
  }

  /**
   * Create a preset from interactive input
   */
  createFromClips(name: string, clips: TimeClip[], sourcePattern?: string): OperationResult<number> {
    return this.save({
      name,
      clips,
      sourcePattern
    });
  }

  /**
   * Duplicate a preset with a new name
   */
  duplicate(originalName: string, newName: string): OperationResult<number> {
    const original = db.getPreset(originalName);
    if (!original) {
      return { success: false, error: `Preset not found: ${originalName}` };
    }

    return this.save({
      name: newName,
      clips: original.clips,
      sourcePattern: original.sourcePattern
    });
  }

  /**
   * Add a clip to an existing preset
   */
  addClip(presetName: string, clip: TimeClip): OperationResult<number> {
    const preset = db.getPreset(presetName);
    if (!preset) {
      return { success: false, error: `Preset not found: ${presetName}` };
    }

    preset.clips.push(clip);
    return this.save(preset);
  }

  /**
   * Remove a clip from a preset by index
   */
  removeClip(presetName: string, clipIndex: number): OperationResult<number> {
    const preset = db.getPreset(presetName);
    if (!preset) {
      return { success: false, error: `Preset not found: ${presetName}` };
    }

    if (clipIndex < 0 || clipIndex >= preset.clips.length) {
      return { success: false, error: `Invalid clip index: ${clipIndex}` };
    }

    preset.clips.splice(clipIndex, 1);

    if (preset.clips.length === 0) {
      return { success: false, error: 'Cannot remove last clip. Delete the preset instead.' };
    }

    return this.save(preset);
  }

  /**
   * Format preset for display
   */
  formatPreset(preset: ClipPreset): string {
    const lines: string[] = [
      `┌─ Preset: ${preset.name} ─────────────────────────`,
      `│ Source Pattern: ${preset.sourcePattern || '(any)'}`,
      `│ Created: ${preset.createdAt || 'N/A'}`,
      `│ Clips (${preset.clips.length}):`,
    ];

    preset.clips.forEach((clip, idx) => {
      const label = clip.label || `Clip ${idx + 1}`;
      const duration = clip.duration ? `${clip.duration}s` : `→ ${clip.endTime}`;
      lines.push(`│   ${idx + 1}. [${label}] ${clip.startTime} (${duration})`);
    });

    lines.push('└──────────────────────────────────────────────');

    return lines.join('\n');
  }

  /**
   * List all presets in formatted output
   */
  listPresets(): string {
    const presets = db.getAllPresets();

    if (presets.length === 0) {
      return 'No presets saved yet.';
    }

    const lines: string[] = [
      '┌─────────────────────────────────────────────────┐',
      '│              Saved Clip Presets                 │',
      '├─────────────────────────────────────────────────┤',
    ];

    presets.forEach((preset, idx) => {
      const clipCount = preset.clips.length;
      const pattern = preset.sourcePattern ? ` [${preset.sourcePattern}]` : '';
      lines.push(`│ ${idx + 1}. ${preset.name} (${clipCount} clips)${pattern}`);
    });

    lines.push('└─────────────────────────────────────────────────┘');

    return lines.join('\n');
  }

  /**
   * Export presets to JSON
   */
  exportToJson(): string {
    const presets = db.getAllPresets();
    return JSON.stringify(presets, null, 2);
  }

  /**
   * Import presets from JSON
   */
  importFromJson(json: string): OperationResult<number> {
    try {
      const presets: ClipPreset[] = JSON.parse(json);
      let imported = 0;

      for (const preset of presets) {
        const result = this.save(preset);
        if (result.success) {
          imported++;
        }
      }

      return { success: true, data: imported };
    } catch (error) {
      return { success: false, error: `Failed to import presets: ${error}` };
    }
  }
}

export const presets = new PresetManager();
