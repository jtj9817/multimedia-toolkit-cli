/**
 * FZF Integration Module
 * Provides fuzzy file selection using fzf for enhanced file browsing
 */

import { spawn } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve, relative, join } from 'path';
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
    return new Promise((resolve) => {
      const proc = spawn('which', ['fzf'], { stdio: 'pipe' });
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
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
    return new Promise((resolvePromise, reject) => {
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
          if [[ -n "$root" && "$file" != /* ]]; then
            file="$root/$file";
          fi;
          if [[ ! -e "$file" ]]; then
            echo "File not found: $file";
            exit 0;
          fi;
          if [[ "$file" =~ \\.(mp4|mkv|avi|mov|webm|mp3|wav|flac|aac|ogg|opus|m4a)$ ]]; then
            echo "📹 Media File Information:";
            echo "─────────────────────────";
            if command -v ffprobe &>/dev/null; then
              ffprobe -v quiet -print_format json -show_format "$file" 2>/dev/null |
                jq -r '.format | "Duration: \\(.duration // "N/A")s\\nSize: \\(.size // "N/A") bytes\\nBitrate: \\(.bit_rate // "N/A")\\nFormat: \\(.format_name // "N/A")"' 2>/dev/null ||
                echo "Unable to read media info (ffprobe/jq error)";
            else
              echo "ffprobe not found";
              ls -lh -- "$file";
            fi;
          elif command -v bat &>/dev/null && [[ "$file" =~ \\.(txt|md|json|yml|yaml|sh|ts|js|py)$ ]]; then
            bat --color=always --style=numbers --line-range=:50 "$file";
          else
            echo "📄 File Information:";
            echo "─────────────────────────";
            if command -v bun &>/dev/null; then
              bun -e '(async () => {
                const path = process.argv[1];
                if (!path) {
                  console.error("No path provided");
                  process.exit(1);
                }
                const file = Bun.file(path);
                const stats = await file.stat();
                const formatMs = (ms) => (typeof ms === "number" ? new Date(ms).toISOString() : "N/A");
                const lines = [
                  ["Path", path],
                  ["Size", stats.size + " bytes"],
                  ["Mode", stats.mode],
                  ["UID", stats.uid],
                  ["GID", stats.gid],
                  ["Accessed", formatMs(stats.atimeMs)],
                  ["Modified", formatMs(stats.mtimeMs)],
                  ["Changed", formatMs(stats.ctimeMs)],
                  ["Birth", formatMs(stats.birthtimeMs)],
                  ["Last Modified", file.lastModified]
                ];
                for (const [label, value] of lines) {
                  console.log(label + ": " + value);
                }
              })().catch((err) => {
                console.error(err?.message || err);
                process.exit(1);
              });' -- "$file";
            else
              file -- "$file";
              echo "";
              ls -lh -- "$file";
            fi;
          fi
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
      const proc = spawn('bash', ['-c', shellCmd], {
        stdio: ['inherit', 'pipe', 'inherit'],
        env: {
          ...process.env,
          SHELL: process.env.SHELL && process.env.SHELL.includes('bash') ? process.env.SHELL : 'bash',
          FZF_PREVIEW_ROOT: previewRoot
        }
      });

      let output = '';

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      proc.on('error', (err) => {
        reject(new Error(`FZF command failed: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const files = output
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(f => resolve(f.trim()));
          resolvePromise(files);
        } else if (code === 1) {
          // No match found or user pressed Esc
          resolvePromise([]);
        } else if (code === 130) {
          // User canceled with Ctrl+C
          resolvePromise([]);
        } else {
          // Other exit codes - treat as canceled
          resolvePromise([]);
        }
      });
    });
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
