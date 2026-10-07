"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Eye } from "lucide-react";
import type {
  CaseStatus,
  InvestigationFinding,
  RolePermissions,
  TransactionRisk,
  UserProfile,
} from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ScoringSourceBadge } from "./ScoringSourceBadge";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";
import styles from "./SecurityDashboard.module.css";

interface ReportsViewProps {
  transactions: TransactionRisk[];
  threshold?: number;
  currentUser?: UserProfile;
  permissions?: RolePermissions;
  onReview?: (transaction: TransactionRisk) => void;
}

function getFindingBadgeStyle(
  finding: InvestigationFinding,
  t: TranslationKey,
): { bg: string; text: string; border: string; label: string } {
  switch (finding) {
    case "Suspicious":
      return {
        bg: "rgba(237, 103, 117, 0.15)",
        text: "var(--security-red)",
        border: "var(--critical-border)",
        label: t.findings.suspicious,
      };
    case "Legitimate":
      return {
        bg: "rgba(120, 201, 172, 0.15)",
        text: "var(--security-green)",
        border: "#3f665a",
        label: t.findings.legitimate,
      };
    case "Need More Info":
      return {
        bg: "rgba(173, 138, 243, 0.15)",
        text: "var(--security-purple)",
        border: "#5c4778",
        label: t.findings.needMoreInfo,
      };
  }
}

function getDecisionBadgeStyle(
  status: CaseStatus,
  t: TranslationKey,
): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case "Reported":
      return {
        label: t.caseStatus.reported,
        bg: "rgba(255, 215, 0, 0.15)",
        text: "#ffd700",
        border: "#8c7b00",
      };
    case "Confirmed Fraud":
      return {
        label: t.caseStatus.confirmedFraud,
        bg: "var(--critical-bg)",
        text: "var(--critical-text)",
        border: "var(--critical-border)",
      };
    case "False Alarm":
      return {
        label: t.caseStatus.falseAlarm,
        bg: "rgba(120, 201, 172, 0.15)",
        text: "var(--security-green)",
        border: "#3f665a",
      };
    case "Resolved":
      return {
        label: t.caseStatus.resolved,
        bg: "rgba(120, 201, 172, 0.15)",
        text: "var(--security-green)",
        border: "#3f665a",
      };
    case "Investigating":
      return {
        label: t.caseStatus.investigating,
        bg: "rgba(173, 138, 243, 0.15)",
        text: "var(--security-purple)",
        border: "#5c4778",
      };
    case "Assigned":
      return {
        label: t.caseStatus.assigned,
        bg: "rgba(113, 185, 244, 0.15)",
        text: "var(--security-blue)",
        border: "#2d5a7b",
      };
    case "Open":
      return {
        label: t.caseStatus.open,
        bg: "rgba(237, 167, 101, 0.15)",
        text: "var(--security-orange)",
        border: "#715139",
      };
  }
}

