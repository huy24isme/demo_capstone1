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
import {
  Download,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
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
import styles from "./SecurityDashboard.module.css";

interface ReportsViewProps {
  transactions: TransactionRisk[];
  threshold?: number;
  currentUser?: UserProfile;
  permissions?: RolePermissions;
  onReview?: (transaction: TransactionRisk) => void;
}

const FINDING_BADGE_STYLE: Record<
  InvestigationFinding,
  { bg: string; text: string; border: string; label: string }
> = {
  Suspicious: {
    bg: "rgba(237, 103, 117, 0.15)",
    text: "var(--security-red)",
    border: "var(--critical-border)",
    label: "Suspicious (Khả nghi)",
  },
  Legitimate: {
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
    label: "Legitimate (Hợp lệ)",
  },
  "Need More Info": {
    bg: "rgba(173, 138, 243, 0.15)",
    text: "var(--security-purple)",
    border: "#5c4778",
    label: "Need More Info (Cần thêm tin)",
  },
};

const DECISION_BADGE_STYLE: Record<
  CaseStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  Reported: {
    label: "Chờ Operation duyệt",
    bg: "rgba(255, 215, 0, 0.15)",
    text: "#ffd700",
    border: "#8c7b00",
  },
  "Confirmed Fraud": {
    label: "Gian lận (Đã duyệt)",
    bg: "var(--critical-bg)",
    text: "var(--critical-text)",
    border: "var(--critical-border)",
  },
  "False Alarm": {
    label: "Báo động giả (Đã duyệt)",
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
  },
  Resolved: {
    label: "Đã đóng case",
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
  },
  Investigating: {
    label: "Đang xác minh",
    bg: "rgba(173, 138, 243, 0.15)",
    text: "var(--security-purple)",
    border: "#5c4778",
  },
  Assigned: {
    label: "Đã giao việc",
    bg: "rgba(113, 185, 244, 0.15)",
    text: "var(--security-blue)",
    border: "#2d5a7b",
  },
  Open: {
    label: "Chưa phân công",
    bg: "rgba(237, 167, 101, 0.15)",
    text: "var(--security-orange)",
    border: "#715139",
  },
};

