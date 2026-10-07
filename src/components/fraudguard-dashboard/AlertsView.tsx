"use client";

import { useMemo, useState } from "react";
import type { CaseStatus, TransactionRisk } from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ScoringSourceBadge } from "./ScoringSourceBadge";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface AlertsViewProps {
  transactions: TransactionRisk[];
  onReview: (transaction: TransactionRisk) => void;
}

export function AlertsView({ transactions, onReview }: AlertsViewProps) {
  const { t, language } = useLanguage();
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const alerts = useMemo(() => {
    return transactions
      .filter((t) => t.alertId)
      .filter((t) => filterRisk === "all" || t.riskLevel === filterRisk)
      .filter((t) => filterProject === "all" || t.projectId === filterProject)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  }, [transactions, filterRisk, filterProject]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    transactions.filter((t) => t.alertId).forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions]);

  const stats = useMemo(
    () => ({
      total: alerts.length,
      anomaly: alerts.filter((t) => t.riskLevel === "Anomaly" || t.riskScore >= 75).length,
      withoutCase: alerts.filter((t) => !t.caseId).length,
    }),
    [alerts],
  );

  const getStatusLabel = (status?: CaseStatus) => {
    switch (status) {
      case "Open":
        return t.caseStatus.open;
      case "Assigned":
        return t.caseStatus.assigned;
      case "Investigating":
        return t.caseStatus.investigating;
      case "Reported":
        return t.caseStatus.reported;
      case "Confirmed Fraud":
        return t.caseStatus.confirmedFraud;
      case "False Alarm":
        return t.caseStatus.falseAlarm;
      case "Resolved":
        return t.caseStatus.resolved;
      default:
        return status || t.alertsView.noCaseLabel;
    }
  };

  const numLocale = language === "vi" ? "vi-VN" : "en-US";

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.alertsView.title}</h1>
          <p>{t.alertsView.subtitle}</p>
        </div>
      </div>

      {/* Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.alertsView.kpis.totalAlerts}</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>{t.alertsView.kpis.totalAlertsDesc}</span>
        </article>
        <article className={`${styles.statCard} ${styles.statCritical}`}>
          <div className={styles.statLabel}>{t.alertsView.kpis.anomaly}</div>
          <strong className={styles.statValue}>{stats.anomaly}</strong>
          <span className={styles.statDescription}>{t.alertsView.kpis.anomalyDesc}</span>
        </article>
        <article className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statLabel}>{t.alertsView.kpis.withoutCase}</div>
          <strong className={styles.statValue}>{stats.withoutCase}</strong>
          <span className={styles.statDescription}>{t.alertsView.kpis.withoutCaseDesc}</span>
        </article>
      </section>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label={t.alertsView.filterRiskLabel}
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
          >
            <option value="all">{t.alertsView.filterAllAlerts}</option>
            <option value="Anomaly">{t.alertsView.filterAnomaly}</option>
            <option value="Normal">{t.alertsView.filterNormal}</option>
          </select>
          <select
            className={styles.control}
            aria-label={t.alertsView.filterProjectLabel}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">{t.alertsView.filterAllProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.length === 0 ? (
          <div className={styles.panel} style={{ padding: 40, textAlign: "center" }}>
            <p className={styles.muted}>{t.alertsView.emptyMessage}</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className={styles.panel} style={{ padding: "14px 17px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <RiskLevelBadge riskLevel={alert.riskLevel} />
                    <ScoringSourceBadge source={alert.scoringSource} />
                    <span style={{ color: "var(--security-muted)", fontSize: 11 }}>
                      {alert.alertId}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--security-text)",
                      marginBottom: 4,
                    }}
                  >
                    {alert.transactionReference} — {alert.projectName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--security-muted)", marginBottom: 6 }}>
                    {alert.transactionType} · Entity: {alert.entityReference}
                    {alert.amount != null &&
                      ` · ${alert.amount.toLocaleString(numLocale)} ${alert.currency || "VND"}`}
                  </div>
                  {alert.triggeredRules.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {alert.triggeredRules.map((rule) => (
                        <span key={rule} className={styles.ruleTag}>
                          {rule}
                        </span>
                      ))}
                    </div>
                  )}
                  {alert.explanation && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "var(--security-text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {alert.explanation}
                    </p>
                  )}
                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--security-subtle)" }}>
                    {t.alertsView.scoreLabel} {alert.riskScore}/100
                    {alert.confidence != null &&
                      ` · ${t.alertsView.confidenceLabel} ${(alert.confidence * 100).toFixed(0)}%`}
                    {` · ${new Date(alert.processedAt).toLocaleString(numLocale)}`}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    className={styles.button}
                    onClick={() => onReview(alert)}
                    type="button"
                  >
                    {t.alertsView.reviewBtn}
                  </button>
                  <span
                    className={styles.muted}
                    style={{ fontSize: 10, textAlign: "center" }}
                  >
                    {alert.caseId ? getStatusLabel(alert.caseStatus) : t.alertsView.noCaseLabel}
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
