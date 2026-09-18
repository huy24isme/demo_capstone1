"use client";

import { useMemo, useState } from "react";
import type { CaseStatus, TransactionRisk } from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface CasesViewProps {
  transactions: TransactionRisk[];
  onUpdateTransaction: (updated: TransactionRisk) => void;
  onReview: (transaction: TransactionRisk) => void;
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  Open: styles.high,
  Reviewing: styles.medium,
  "Confirmed Fraud": styles.critical,
  "False Alarm": styles.low,
  Resolved: styles.low,
};

const ALL_STATUSES: CaseStatus[] = ["Open", "Reviewing", "Confirmed Fraud", "False Alarm", "Resolved"];

export function CasesView({ transactions, onUpdateTransaction, onReview }: CasesViewProps) {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const cases = useMemo(() => {
    return transactions
      .filter((t) => t.caseId)
      .filter((t) => filterStatus === "all" || t.caseStatus === filterStatus)
      .filter((t) => filterProject === "all" || t.projectId === filterProject)
      .sort((a, b) => {
        const order: Record<string, number> = { Open: 0, Reviewing: 1, "Confirmed Fraud": 2, "False Alarm": 3, Resolved: 4 };
        return (order[a.caseStatus || ""] ?? 5) - (order[b.caseStatus || ""] ?? 5);
      });
  }, [transactions, filterStatus, filterProject]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    transactions.filter((t) => t.caseId).forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions]);

  const stats = useMemo(() => ({
    total: cases.length,
    open: transactions.filter((t) => t.caseStatus === "Open").length,
    reviewing: transactions.filter((t) => t.caseStatus === "Reviewing").length,
    confirmed: transactions.filter((t) => t.caseStatus === "Confirmed Fraud").length,
  }), [cases.length, transactions]);

  const handleStatusChange = (tx: TransactionRisk, newStatus: CaseStatus) => {
    onUpdateTransaction({ ...tx, caseStatus: newStatus });
    toast("success", `Case ${tx.caseId} updated to ${newStatus}`);
  };

  return (
    <>
      <div className={styles.breadcrumb}>FraudGuard / Monitoring / Active Cases</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Active Cases</h1>
          <p>Quản lý case điều tra, phân công và cập nhật kết luận</p>
        </div>
      </div>

      {/* Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Total cases</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>Tất cả case</span>
        </article>
        <article className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statLabel}>Open</div>
          <strong className={styles.statValue}>{stats.open}</strong>
          <span className={styles.statDescription}>Chờ xử lý</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Reviewing</div>
          <strong className={styles.statValue}>{stats.reviewing}</strong>
          <span className={styles.statDescription}>Đang điều tra</span>
        </article>
        <article className={`${styles.statCard} ${styles.statCritical}`}>
          <div className={styles.statLabel}>Confirmed Fraud</div>
          <strong className={styles.statValue}>{stats.confirmed}</strong>
          <span className={styles.statDescription}>Xác nhận gian lận</span>
        </article>
      </section>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select className={styles.control} aria-label="Case status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={styles.control} aria-label="Project" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Case list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cases.length === 0 ? (
          <div className={styles.panel} style={{ padding: 40, textAlign: "center" }}>
            <p className={styles.muted}>Không có case phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          cases.map((tx) => (
            <article key={tx.id} className={styles.panel} style={{ padding: "14px 17px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className={`${styles.badge} ${STATUS_COLORS[tx.caseStatus!]}`}>{tx.caseStatus}</span>
                    <RiskLevelBadge riskLevel={tx.riskLevel} />
                    <span style={{ color: "var(--security-muted)", fontSize: 11 }}>{tx.caseId}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--security-text)", marginBottom: 4 }}>
                    {tx.transactionReference} — {tx.projectName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--security-muted)", marginBottom: 6 }}>
                    {tx.transactionType} · Score: {tx.riskScore}/100 · {tx.scoringSource}
                    {tx.amount != null && ` · ${tx.amount.toLocaleString("en")} ${tx.currency}`}
                  </div>
                  {tx.explanation && (
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--security-text-secondary)", lineHeight: 1.5 }}>
                      {tx.explanation}
                    </p>
                  )}
                  {/* Quick status update */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_STATUSES.filter((s) => s !== tx.caseStatus).map((status) => (
                      <button key={status} className={styles.button} style={{ fontSize: 10, padding: "4px 8px", minHeight: 26 }} onClick={() => handleStatusChange(tx, status)} type="button">
                        → {status}
                      </button>
                    ))}
                  </div>
                </div>
                <button className={styles.button} onClick={() => onReview(tx)} type="button">Detail</button>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );
}
