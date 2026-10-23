"use client";
import { useLanguage } from "./i18n/LanguageContext";
import type { ScoringSource } from "./types";
import styles from "./SecurityDashboard.module.css";

const sourceClass: Record<ScoringSource, string> = {
  AI: styles.scoringAI,
  RULE: styles.scoringRule,
  RULE_FALLBACK: styles.scoringFallback,
};

const sourceLabel: Record<ScoringSource, string> = {
  AI: "AI",
  RULE: "Rules",
  RULE_FALLBACK: "Fallback rules",
};

export function ScoringSourceBadge({ source }: { source: ScoringSource }) {
  const { language } = useLanguage();
  const label = language === "vi" ? ({ AI: "AI", RULE: "Quy tắc", RULE_FALLBACK: "Quy tắc dự phòng" } as const)[source] : sourceLabel[source];
  return (
    <span className={`${styles.scoringBadge} ${sourceClass[source]}`}>
      {label}
    </span>
  );
}
