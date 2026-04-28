import { execSync } from 'child_process';
import fs from 'fs';

export interface PkgCommandResult {
  command: string;
  args: string[];
  resolved: boolean;
}

export function resolvePkgCommand(input: string): PkgCommandResult {
  const parts = input.trim().split(/\s+/);
  const action = parts[0]; // e.g., 'pkg'
  const subAction = parts[1]; // e.g., 'install'
  const target = parts[2]; // e.g., 'htop'

  if (action !== 'pkg') {
    return { command: parts[0], args: parts.slice(1), resolved: false };
  }

  // Basic mapping for 'pkg' style commands
  switch (subAction) {
    case 'install':
    case 'add':
      // Map to nix-env if available (Replit use nix), or npm/pip as fallback
      if (fs.existsSync('/run/current-system/sw/bin/nix-env')) {
        return { command: 'nix-env', args: ['-iA', `nixpkgs.${target}`], resolved: true };
      }
      return { command: 'npm', args: ['install', '-g', target], resolved: true };

    case 'search':
      if (fs.existsSync('/run/current-system/sw/bin/nix-env')) {
        return { command: 'nix-env', args: ['-qaP', `.*${target}.*`], resolved: true };
      }
      return { command: 'npm', args: ['search', target], resolved: true };

    case 'list-installed':
      if (fs.existsSync('/run/current-system/sw/bin/nix-env')) {
        return { command: 'nix-env', args: ['-q'], resolved: true };
      }
      return { command: 'npm', args: ['list', '-g', '--depth=0'], resolved: true };

    default:
      return { command: 'echo', args: ['Unknown pkg command'], resolved: true };
  }
}