export function ReportsView({
  transactions,
  threshold = 75,
  currentUser,
  permissions,
  onReview,
}: ReportsViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<number>(30);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterFinding, setFilterFinding] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isInvestigator = currentUser?.role === "Investigator";
  const investigatorName = currentUser?.name || "Nguyễn Văn An";

  /* ─────────────────────────────────────────────────────────────
     INVESTIGATOR SPECIFIC DATA & LOGIC
  ───────────────────────────────────────────────────────────── */
  const investigatorCases = useMemo(() => {
    if (!isInvestigator) return [];
    return transactions.filter(
      (tx) =>
        tx.caseId &&
        (tx.assignedInvestigator === investigatorName ||
          tx.assignedInvestigator === "Nguyễn Văn An"),
    );
  }, [transactions, isInvestigator, investigatorName]);

  const filteredInvestigatorCases = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return investigatorCases
      .filter((tx) => {
        const d = new Date(tx.processedAt);
        if (d < cutoff) return false;
        if (filterProject !== "all" && tx.projectId !== filterProject) return false;
        if (filterStatus !== "all" && tx.caseStatus !== filterStatus) return false;
        if (filterFinding !== "all") {
          if (!tx.investigationReport) return false;
          if (tx.investigationReport.finding !== filterFinding) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime(),
      );
  }, [investigatorCases, range, filterProject, filterStatus, filterFinding]);

  const investigatorStats = useMemo(() => {
    const total = investigatorCases.length;
    const reported = investigatorCases.filter(
      (tx) => tx.caseStatus === "Reported",
    ).length;
    const confirmedFraud = investigatorCases.filter(
      (tx) => tx.caseStatus === "Confirmed Fraud",
    ).length;
    const falseAlarm = investigatorCases.filter(
      (tx) => tx.caseStatus === "False Alarm",
    ).length;
    const investigating = investigatorCases.filter(
      (tx) => tx.caseStatus === "Investigating",
    ).length;
    const resolved = investigatorCases.filter(
      (tx) => tx.caseStatus === "Resolved",
    ).length;

    // Finding breakdown
    const suspiciousFindings = investigatorCases.filter(
      (tx) => tx.investigationReport?.finding === "Suspicious",
    ).length;
    const legitimateFindings = investigatorCases.filter(
      (tx) => tx.investigationReport?.finding === "Legitimate",
    ).length;
    const needMoreInfoFindings = investigatorCases.filter(
      (tx) => tx.investigationReport?.finding === "Need More Info",
    ).length;

    return {
      total,
      reported,
      confirmedFraud,
      falseAlarm,
      investigating,
      resolved,
      suspiciousFindings,
      legitimateFindings,
      needMoreInfoFindings,
    };
  }, [investigatorCases]);

  /* ─────────────────────────────────────────────────────────────
     EXECUTIVE / MACRO DATA & LOGIC (Non-Investigator roles)
  ───────────────────────────────────────────────────────────── */
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    const sourceList = isInvestigator ? investigatorCases : transactions;
    sourceList.forEach((tx) => map.set(tx.projectId, tx.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions, investigatorCases, isInvestigator]);

  const filteredMacro = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return transactions.filter((tx) => {
      const d = new Date(tx.processedAt);
      if (d < cutoff) return false;
      if (filterProject !== "all" && tx.projectId !== filterProject) return false;
      return true;
    });
  }, [transactions, range, filterProject]);

  const macroMetrics = useMemo(() => {
    const total = filteredMacro.length;
    const highRisk = filteredMacro.filter(
      (tx) => tx.riskLevel === "Anomaly" || tx.riskScore >= threshold,
    ).length;
    const confirmed = filteredMacro.filter(
      (tx) => tx.caseStatus === "Confirmed Fraud",
    ).length;
    const falseAlarms = filteredMacro.filter(
      (tx) => tx.caseStatus === "False Alarm",
    ).length;
    const resolvedCases = confirmed + falseAlarms;
    const aiCount = filteredMacro.filter((tx) => tx.scoringSource === "AI").length;
    const fallbackCount = filteredMacro.filter(
      (tx) => tx.scoringSource === "RULE_FALLBACK",
    ).length;

    return {
      total,
      highRisk,
      fraudRate: total > 0 ? ((highRisk / total) * 100).toFixed(1) : "0",
      falseAlarmRate:
        resolvedCases > 0 ? ((falseAlarms / resolvedCases) * 100).toFixed(1) : "0",
      aiCoverage: total > 0 ? ((aiCount / total) * 100).toFixed(1) : "0",
      fallbackRate: total > 0 ? ((fallbackCount / total) * 100).toFixed(1) : "0",
    };
  }, [filteredMacro, threshold]);

  const conclusionData = useMemo(() => {
    return [
      {
        name: t.reportsView.execCharts.legendConfirmed,
        count: filteredMacro.filter((tx) => tx.caseStatus === "Confirmed Fraud").length,
        color: "#ed6775",
      },
      {
        name: t.reportsView.execCharts.legendInvestigating,
        count: filteredMacro.filter(
          (tx) =>
            tx.caseStatus === "Investigating" ||
            tx.caseStatus === "Reported" ||
            tx.caseStatus === "Assigned",
        ).length,
        color: "#eda765",
      },
      {
        name: t.reportsView.execCharts.legendFalseAlarm,
        count: filteredMacro.filter((tx) => tx.caseStatus === "False Alarm").length,
        color: "#78c9ac",
      },
      {
        name: t.reportsView.execCharts.legendOpen,
        count: filteredMacro.filter(
          (tx) => !tx.caseStatus || tx.caseStatus === "Open",
        ).length,
        color: "#ad8af3",
      },
    ].filter((d) => d.count > 0);
  }, [filteredMacro, t]);

  const scoringData = useMemo(() => {
    return [
      {
        name: t.reportsView.execCharts.legendAi,
        count: filteredMacro.filter((tx) => tx.scoringSource === "AI").length,
        color: "#ad8af3",
      },
      {
        name: t.reportsView.execCharts.legendRule,
        count: filteredMacro.filter((tx) => tx.scoringSource === "RULE").length,
        color: "#71b9f4",
      },
      {
        name: t.reportsView.execCharts.legendFallback,
        count: filteredMacro.filter(
          (tx) => tx.scoringSource === "RULE_FALLBACK",
        ).length,
        color: "#eda765",
      },
    ];
  }, [filteredMacro, t]);

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const pTxns = filteredMacro.filter((tx) => tx.projectId === p.id);
      const highCount = pTxns.filter(
        (tx) => tx.riskLevel === "Anomaly" || tx.riskScore >= threshold,
      ).length;
      const fraudCount = pTxns.filter(
        (tx) => tx.caseStatus === "Confirmed Fraud",
      ).length;
      return {
        name: p.name,
        total: pTxns.length,
        highRisk: highCount,
        confirmed: fraudCount,
      };
    });
  }, [projects, filteredMacro, threshold]);

  const handleExportSummaryCSV = () => {
    const headers = [
      "Project Name",
      "Total Analyzed",
      "High Risk Count",
      "Confirmed Fraud",
      "Risk Percentage",
    ];
    const rows = projectStats.map((p) => [
      `"${p.name}"`,
      p.total,
      p.highRisk,
      p.confirmed,
      p.total > 0 ? `${((p.highRisk / p.total) * 100).toFixed(1)}%` : "0%",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `fraudguard_report_summary_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast(
      "success",
      language === "vi"
        ? "Đã xuất báo cáo tổng kết FraudGuard định dạng CSV"
        : "FraudGuard summary report exported to CSV",
    );
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER INVESTIGATOR VIEW
  ───────────────────────────────────────────────────────────── */
  if (isInvestigator) {
    return (
      <>
        <div className={styles.pageHeading}>
          <div>
            <h1>{t.reportsView.invTitle}</h1>
            <p>{t.reportsView.invSubtitle}</p>
          </div>
        </div>

        {/* Investigator KPI Cards */}
        <section className={styles.metricsGrid} style={{ marginTop: 20 }}>
          <article className={styles.statCard}>
            <div className={styles.statLabel}>{t.reportsView.kpis.totalAssigned}</div>
            <strong className={styles.statValue}>{investigatorStats.total}</strong>
            <span className={styles.statDescription}>
              {t.reportsView.kpis.totalAssignedDesc}
            </span>
          </article>
          <article className={`${styles.statCard} ${styles.statWarning}`}>
            <div className={styles.statLabel}>
              {t.reportsView.kpis.awaitingApproval}
            </div>
            <strong className={styles.statValue}>{investigatorStats.reported}</strong>
            <span className={styles.statDescription}>
              {t.reportsView.kpis.awaitingApprovalDesc}
            </span>
          </article>
          <article className={`${styles.statCard} ${styles.statCritical}`}>
            <div className={styles.statLabel}>
              {t.reportsView.kpis.confirmedFraud}
            </div>
            <strong className={styles.statValue}>
              {investigatorStats.confirmedFraud}
            </strong>
            <span className={styles.statDescription}>
              {t.reportsView.kpis.confirmedFraudDesc}
            </span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}>{t.reportsView.kpis.falseAlarm}</div>
            <strong
              className={styles.statValue}
              style={{ color: "var(--security-green)" }}
            >
              {investigatorStats.falseAlarm}
            </strong>
            <span className={styles.statDescription}>
              {t.reportsView.kpis.falseAlarmDesc}
            </span>
          </article>
        </section>

        {/* Toolbar Filters for Investigator */}
        <div className={styles.toolbar} style={{ marginTop: 20, marginBottom: 20 }}>
          <div className={styles.toolbarGroup}>
            <select
              className={styles.control}
              aria-label={t.reportsView.invFilters.timeRange}
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              <option value={7}>{t.reportsView.invFilters.days7}</option>
              <option value={30}>{t.reportsView.invFilters.days30}</option>
              <option value={90}>{t.reportsView.invFilters.days90}</option>
            </select>

            <select
              className={styles.control}
              aria-label={t.reportsView.invFilters.project}
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">{t.reportsView.invFilters.allProjects}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className={styles.control}
              aria-label={t.reportsView.invFilters.finding}
              value={filterFinding}
              onChange={(e) => setFilterFinding(e.target.value)}
            >
              <option value="all">{t.reportsView.invFilters.allFindings}</option>
              <option value="Suspicious">{t.findings.suspicious}</option>
              <option value="Legitimate">{t.findings.legitimate}</option>
              <option value="Need More Info">{t.findings.needMoreInfo}</option>
            </select>

            <select
              className={styles.control}
              aria-label={t.reportsView.invFilters.status}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{t.reportsView.invFilters.allStatuses}</option>
              <option value="Reported">{t.caseStatus.reported}</option>
              <option value="Confirmed Fraud">{t.caseStatus.confirmedFraud}</option>
              <option value="False Alarm">{t.caseStatus.falseAlarm}</option>
              <option value="Resolved">{t.caseStatus.resolved}</option>
              <option value="Investigating">{t.caseStatus.investigating}</option>
            </select>
          </div>
        </div>

        {/* Investigator Case History Table */}
        <section className={`${styles.panel} ${styles.tablePanel}`}>
          <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
            <div>
              <h2>{t.reportsView.invTable.title}</h2>
              <p className={styles.muted}>
                {t.reportsView.invTable.subtitle.replace(
                  "{count}",
                  String(filteredInvestigatorCases.length),
                )}
              </p>
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.reportsView.invTable.colCase}</th>
                  <th>{t.reportsView.invTable.colProject}</th>
                  <th>{t.reportsView.invTable.colScore}</th>
                  <th>{t.reportsView.invTable.colFinding}</th>
                  <th>{t.reportsView.invTable.colDecision}</th>
                  <th>{t.reportsView.invTable.colTime}</th>
                  <th style={{ textAlign: "right" }}>
                    {t.reportsView.invTable.colActions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestigatorCases.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>
                      {t.reportsView.invTable.emptyMessage}
                    </td>
                  </tr>
                ) : (
                  filteredInvestigatorCases.map((tx) => {
                    const findingStyle = tx.investigationReport
                      ? getFindingBadgeStyle(tx.investigationReport.finding, t)
                      : null;
                    const decisionStyle = tx.caseStatus
                      ? getDecisionBadgeStyle(tx.caseStatus, t)
                      : null;

                    return (
                      <tr key={tx.id}>
                        <td>
                          <span className={styles.findingName}>
                            {tx.caseId || "N/A"}
                          </span>
                          <span className={styles.findingMeta}>
                            Ref: {tx.transactionReference}
                          </span>
                          <span className={styles.findingMeta}>
                            Entity: {tx.entityReference}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--security-text)" }}>
                            {tx.projectName}
                          </span>
                          <span className={styles.findingMeta}>
                            {tx.transactionType}
                            {tx.amount != null
                              ? ` · ${tx.amount.toLocaleString(dateLocale)} ${tx.currency}`
                              : ""}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            <RiskLevelBadge riskLevel={tx.riskLevel} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {tx.riskScore}/100
                            </span>
                          </div>
                          <ScoringSourceBadge source={tx.scoringSource} />
                        </td>
                        <td>
                          {findingStyle ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: findingStyle.bg,
                                  color: findingStyle.text,
                                  border: `1px solid ${findingStyle.border}`,
                                  marginBottom: 4,
                                }}
                              >
                                {findingStyle.label}
                              </span>
                              {tx.investigationReport?.notes && (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "var(--security-text-secondary)",
                                    lineHeight: 1.4,
                                    maxWidth: 320,
                                    whiteSpace: "normal",
                                  }}
                                >
                                  {tx.investigationReport.notes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--security-muted)", fontSize: 11 }}>
                              {t.reportsView.invTable.noReportYet}
                            </span>
                          )}
                        </td>
                        <td>
                          {decisionStyle ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 9px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: decisionStyle.bg,
                                color: decisionStyle.text,
                                border: `1px solid ${decisionStyle.border}`,
                              }}
                            >
                              {decisionStyle.label}
                            </span>
                          ) : (
                            <span style={{ color: "var(--security-muted)", fontSize: 11 }}>
                              {tx.caseStatus || t.reportsView.invTable.pendingDecision}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: "var(--security-text)" }}>
                            {new Date(tx.processedAt).toLocaleDateString(dateLocale)}
                          </span>
                          <span className={styles.findingMeta}>
                            {new Date(tx.processedAt).toLocaleTimeString(dateLocale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {onReview && (
                            <button
                              className={styles.button}
                              onClick={() => onReview(tx)}
                              type="button"
                              title={t.reportsView.invTable.viewDetails}
                              style={{ fontSize: 11, padding: "5px 12px" }}
                            >
                              <Eye
                                size={13}
                                style={{ marginRight: 5, verticalAlign: "-2px" }}
                              />
                              {t.reportsView.invTable.viewDetails}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER EXECUTIVE / MACRO VIEW (SME Admin, Operation, Viewer, etc.)
  ───────────────────────────────────────────────────────────── */
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.reportsView.execTitle}</h1>
          <p>{t.reportsView.execSubtitle}</p>
        </div>
        {permissions?.canExport !== false && (
          <button
            className={styles.btnPrimary}
            onClick={handleExportSummaryCSV}
            type="button"
          >
            <Download size={15} style={{ marginRight: 6 }} />
            {t.reportsView.btnExport}
          </button>
        )}
      </div>

      {/* Toolbar Filters */}
      <div className={styles.toolbar} style={{ marginTop: 24, marginBottom: 20 }}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label={t.reportsView.invFilters.timeRange}
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={7}>{t.reportsView.invFilters.days7}</option>
            <option value={30}>{t.reportsView.invFilters.days30}</option>
            <option value={90}>{t.reportsView.invFilters.days90}</option>
          </select>
          <select
            className={styles.control}
            aria-label={t.reportsView.invFilters.project}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">{t.reportsView.invFilters.allProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <section className={styles.metricsGrid}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.reportsView.execKpis.analyzedTxns}</div>
          <strong className={styles.statValue}>{macroMetrics.total}</strong>
          <span className={styles.statDescription}>
            {t.reportsView.execKpis.inLastDays.replace("{range}", String(range))}
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statCritical}`}>
          <div className={styles.statLabel}>{t.reportsView.execKpis.anomalyRate}</div>
          <strong className={styles.statValue}>{macroMetrics.fraudRate}%</strong>
          <span className={styles.statDescription}>
            {t.reportsView.execKpis.anomalyRateDesc
              .replace("{count}", String(macroMetrics.highRisk))
              .replace("{threshold}", String(threshold))}
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statLabel}>
            {t.reportsView.execKpis.falseAlarmRate}
          </div>
          <strong className={styles.statValue}>{macroMetrics.falseAlarmRate}%</strong>
          <span className={styles.statDescription}>
            {t.reportsView.execKpis.falseAlarmRateDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.reportsView.execKpis.aiCoverage}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-purple)" }}
          >
            {macroMetrics.aiCoverage}%
          </strong>
          <span className={styles.statDescription}>
            {t.reportsView.execKpis.fallbackCoverage.replace(
              "{rate}",
              macroMetrics.fallbackRate,
            )}
          </span>
        </article>
      </section>

      {/* Charts Grid */}
      <section className={styles.chartGrid} style={{ marginBottom: 20 }}>
        {/* Chart 1: Case Conclusion Breakdown */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>{t.reportsView.execCharts.outcomesTitle}</h2>
              <p className={styles.muted}>{t.reportsView.execCharts.outcomesDesc}</p>
            </div>
          </div>
          <div className={styles.chartArea} style={{ height: 260 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conclusionData}>
                  <CartesianGrid
                    stroke="var(--security-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--security-muted)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--security-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--security-panel)",
                      border: "1px solid var(--security-border)",
                      borderRadius: 4,
                      color: "var(--security-text)",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {conclusionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Chart 2: Scoring Source Breakdown */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>{t.reportsView.execCharts.scoringTitle}</h2>
              <p className={styles.muted}>{t.reportsView.execCharts.scoringDesc}</p>
            </div>
          </div>
          <div className={styles.chartArea} style={{ height: 260 }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoringData}>
                  <CartesianGrid
                    stroke="var(--security-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--security-muted)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--security-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--security-panel)",
                      border: "1px solid var(--security-border)",
                      borderRadius: 4,
                      color: "var(--security-text)",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoringData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>

      {/* Project Breakdown Table */}
      <section className={`${styles.panel} ${styles.tablePanel}`}>
        <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
          <div>
            <h2>{t.reportsView.execTable.title}</h2>
            <p className={styles.muted}>{t.reportsView.execTable.subtitle}</p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.reportsView.execTable.colProject}</th>
                <th>{t.reportsView.execTable.colTotal}</th>
                <th>{t.reportsView.execTable.colAnomaly}</th>
                <th>{t.reportsView.execTable.colConfirmed}</th>
                <th>{t.reportsView.execTable.colRate}</th>
              </tr>
            </thead>
            <tbody>
              {projectStats.map((stat) => (
                <tr key={stat.name}>
                  <td style={{ fontWeight: 600, color: "var(--security-text)" }}>
                    {stat.name}
                  </td>
                  <td>{stat.total.toLocaleString(dateLocale)}</td>
                  <td style={{ color: "var(--security-orange)" }}>
                    {stat.highRisk}
                  </td>
                  <td style={{ color: "var(--security-red)", fontWeight: 600 }}>
                    {stat.confirmed}
                  </td>
                  <td>
                    {stat.total > 0
                      ? `${((stat.highRisk / stat.total) * 100).toFixed(1)}%`
                      : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
