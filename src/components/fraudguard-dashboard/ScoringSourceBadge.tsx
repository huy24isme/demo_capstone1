import type { ScoringSource } from "./types";
import styles from "./SecurityDashboard.module.css";

const sourceClass: Record<ScoringSource, string> = {
  AI: styles.scoringAI,
  RULE: styles.scoringRule,
  RULE_FALLBACK: styles.scoringFallback,
};

const sourceLabel: Record<ScoringSource, string> = {
  AI: "AI",
  RULE: "Rule",
  RULE_FALLBACK: "Fallback",
};

export function ScoringSourceBadge({ source }: { source: ScoringSource }) {
  return (
    <span className={`${styles.scoringBadge} ${sourceClass[source]}`}>
      {sourceLabel[source]}
    </span>
  );
}
