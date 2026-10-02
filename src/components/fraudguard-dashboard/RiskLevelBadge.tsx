import type { RiskLevel } from "./types";
import styles from "./SecurityDashboard.module.css";

interface RiskLevelBadgeProps {
  riskLevel?: RiskLevel;
  score?: number;
  threshold?: number;
}

export function RiskLevelBadge({
  riskLevel,
  score,
  threshold = 75,
}: RiskLevelBadgeProps) {
  // Determine if anomalous:
  // 1. Explicit Anomaly / Critical / High
  // 2. Score >= threshold (default 75)
  const isAnomaly =
    riskLevel === "Anomaly" ||
    (score !== undefined ? score >= threshold : riskLevel !== "Normal");

  if (isAnomaly) {
    return (
      <span className={styles.anomalyBadge} title={`Giao dịch Bất thường (Score: ${score ?? "N/A"}${threshold ? ` >= ${threshold}` : ""})`}>
        <span className={styles.dotAnomaly} />
        Bất thường
      </span>
    );
  }

  return (
    <span className={styles.normalBadge} title={`Giao dịch Bình thường (Score: ${score ?? "N/A"}${threshold ? ` < ${threshold}` : ""})`}>
      <span className={styles.dotNormal} />
      Bình thường
    </span>
  );
}
