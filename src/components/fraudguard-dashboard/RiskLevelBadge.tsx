"use client";

import type { RiskLevel } from "./types";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface RiskLevelBadgeProps {
  riskLevel?: RiskLevel;

}

export function RiskLevelBadge({
  riskLevel,

}: RiskLevelBadgeProps) {
  const { t } = useLanguage();

  const isAnomaly = riskLevel === "Abnormal";

  if (isAnomaly) {
    return (
      <span
        className={styles.anomalyBadge}
        title={t.risk.anomalyTitle}
      >
        <span className={styles.dotAnomaly} />
        {t.risk.anomaly}
      </span>
    );
  }

  return (
    <span
      className={styles.normalBadge}
      title={t.risk.normalTitle}
    >
      <span className={styles.dotNormal} />
      {t.risk.normal}
    </span>
  );
}