export function ReportsView({
  transactions,
  threshold = 75,
  currentUser,
  permissions,
  onReview,
}: ReportsViewProps) {
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
      (t) =>
        t.caseId &&
        (t.assignedInvestigator === investigatorName ||
          t.assignedInvestigator === "Nguyễn Văn An"),
    );
  }, [transactions, isInvestigator, investigatorName]);

  const filteredInvestigatorCases = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return investigatorCases
      .filter((t) => {
        const d = new Date(t.processedAt);
        if (d < cutoff) return false;
        if (filterProject !== "all" && t.projectId !== filterProject) return false;
        if (filterStatus !== "all" && t.caseStatus !== filterStatus) return false;
        if (filterFinding !== "all") {
          if (!t.investigationReport) return false;
          if (t.investigationReport.finding !== filterFinding) return false;
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
      (t) => t.caseStatus === "Reported",
    ).length;
    const confirmedFraud = investigatorCases.filter(
      (t) => t.caseStatus === "Confirmed Fraud",
    ).length;
    const falseAlarm = investigatorCases.filter(
      (t) => t.caseStatus === "False Alarm",
    ).length;
    const investigating = investigatorCases.filter(
      (t) => t.caseStatus === "Investigating",
    ).length;
    const resolved = investigatorCases.filter(
      (t) => t.caseStatus === "Resolved",
    ).length;

    // Finding breakdown
    const suspiciousFindings = investigatorCases.filter(
      (t) => t.investigationReport?.finding === "Suspicious",
    ).length;
    const legitimateFindings = investigatorCases.filter(
      (t) => t.investigationReport?.finding === "Legitimate",
    ).length;
    const needMoreInfoFindings = investigatorCases.filter(
      (t) => t.investigationReport?.finding === "Need More Info",
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
    sourceList.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions, investigatorCases, isInvestigator]);

  const filteredMacro = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return transactions.filter((t) => {
      const d = new Date(t.processedAt);
      if (d < cutoff) return false;
      if (filterProject !== "all" && t.projectId !== filterProject) return false;
      return true;
    });
  }, [transactions, range, filterProject]);

  const macroMetrics = useMemo(() => {
    const total = filteredMacro.length;
    const highRisk = filteredMacro.filter(
      (t) => t.riskLevel === "Anomaly" || t.riskScore >= threshold,
    ).length;
    const confirmed = filteredMacro.filter(
      (t) => t.caseStatus === "Confirmed Fraud",
    ).length;
    const falseAlarms = filteredMacro.filter(
      (t) => t.caseStatus === "False Alarm",
    ).length;
    const resolvedCases = confirmed + falseAlarms;
    const aiCount = filteredMacro.filter((t) => t.scoringSource === "AI").length;
    const fallbackCount = filteredMacro.filter(
      (t) => t.scoringSource === "RULE_FALLBACK",
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
        name: "Confirmed Fraud",
        count: filteredMacro.filter((t) => t.caseStatus === "Confirmed Fraud").length,
        color: "#ed6775",
      },
      {
        name: "Investigating / Reported",
        count: filteredMacro.filter(
          (t) =>
            t.caseStatus === "Investigating" ||
            t.caseStatus === "Reported" ||
            t.caseStatus === "Assigned",
        ).length,
        color: "#eda765",
      },
      {
        name: "False Alarm",
        count: filteredMacro.filter((t) => t.caseStatus === "False Alarm").length,
        color: "#78c9ac",
      },
      {
        name: "Open / No Case",
        count: filteredMacro.filter(
          (t) => !t.caseStatus || t.caseStatus === "Open",
        ).length,
        color: "#ad8af3",
      },
    ].filter((d) => d.count > 0);
  }, [filteredMacro]);

  const scoringData = useMemo(() => {
    return [
      {
        name: "AI Risk Scoring",
        count: filteredMacro.filter((t) => t.scoringSource === "AI").length,
        color: "#ad8af3",
      },
      {
        name: "Rule Engine",
        count: filteredMacro.filter((t) => t.scoringSource === "RULE").length,
        color: "#71b9f4",
      },
      {
        name: "Rule Fallback",
        count: filteredMacro.filter(
          (t) => t.scoringSource === "RULE_FALLBACK",
        ).length,
        color: "#eda765",
      },
    ];
  }, [filteredMacro]);

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const pTxns = filteredMacro.filter((t) => t.projectId === p.id);
      const highCount = pTxns.filter(
        (t) => t.riskLevel === "Anomaly" || t.riskScore >= threshold,
      ).length;
      const fraudCount = pTxns.filter(
        (t) => t.caseStatus === "Confirmed Fraud",
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

    toast("success", "Đã xuất báo cáo tổng kết FraudGuard định dạng CSV");
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER INVESTIGATOR VIEW
  ───────────────────────────────────────────────────────────── */
  if (isInvestigator) {
    return (
      <>
        <div className={styles.pageHeading}>
          <div>
            <h1>Investigation History</h1>
            <p>
              Xem lại danh sách hồ sơ bạn ({investigatorName}) đã thẩm định, kết quả báo cáo điều tra và quyết định phê duyệt từ Operation Team Leader.
            </p>
          </div>
        </div>

        {/* Investigator KPI Cards */}
        <section className={styles.metricsGrid} style={{ marginTop: 20 }}>
          <article className={styles.statCard}>
            <div className={styles.statLabel}>Tổng hồ sơ thụ lý</div>
            <strong className={styles.statValue}>{investigatorStats.total}</strong>
            <span className={styles.statDescription}>
              Hồ sơ được phân công cho bạn
            </span>
          </article>
          <article className={`${styles.statCard} ${styles.statWarning}`}>
            <div className={styles.statLabel}>Chờ phê duyệt (Reported)</div>
            <strong className={styles.statValue}>{investigatorStats.reported}</strong>
            <span className={styles.statDescription}>
              Đã nộp báo cáo, chờ Team Leader
            </span>
          </article>
          <article className={`${styles.statCard} ${styles.statCritical}`}>
            <div className={styles.statLabel}>Xác nhận gian lận</div>
            <strong className={styles.statValue}>
              {investigatorStats.confirmedFraud}
            </strong>
            <span className={styles.statDescription}>
              Operation đã phê duyệt gian lận
            </span>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statLabel}>Cảnh báo sai (False Alarm)</div>
            <strong
              className={styles.statValue}
              style={{ color: "var(--security-green)" }}
            >
              {investigatorStats.falseAlarm}
            </strong>
            <span className={styles.statDescription}>
              Operation phê duyệt hợp lệ
            </span>
          </article>
        </section>

        {/* Toolbar Filters for Investigator */}
        <div className={styles.toolbar} style={{ marginTop: 20, marginBottom: 20 }}>
          <div className={styles.toolbarGroup}>
            <select
              className={styles.control}
              aria-label="Khoảng thời gian"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              <option value={7}>7 ngày gần nhất</option>
              <option value={30}>30 ngày gần nhất</option>
              <option value={90}>90 ngày gần nhất</option>
            </select>

            <select
              className={styles.control}
              aria-label="Dự án"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className={styles.control}
              aria-label="Kết luận của bạn"
              value={filterFinding}
              onChange={(e) => setFilterFinding(e.target.value)}
            >
              <option value="all">Tất cả đề xuất thẩm định</option>
              <option value="Suspicious">Khả nghi (Suspicious)</option>
              <option value="Legitimate">Hợp lệ (Legitimate)</option>
              <option value="Need More Info">Cần bổ sung tin (Need More Info)</option>
            </select>

            <select
              className={styles.control}
              aria-label="Trạng thái phê duyệt"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái hồ sơ</option>
              <option value="Reported">Chờ Operation duyệt (Reported)</option>
              <option value="Confirmed Fraud">Gian lận xác nhận (Confirmed Fraud)</option>
              <option value="False Alarm">Cảnh báo sai (False Alarm)</option>
              <option value="Resolved">Đã đóng (Resolved)</option>
              <option value="Investigating">Đang điều tra (Investigating)</option>
            </select>
          </div>
        </div>

        {/* Investigator Case History Table */}
        <section className={`${styles.panel} ${styles.tablePanel}`}>
          <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
            <div>
              <h2>Danh sách hồ sơ điều tra cá nhân</h2>
              <p className={styles.muted}>
                {filteredInvestigatorCases.length} hồ sơ phù hợp bộ lọc hiện tại
              </p>
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Case ID / Tham chiếu</th>
                  <th>Dự án / Giao dịch</th>
                  <th>Risk Score</th>
                  <th>Báo cáo điều tra của bạn</th>
                  <th>Quyết định phê duyệt (Operation)</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestigatorCases.length === 0 ? (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>
                      Không tìm thấy hồ sơ nào phù hợp với bộ lọc đã chọn.
                    </td>
                  </tr>
                ) : (
                  filteredInvestigatorCases.map((tx) => {
                    const findingStyle = tx.investigationReport
                      ? FINDING_BADGE_STYLE[tx.investigationReport.finding]
                      : null;
                    const decisionStyle = tx.caseStatus
                      ? DECISION_BADGE_STYLE[tx.caseStatus]
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
                              ? ` · ${tx.amount.toLocaleString("en")} ${tx.currency}`
                              : ""}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
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
                              Chưa nộp báo cáo
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
                              {tx.caseStatus || "Chờ xử lý"}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: "var(--security-text)" }}>
                            {new Date(tx.processedAt).toLocaleDateString("vi-VN")}
                          </span>
                          <span className={styles.findingMeta}>
                            {new Date(tx.processedAt).toLocaleTimeString("vi-VN", {
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
                              title="Xem chi tiết hồ sơ & chứng cứ"
                              style={{ fontSize: 11, padding: "5px 12px" }}
                            >
                              <Eye size={13} style={{ marginRight: 5, verticalAlign: "-2px" }} />
                              Chi tiết
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
          <h1>Reports & AI Performance</h1>
          <p>
            Phân tích tỷ lệ phát hiện gian lận, hiệu suất AI Scoring so với Rule Engine và độ chính xác cảnh báo.
          </p>
        </div>
        {permissions?.canExport !== false && (
          <button
            className={styles.btnPrimary}
            onClick={handleExportSummaryCSV}
            type="button"
          >
            <Download size={15} style={{ marginRight: 6 }} />
            Export Report (CSV)
          </button>
        )}
      </div>

      {/* Toolbar Filters */}
      <div className={styles.toolbar} style={{ marginTop: 24, marginBottom: 20 }}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label="Khoảng thời gian"
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={7}>7 ngày gần nhất</option>
            <option value={30}>30 ngày gần nhất</option>
            <option value={90}>90 ngày gần nhất</option>
          </select>
          <select
            className={styles.control}
            aria-label="Dự án"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">Tất cả dự án</option>
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
          <div className={styles.statLabel}>Analyzed Transactions</div>
          <strong className={styles.statValue}>{macroMetrics.total}</strong>
          <span className={styles.statDescription}>
            Trong {range} ngày qua
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statCritical}`}>
          <div className={styles.statLabel}>Tỷ lệ Bất thường (Anomaly Rate)</div>
          <strong className={styles.statValue}>{macroMetrics.fraudRate}%</strong>
          <span className={styles.statDescription}>
            {macroMetrics.highRisk} giao dịch bất thường (Score &ge; {threshold})
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statLabel}>False Alarm Rate</div>
          <strong className={styles.statValue}>{macroMetrics.falseAlarmRate}%</strong>
          <span className={styles.statDescription}>Tỷ lệ báo động giả</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>AI Scoring Coverage</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-purple)" }}
          >
            {macroMetrics.aiCoverage}%
          </strong>
          <span className={styles.statDescription}>
            Fallback: {macroMetrics.fallbackRate}%
          </span>
        </article>
      </section>

      {/* Charts Grid */}
      <section className={styles.chartGrid} style={{ marginBottom: 20 }}>
        {/* Chart 1: Case Conclusion Breakdown */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Case Investigation Outcomes</h2>
              <p className={styles.muted}>
                Kết luận điều tra thực tế từ đội ngũ Điều tra viên & Vận hành
              </p>
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
              <h2>Scoring Engine Reliability</h2>
              <p className={styles.muted}>Tỷ trọng AI vs Rule Engine vs Fallback</p>
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
            <h2>Project Performance Breakdown</h2>
            <p className={styles.muted}>
              Thống kê chi tiết khối lượng giao dịch và gian lận theo từng nguồn tích hợp
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Total Analyzed</th>
                <th>Bất thường (Anomaly)</th>
                <th>Confirmed Fraud</th>
                <th>Risk Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {projectStats.map((stat) => (
                <tr key={stat.name}>
                  <td style={{ fontWeight: 600, color: "var(--security-text)" }}>
                    {stat.name}
                  </td>
                  <td>{stat.total.toLocaleString("en")}</td>
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
