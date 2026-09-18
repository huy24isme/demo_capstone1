import type { RiskLevel } from "./types";
import styles from "./SecurityDashboard.module.css";

const riskLevelClass: Record<RiskLevel, string> = {
  Critical: styles.critical,
  High: styles.high,
  Medium: styles.medium,
  Low: styles.low,
};

export function RiskLevelBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  return (
    <span className={`${styles.badge} ${riskLevelClass[riskLevel]}`}>
      {riskLevel}
    </span>
  );
}
