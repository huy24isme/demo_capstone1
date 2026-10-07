"use client";

import type { RiskLevel } from "./types";
import { useLanguage } from "./i18n/LanguageContext";
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
  const { t } = useLanguage();

  // Determine if anomalous:
  // 1. Explicit Anomaly / Critical / High
  // 2. Score >= threshold (default 75)
  const isAnomaly =
    riskLevel === "Anomaly" ||
    (score !== undefined ? score >= threshold : riskLevel !== "Normal");

  if (isAnomaly) {
    return (
      <span
        className={styles.anomalyBadge}
        title={`${t.risk.anomalyTitle} (Score: ${score ?? "N/A"}${threshold ? ` >= ${threshold}` : ""})`}
      >
        <span className={styles.dotAnomaly} />
        {t.risk.anomaly}
      </span>
    );
  }

  return (
    <span
      className={styles.normalBadge}
      title={`${t.risk.normalTitle} (Score: ${score ?? "N/A"}${threshold ? ` < ${threshold}` : ""})`}
    >
      <span className={styles.dotNormal} />
      {t.risk.normal}
    </span>
  );
}
