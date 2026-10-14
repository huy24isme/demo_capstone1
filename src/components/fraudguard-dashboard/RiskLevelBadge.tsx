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
  const { t, language } = useLanguage();

  if (!riskLevel || riskLevel === 'Undetermined') return <span className={styles.badge}>{language === 'vi' ? 'Chưa thể kết luận' : 'Undetermined'}</span>;
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
