import { RISK_PATTERNS } from '../config/RiskPatterns';

export interface RiskAnalysis {
  score: number;
  patterns: string[];
  shouldEscalate: boolean;
}

export function analyzeRisk(taskDescription: string): RiskAnalysis {
  const lowerTask = taskDescription.toLowerCase();
  let totalScore = 0;
  const matchedPatterns: string[] = [];

  for (const item of RISK_PATTERNS) {
    if (lowerTask.includes(item.pattern.toLowerCase())) {
      totalScore = Math.max(totalScore, item.risk);
      matchedPatterns.push(item.pattern);
    }
  }

  return {
    score: totalScore,
    patterns: matchedPatterns,
    shouldEscalate: totalScore >= 7
  };
}
