/**
 * FZF Integration Module
 * Provides fuzzy file selection using fzf for enhanced file browsing
 */

import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import type { OperationResult } from '../types';

export interface FzfOptions {
  /**
   * Starting directory for file search
   */
  directory?: string;

  /**
   * Allow multiple file selection
   */
  multi?: boolean;

  /**
   * File extensions to filter (e.g., ['mp4', 'mkv', 'mp3'])
   */
  extensions?: string[];

  /**
   * Preview command for fzf
   */
  preview?: boolean;

  /**
   * Custom prompt message
   */
  prompt?: string;

  /**
   * Show hidden files
   */
  showHidden?: boolean;

  /**
   * Search depth limit
   */
  maxDepth?: number;
}

export class FzfSelector {
  /**
   * Escape a shell argument for safe single-quoting
   */
  private escapeForShell(arg: string): string {
    return `'${arg.replace(/'/g, `'"'"'`)}'`;
  }

  /**
   * Check if fzf is available on the system
   */
  async isFzfAvailable(): Promise<boolean> {
    try {
      const proc = Bun.spawn(['fzf', '--version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Select files using fzf
   */
  async selectFiles(options: FzfOptions = {}): Promise<OperationResult<string[]>> {
    const {
      directory = process.cwd(),
      multi = false,
      extensions = [],
      preview = true,
      prompt = 'Select file(s)',
      showHidden = false,
      maxDepth = undefined
    } = options;

    // Check if fzf is available
    if (!(await this.isFzfAvailable())) {
      return {
        success: false,
        error: 'fzf is not installed. Install with: sudo apt install fzf'
      };
    }

    // Validate directory
    if (!existsSync(directory)) {
      return {
        success: false,
        error: `Directory not found: ${directory}`
      };
    }

    if (!statSync(directory).isDirectory()) {
      return {
        success: false,
        error: `Not a directory: ${directory}`
      };
    }

    try {
      const files = await this.runFzf(directory, {
        multi,
        extensions,
        preview,
        prompt,
        showHidden,
        maxDepth
      });

      if (files.length === 0) {
        return {
          success: false,
          error: 'No files selected'
        };
      }

      return {
        success: true,
        data: files
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'FZF selection failed'
      };
    }
  }

  /**
   * Run fzf with specified options
   */
  private async runFzf(
    directory: string,
    options: Required<Omit<FzfOptions, 'directory'>>
  ): Promise<string[]> {
    // Build the shell command for finding files
    let findCmd = `find "${directory}"`;

    if (options.maxDepth !== undefined) {
      findCmd += ` -maxdepth ${options.maxDepth}`;
    }

    if (!options.showHidden) {
      findCmd += ` -not -path '*/\\.*'`;
    }

    findCmd += ' -type f';

    // Add extension filters using proper shell syntax
    if (options.extensions.length > 0) {
      const extPatterns = options.extensions.map(ext => `-name '*.${ext}'`).join(' -o ');
      findCmd += ` \\( ${extPatterns} \\)`;
    }

    // Build fzf arguments
    const fzfArgs: string[] = [
      '--ansi',
      '--border',
      '--height=80%',
      '--reverse',
      `--prompt=${options.prompt} > `,
      '--info=inline',
      '--bind=ctrl-a:select-all,ctrl-d:deselect-all,ctrl-t:toggle-all',
      '--header=Tab: select multiple | Ctrl+A: select all | Enter: confirm | Esc: cancel'
    ];

    if (options.multi) {
      fzfArgs.push('--multi');
    }

    if (options.preview) {
      // Use ffprobe for media files, bat/cat for others
      const previewCmd = `
          file={};
          root="\${FZF_PREVIEW_ROOT:-}";
          if [ -n "$root" ]; then
            case "$file" in
              /*) ;;
              *) file="$root/$file" ;;
            esac;
          fi;
          if [ ! -e "$file" ]; then
            echo "File not found: $file";
            exit 0;
          fi;
          case "$file" in
            *.mp4|*.mkv|*.avi|*.mov|*.webm|*.mp3|*.wav|*.flac|*.aac|*.ogg|*.opus|*.m4a)
              echo "📹 Media File Information:";
              echo "─────────────────────────";
              if command -v ffprobe >/dev/null 2>&1; then
                json=$(ffprobe -v error -of json -show_format -show_streams "$file" 2>/dev/null);
                if [ -z "$json" ]; then
                  echo "Unable to read media info";
                  exit 0;
                fi;
                if command -v jq >/dev/null 2>&1; then
                  fileName=\${file##*/};
                  echo "File: $fileName";
                  echo "$json" | jq -r '"Container: " + (.format.format_name // "N/A")';
                  echo "$json" | jq -r '"Container Name: " + (.format.format_long_name // "N/A")';
                  echo "$json" | jq -r '"Duration: " + (.format.duration // "N/A") + "s"';
                  echo "$json" | jq -r '"Size: " + (.format.size // "N/A") + " bytes"';
                  echo "$json" | jq -r '"Bitrate: " + (.format.bit_rate // "N/A")';
                  video=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "video")) | .[0] // empty');
                  if [ -n "$video" ]; then
                    v_codec=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "video")) | .[0].codec_name // "N/A"');
                    v_width=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "video")) | .[0].width // "?"');
                    v_height=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "video")) | .[0].height // "?"');
                    v_fps=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "video")) | .[0].avg_frame_rate // ""');
                    if [ -n "$v_fps" ] && [ "$v_fps" != "0/0" ] && [ "$v_fps" != "null" ]; then
                      echo "Video: $v_codec \${v_width}x\${v_height} @ $v_fps fps";
                    else
                      echo "Video: $v_codec \${v_width}x\${v_height}";
                    fi;
                  else
                    echo "Video: N/A";
                  fi;
                  audio=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "audio")) | .[0] // empty');
                  if [ -n "$audio" ]; then
                    a_codec=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "audio")) | .[0].codec_name // "N/A"');
                    a_ch=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "audio")) | .[0].channels // ""');
                    a_rate=$(echo "$json" | jq -r '(.streams // []) | map(select(.codec_type == "audio")) | .[0].sample_rate // ""');
                    audio_line="Audio: $a_codec";
                    [ -n "$a_ch" ] && [ "$a_ch" != "null" ] && audio_line="$audio_line \${a_ch}ch";
                    [ -n "$a_rate" ] && [ "$a_rate" != "null" ] && audio_line="$audio_line @ \${a_rate} Hz";
                    echo "$audio_line";
                  else
                    echo "Audio: N/A";
                  fi;
                else
                  fileName=\${file##*/};
                  echo "File: $fileName";
                  format_name=$(echo "$json" | grep -o '"format_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"format_name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/');
                  format_long_name=$(echo "$json" | grep -o '"format_long_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"format_long_name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/');
                  duration=$(echo "$json" | grep -o '"duration"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"duration"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/');
                  size=$(echo "$json" | grep -o '"size"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"size"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/');
                  bit_rate=$(echo "$json" | grep -o '"bit_rate"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"bit_rate"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/');
                  echo "Container: \${format_name:-N/A}";
                  echo "Container Name: \${format_long_name:-N/A}";
                  echo "Duration: \${duration:-N/A}s";
                  echo "Size: \${size:-N/A} bytes";
                  echo "Bitrate: \${bit_rate:-N/A}";
                fi;
              else
                echo "ffprobe not found";
                ls -lh -- "$file";
              fi;
              ;;
            *.txt|*.md|*.json|*.yml|*.yaml|*.sh|*.ts|*.js|*.py)
              if command -v bat >/dev/null 2>&1; then
                bat --color=always --style=numbers --line-range=:50 "$file";
              else
                echo "📄 File Information:";
                echo "─────────────────────────";
                ls -lh -- "$file";
                echo "";
                head -50 "$file" 2>/dev/null || cat "$file";
              fi;
              ;;
            *)
              echo "📄 File Information:";
              echo "─────────────────────────";
              file -- "$file" 2>/dev/null || echo "Unknown file type";
              ls -lh -- "$file";
              ;;
          esac
        `.trim();

      fzfArgs.push(
        '--preview',
        previewCmd,
        '--preview-window=right:50%:wrap'
      );
    }

    // Use shell to execute the piped command properly
    const shellCmd = `${findCmd} 2>/dev/null | fzf ${fzfArgs.map(arg => this.escapeForShell(arg)).join(' ')}`;

    const previewRoot = resolve(directory);
    let proc: ReturnType<typeof Bun.spawn>;

    try {
      proc = Bun.spawn(['bash', '-c', shellCmd], {
        stdin: 'inherit',
        stdout: 'pipe',
        stderr: 'inherit',
        env: {
          ...process.env,
          SHELL: process.env.SHELL && process.env.SHELL.includes('bash') ? process.env.SHELL : 'bash',
          FZF_PREVIEW_ROOT: previewRoot
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`FZF command failed: ${message}`);
    }

    const outputPromise = proc.stdout ? new Response(proc.stdout).text() : Promise.resolve('');
    const [exitCode, output] = await Promise.all([proc.exited, outputPromise]);

    if (exitCode === 0) {
      return output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(f => resolve(f.trim()));
    }

    return [];
  }

  /**
   * Select a single file
   */
  async selectFile(options: Omit<FzfOptions, 'multi'> = {}): Promise<OperationResult<string>> {
    const result = await this.selectFiles({ ...options, multi: false });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data![0]
    };
  }

  /**
   * Select media files specifically
   */
  async selectMediaFiles(directory?: string, multi: boolean = false): Promise<OperationResult<string[]>> {
    return this.selectFiles({
      directory,
      multi,
      extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'],
      preview: true,
      prompt: multi ? 'Select media file(s)' : 'Select media file'
    });
  }
}

export const fzfSelector = new FzfSelector();
