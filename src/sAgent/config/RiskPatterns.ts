export interface RiskPattern {
  pattern: string;
  risk: number;
}

export const RISK_PATTERNS: RiskPattern[] = [
  { pattern: 'restart workflow', risk: 10 },
  { pattern: 'edit replit.nix', risk: 10 },
  { pattern: 'edit .replit', risk: 10 },
  { pattern: 'drop table', risk: 9 },
  { pattern: 'delete database', risk: 9 },
  { pattern: 'rm -rf /', risk: 10 },
  { pattern: 'truncate table', risk: 8 },
  { pattern: 'npm install', risk: 5 },
  { pattern: 'pnpm install', risk: 7 },
  { pattern: 'modify server.ts', risk: 8 },
  { pattern: 'change cors', risk: 8 },
  { pattern: 'disable auth', risk: 9 },
  { pattern: 'bypass security', risk: 10 },
  { pattern: 'hard reset', risk: 9 },
  { pattern: 'git push --force', risk: 10 },
  { pattern: 'chmod 777', risk: 8 },
  { pattern: 'killall', risk: 7 },
  { pattern: 'shutdown', risk: 10 },
  { pattern: 'reboot', risk: 10 },
  { pattern: 'overwriting critical config', risk: 9 },
  { pattern: 'manual port change', risk: 8 },
  { pattern: 'disable firewall', risk: 9 }
];
