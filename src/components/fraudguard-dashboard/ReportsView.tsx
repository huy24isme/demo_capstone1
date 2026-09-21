"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";
import type { TransactionRisk } from "./types";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface ReportsViewProps {
  transactions: TransactionRisk[];
}

export function ReportsView({ transactions }: ReportsViewProps) {
  const { toast } = useToast();
  const [range, setRange] = useState<number>(30);
  const [filterProject, setFilterProject] = useState<string>("all");

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

    return transactions.filter((t) => {
      const d = new Date(t.processedAt);
      if (d < cutoff) return false;
      if (filterProject !== "all" && t.projectId !== filterProject) return false;
      return true;
    });
  }, [transactions, range, filterProject]);

  // KPIs
  const metrics = useMemo(() => {
    const total = filtered.length;
    const highRisk = filtered.filter(
      (t) => t.riskLevel === "High" || t.riskLevel === "Critical",
    ).length;
    const confirmed = filtered.filter((t) => t.caseStatus === "Confirmed Fraud").length;
    const falseAlarms = filtered.filter((t) => t.caseStatus === "False Alarm").length;
    const resolvedCases = confirmed + falseAlarms;
    const aiCount = filtered.filter((t) => t.scoringSource === "AI").length;
    const fallbackCount = filtered.filter(
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
  }, [filtered]);

  // Data for Case Conclusion Breakdown
  const conclusionData = useMemo(() => {
    return [
      {
        name: "Confirmed Fraud",
        count: filtered.filter((t) => t.caseStatus === "Confirmed Fraud").length,
        color: "#ed6775",
      },
      {
        name: "Reviewing",
        count: filtered.filter((t) => t.caseStatus === "Reviewing").length,
        color: "#eda765",
      },
      {
        name: "False Alarm",
        count: filtered.filter((t) => t.caseStatus === "False Alarm").length,
        color: "#78c9ac",
      },
      {
        name: "Open / No Case",
        count: filtered.filter((t) => !t.caseStatus || t.caseStatus === "Open").length,
        color: "#ad8af3",
      },
    ].filter((d) => d.count > 0);
  }, [filtered]);

  // Data for Scoring Source Distribution
  const scoringData = useMemo(() => {
    return [
      {
        name: "AI Risk Scoring",
        count: filtered.filter((t) => t.scoringSource === "AI").length,
        color: "#ad8af3",
      },
      {
        name: "Rule Engine",
        count: filtered.filter((t) => t.scoringSource === "RULE").length,
        color: "#71b9f4",
      },
      {
        name: "Rule Fallback",
        count: filtered.filter((t) => t.scoringSource === "RULE_FALLBACK").length,
        color: "#eda765",
      },
    ];
  }, [filtered]);

  // Data for Project Risk Breakdown
  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const pTxns = filtered.filter((t) => t.projectId === p.id);
      const highCount = pTxns.filter(
        (t) => t.riskLevel === "High" || t.riskLevel === "Critical",
      ).length;
      const fraudCount = pTxns.filter((t) => t.caseStatus === "Confirmed Fraud").length;
      return {
        name: p.name,
        total: pTxns.length,
        highRisk: highCount,
        confirmed: fraudCount,
      };
    });
  }, [projects, filtered]);

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

  return (
    <>
      <div className={styles.breadcrumb}>
        FraudGuard / Analytics / Performance Reports
      </div>

      <div className={styles.pageHeading}>
        <div>
          <h1>Reports & AI Performance</h1>
          <p>
            Phân tích tỷ lệ phát hiện gian lận, hiệu suất AI Scoring so với Rule Engine và độ chính xác cảnh báo.
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={handleExportSummaryCSV}
          type="button"
        >
          <Download size={15} style={{ marginRight: 6 }} />
          Export Report (CSV)
        </button>
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
          <strong className={styles.statValue}>{metrics.total}</strong>
          <span className={styles.statDescription}>
            Trong {range} ngày qua
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statCritical}`}>
          <div className={styles.statLabel}>Fraud Risk Rate</div>
          <strong className={styles.statValue}>{metrics.fraudRate}%</strong>
          <span className={styles.statDescription}>
            {metrics.highRisk} giao dịch rủi ro cao
          </span>
        </article>
        <article className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statLabel}>False Alarm Rate</div>
          <strong className={styles.statValue}>{metrics.falseAlarmRate}%</strong>
          <span className={styles.statDescription}>Tỷ lệ báo động giả</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>AI Scoring Coverage</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-purple)" }}
          >
            {metrics.aiCoverage}%
          </strong>
          <span className={styles.statDescription}>
            Fallback: {metrics.fallbackRate}%
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
                Kết luận điều tra thực tế từ đội ngũ Risk Staff
              </p>
            </div>
          </div>
          <div className={styles.chartArea} style={{ height: 260 }}>
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
                <th>High Risk Volume</th>
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
