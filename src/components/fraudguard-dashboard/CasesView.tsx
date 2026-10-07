"use client";

import { useMemo, useState } from "react";
import type {
  CaseStatus,
  InvestigationFinding,
  RolePermissions,
  TransactionRisk,
  UserRole,
} from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";
import {
  UserCheck,
  Clock,
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  Play,
  Eye,
  Send,
} from "lucide-react";
import { AVAILABLE_INVESTIGATORS } from "./AlertCaseDrawer";
import { useLanguage } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";

interface CasesViewProps {
  transactions: TransactionRisk[];
  onUpdateTransaction: (updated: TransactionRisk) => void;
  onReview: (transaction: TransactionRisk) => void;
  permissions?: RolePermissions;
  currentRole?: UserRole;
  currentUserName?: string;
  threshold?: number;
}

const STATUS_BADGE_STYLE: Record<
  CaseStatus,
  { bg: string; text: string; border: string; labelKey: keyof TranslationKey["caseStatus"] }
> = {
  Open: {
    bg: "rgba(237, 167, 101, 0.15)",
    text: "var(--security-orange)",
    border: "#715139",
    labelKey: "open",
  },
  Assigned: {
    bg: "rgba(113, 185, 244, 0.15)",
    text: "var(--security-blue)",
    border: "#2d5a7b",
    labelKey: "assigned",
  },
  Investigating: {
    bg: "rgba(173, 138, 243, 0.15)",
    text: "var(--security-purple)",
    border: "#5c4778",
    labelKey: "investigating",
  },
  Reported: {
    bg: "rgba(255, 215, 0, 0.15)",
    text: "#ffd700",
    border: "#8c7b00",
    labelKey: "reported",
  },
  "Confirmed Fraud": {
    bg: "var(--critical-bg)",
    text: "var(--critical-text)",
    border: "var(--critical-border)",
    labelKey: "confirmedFraud",
  },
  "False Alarm": {
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
    labelKey: "falseAlarm",
  },
  Resolved: {
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
    labelKey: "resolved",
  },
};

type OperationQueueTab = "all" | "unassigned" | "in-field" | "reported" | "completed";
type InvestigatorTaskTab = "all" | "todo" | "investigating" | "reported" | "completed";

export function CasesView({
  transactions,
  onUpdateTransaction,
  onReview,
  permissions,
  currentRole = "Operation",
  currentUserName = "Trần Mai Anh",
  threshold = 75,
}: CasesViewProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [opTab, setOpTab] = useState<OperationQueueTab>("all");
  const [invTab, setInvTab] = useState<InvestigatorTaskTab>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const getBadgeLabel = (status?: CaseStatus) => {
    const item = STATUS_BADGE_STYLE[status || "Open"];
    return item ? t.caseStatus[item.labelKey] : status || "";
  };

  const getFindingLabel = (finding?: InvestigationFinding) => {
    switch (finding) {
      case "Suspicious":
        return t.findings.suspicious;
      case "Legitimate":
        return t.findings.legitimate;
      case "Need More Info":
        return t.findings.needMoreInfo;
      default:
        return finding || "";
    }
  };

  const isInvestigator = currentRole === "Investigator";
  const investigatorName = currentUserName || "Nguyễn Văn An";

  // All valid cases across the system
  const allCases = useMemo(() => {
    return transactions.filter((t) => t.caseId);
  }, [transactions]);

  // Projects list for filtering
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    allCases.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [allCases]);

  /* ─────────────────────────────────────────────────────────────
     INVESTIGATOR ACTIONS & STATS
  ───────────────────────────────────────────────────────────── */
  const myAssignedCases = useMemo(() => {
    return allCases.filter(
      (t) =>
        t.assignedInvestigator === investigatorName ||
        t.assignedInvestigator === "Nguyễn Văn An",
    );
  }, [allCases, investigatorName]);

  const investigatorStats = useMemo(() => {
    const total = myAssignedCases.length;
    const assigned = myAssignedCases.filter((t) => t.caseStatus === "Assigned").length;
    const investigating = myAssignedCases.filter((t) => t.caseStatus === "Investigating").length;
    const reported = myAssignedCases.filter((t) => t.caseStatus === "Reported").length;
    const completed = myAssignedCases.filter(
      (t) =>
        t.caseStatus === "Confirmed Fraud" ||
        t.caseStatus === "False Alarm" ||
        t.caseStatus === "Resolved",
    ).length;
    const urgent = myAssignedCases.filter(
      (t) =>
        (t.caseStatus === "Assigned" || t.caseStatus === "Investigating") &&
        t.riskScore >= 80,
    ).length;

    return { total, assigned, investigating, reported, completed, urgent };
  }, [myAssignedCases]);

  const filteredInvestigatorCases = useMemo(() => {
    return myAssignedCases
      .filter((t) => {
        if (invTab === "todo") return t.caseStatus === "Assigned";
        if (invTab === "investigating") return t.caseStatus === "Investigating";
        if (invTab === "reported") return t.caseStatus === "Reported";
        if (invTab === "completed") {
          return (
            t.caseStatus === "Confirmed Fraud" ||
            t.caseStatus === "False Alarm" ||
            t.caseStatus === "Resolved"
          );
        }
        return true;
      })
      .filter((t) => filterProject === "all" || t.projectId === filterProject)
      .sort((a, b) => {
        const order: Record<string, number> = {
          Assigned: 0,
          Investigating: 1,
          Reported: 2,
          "Confirmed Fraud": 3,
          "False Alarm": 4,
          Resolved: 5,
        };
        return (order[a.caseStatus || ""] ?? 6) - (order[b.caseStatus || ""] ?? 6);
      });
  }, [myAssignedCases, invTab, filterProject]);

  const handleAcceptCase = (tx: TransactionRisk) => {
    const updated: TransactionRisk = {
      ...tx,
      caseStatus: "Investigating",
      investigationNotes: [
        ...(tx.investigationNotes || []),
        {
          text:
            language === "vi"
              ? `Điều tra viên ${investigatorName} đã tiếp nhận hồ sơ và bắt đầu xác minh hiện trường.`
              : `Investigator ${investigatorName} accepted case and started field investigation.`,
          time: new Date().toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          author: investigatorName,
        },
      ],
    };
    onUpdateTransaction(updated);
    toast(
      "success",
      language === "vi"
        ? `Đã tiếp nhận hồ sơ ${tx.caseId}. Trạng thái chuyển sang: Đang thẩm định`
        : `Accepted case ${tx.caseId}. Status changed to: Investigating`,
    );
  };

  /* ─────────────────────────────────────────────────────────────
     OPERATION DISPATCH QUEUE ACTIONS & STATS
  ───────────────────────────────────────────────────────────── */
  const operationStats = useMemo(() => {
    const total = allCases.length;
    const unassigned = allCases.filter(
      (t) => t.caseStatus === "Open" && !t.assignedInvestigator,
    ).length;
    const inField = allCases.filter(
      (t) => t.caseStatus === "Assigned" || t.caseStatus === "Investigating",
    ).length;
    const reported = allCases.filter((t) => t.caseStatus === "Reported").length;
    const completed = allCases.filter(
      (t) =>
        t.caseStatus === "Confirmed Fraud" ||
        t.caseStatus === "False Alarm" ||
        t.caseStatus === "Resolved",
    ).length;

    return { total, unassigned, inField, reported, completed };
  }, [allCases]);

  const filteredOperationCases = useMemo(() => {
    return allCases
      .filter((t) => {
        if (opTab === "unassigned") return t.caseStatus === "Open" && !t.assignedInvestigator;
        if (opTab === "in-field") {
          return t.caseStatus === "Assigned" || t.caseStatus === "Investigating";
        }
        if (opTab === "reported") return t.caseStatus === "Reported";
        if (opTab === "completed") {
          return (
            t.caseStatus === "Confirmed Fraud" ||
            t.caseStatus === "False Alarm" ||
            t.caseStatus === "Resolved"
          );
        }
        return true;
      })
      .filter((t) => filterProject === "all" || t.projectId === filterProject)
      .sort((a, b) => {
        const order: Record<string, number> = {
          Reported: 0,
          Open: 1,
          Assigned: 2,
          Investigating: 3,
          "Confirmed Fraud": 4,
          "False Alarm": 5,
          Resolved: 6,
        };
        return (order[a.caseStatus || ""] ?? 7) - (order[b.caseStatus || ""] ?? 7);
      });
  }, [allCases, opTab, filterProject]);

  const handleQuickAssign = (tx: TransactionRisk, assignTarget: string) => {
    const updated: TransactionRisk = {
      ...tx,
      assignedInvestigator: assignTarget,
      assignedAt: new Date().toISOString(),
      caseStatus: "Assigned",
    };
    onUpdateTransaction(updated);
    toast(
      "success",
      language === "vi"
        ? `Đã phân công hồ sơ ${tx.caseId} cho điều tra viên ${assignTarget}`
        : `Assigned case ${tx.caseId} to investigator ${assignTarget}`,
    );
  };

  /* ─────────────────────────────────────────────────────────────
     VIEW 1: INVESTIGATOR PERSONAL WORKBENCH (Bàn thẩm định)
  ───────────────────────────────────────────────────────────── */
  if (isInvestigator) {
    return (
      <>
        <div className={styles.pageHeading}>
          <div>
            <h1>{t.caseQueue.invTitle}</h1>
            <p>{t.caseQueue.invSubtitle}</p>
          </div>
        </div>

        {/* Investigator Personal KPIs */}
        <section className={styles.metricsGrid} style={{ marginTop: 20 }}>
          <article
            className={`${styles.statCard} ${investigatorStats.assigned > 0 ? styles.statWarning : ""}`}
          >
            <div className={styles.statLabel}>{t.caseQueue.kpis.newAssigned}</div>
            <strong className={styles.statValue} style={{ color: "var(--security-blue)" }}>
              {investigatorStats.assigned}
            </strong>
            <span className={styles.statDescription}>{t.caseQueue.kpis.newAssignedDesc}</span>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statLabel}>{t.caseQueue.kpis.inProgress}</div>
            <strong className={styles.statValue} style={{ color: "var(--security-purple)" }}>
              {investigatorStats.investigating}
            </strong>
            <span className={styles.statDescription}>{t.caseQueue.kpis.inProgressDesc}</span>
          </article>

          <article className={styles.statCard} style={{ borderColor: "#8c7b00" }}>
            <div className={styles.statLabel}>{t.caseQueue.kpis.awaitingReview}</div>
            <strong className={styles.statValue} style={{ color: "#ffd700" }}>
              {investigatorStats.reported}
            </strong>
            <span className={styles.statDescription}>{t.caseQueue.kpis.awaitingReviewDesc}</span>
          </article>

          <article
            className={`${styles.statCard} ${investigatorStats.urgent > 0 ? styles.statCritical : ""}`}
          >
            <div className={styles.statLabel}>{t.caseQueue.kpis.urgentCases}</div>
            <strong className={styles.statValue}>
              {investigatorStats.urgent}
            </strong>
            <span className={styles.statDescription}>{t.caseQueue.kpis.urgentCasesDesc}</span>
          </article>
        </section>

        {/* Investigator Task Tabs & Project Filter */}
        <div
          className={styles.tableControls}
          style={{ padding: "8px 0 16px", borderBottom: "1px solid var(--security-border)" }}
        >
          <div className={styles.tabs} role="tablist">
            <button
              className={`${styles.tab} ${invTab === "all" ? styles.tabActive : ""}`}
              onClick={() => setInvTab("all")}
              type="button"
            >
              {t.caseQueue.tabs.myAll} ({myAssignedCases.length})
            </button>
            <button
              className={`${styles.tab} ${invTab === "todo" ? styles.tabActive : ""}`}
              onClick={() => setInvTab("todo")}
              type="button"
            >
              {t.caseQueue.tabs.myTodo} ({investigatorStats.assigned})
            </button>
            <button
              className={`${styles.tab} ${invTab === "investigating" ? styles.tabActive : ""}`}
              onClick={() => setInvTab("investigating")}
              type="button"
            >
              {t.caseQueue.tabs.myInvestigating} ({investigatorStats.investigating})
            </button>
            <button
              className={`${styles.tab} ${invTab === "reported" ? styles.tabActive : ""}`}
              onClick={() => setInvTab("reported")}
              type="button"
            >
              {t.caseQueue.tabs.myReported} ({investigatorStats.reported})
            </button>
            <button
              className={`${styles.tab} ${invTab === "completed" ? styles.tabActive : ""}`}
              onClick={() => setInvTab("completed")}
              type="button"
            >
              {t.caseQueue.tabs.myCompleted} ({investigatorStats.completed})
            </button>
          </div>

          <div className={styles.toolbarGroup}>
            <select
              className={styles.control}
              aria-label={t.actions.allProjects}
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">{t.actions.allProjects}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Investigator Task Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {filteredInvestigatorCases.length === 0 ? (
            <div className={styles.panel} style={{ padding: 40, textAlign: "center" }}>
              <p className={styles.muted}>{t.caseQueue.emptyMessage}</p>
            </div>
          ) : (
            filteredInvestigatorCases.map((tx) => {
              const badgeStyle = STATUS_BADGE_STYLE[tx.caseStatus || "Assigned"];
              const isAssigned = tx.caseStatus === "Assigned";
              const isInvestigating = tx.caseStatus === "Investigating";
              const isReported = tx.caseStatus === "Reported";

              return (
                <article
                  key={tx.id}
                  className={styles.panel}
                  style={{
                    padding: "16px 20px",
                    borderLeft: isAssigned
                      ? "4px solid var(--security-blue)"
                      : isInvestigating
                        ? "4px solid var(--security-purple)"
                        : isReported
                          ? "4px solid #ffd700"
                          : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Badges Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className={styles.badge}
                          style={{
                            background: badgeStyle.bg,
                            color: badgeStyle.text,
                            borderColor: badgeStyle.border,
                            fontWeight: 700,
                          }}
                        >
                          {getBadgeLabel(tx.caseStatus)}
                        </span>

                        <RiskLevelBadge
                          riskLevel={tx.riskLevel}
                          score={tx.riskScore}
                          threshold={threshold}
                        />

                        <span
                          style={{
                            color: "var(--security-muted)",
                            fontSize: 11,
                            fontFamily: "monospace",
                          }}
                        >
                          {tx.caseId}
                        </span>

                        {tx.assignedAt && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--security-subtle)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Clock size={12} />
                            {t.caseQueue.assignedAtTime}: {new Date(tx.assignedAt).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} (
                            {new Date(tx.assignedAt).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")})
                          </span>
                        )}
                      </div>

                      {/* Transaction Title */}
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--security-text)",
                          marginBottom: 4,
                        }}
                      >
                        {tx.transactionReference} — {tx.projectName}
                      </div>

                      {/* Key Evidence & Field Facts */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--security-muted)",
                          marginBottom: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <span>
                          <strong>{t.risk.amount}:</strong>{" "}
                          <span style={{ color: "var(--security-text)" }}>
                            {tx.amount != null
                              ? `${tx.amount.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${tx.currency || "VND"}`
                              : "N/A"}
                          </span>
                        </span>
                        <span>
                          <strong>{t.risk.channel}:</strong> {tx.channel || tx.transactionType}
                        </span>
                        <span>
                          <strong>{t.risk.device}:</strong> {tx.deviceId || t.risk.unidentifiedDevice}
                        </span>
                        <span>
                          <strong>{t.risk.customer}:</strong> {tx.entityReference}
                        </span>
                      </div>

                      {/* Triggered Rules Tag List */}
                      {tx.triggeredRules.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            marginBottom: 10,
                          }}
                        >
                          <span style={{ fontSize: 11, color: "var(--security-subtle)" }}>
                            {t.risk.verificationSigns}:
                          </span>
                          {tx.triggeredRules.map((r) => (
                            <span key={r} className={styles.ruleTag}>
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Investigator Field Progress Callout Box */}
                      {isAssigned && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 4,
                            background: "rgba(113, 185, 244, 0.08)",
                            border: "1px solid rgba(113, 185, 244, 0.3)",
                            fontSize: 11,
                            color: "var(--security-blue)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <AlertTriangle size={14} />
                          <span>{t.caseQueue.calloutNew}</span>
                        </div>
                      )}

                      {isInvestigating && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 4,
                            background: "rgba(173, 138, 243, 0.08)",
                            border: "1px solid rgba(173, 138, 243, 0.3)",
                            fontSize: 11,
                            color: "var(--security-purple)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Clock size={14} />
                          <span>{t.caseQueue.calloutInvestigating}</span>
                        </div>
                      )}

                      {isReported && tx.investigationReport && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 4,
                            background: "rgba(255, 215, 0, 0.08)",
                            border: "1px solid rgba(255, 215, 0, 0.3)",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <FileCheck2 size={15} style={{ color: "#ffd700" }} />
                            <span style={{ color: "#ffd700" }}>
                              <strong>{t.caseQueue.calloutReported}:</strong> {t.caseQueue.proposedFinding}{" "}
                              <strong>
                                {getFindingLabel(tx.investigationReport.finding)}
                              </strong>{" "}
                              — "{tx.investigationReport.notes}"
                            </span>
                          </div>
                          <span style={{ color: "var(--security-muted)", fontSize: 10 }}>
                            {t.caseQueue.calloutReportedPending}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Investigator Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        flexShrink: 0,
                        width: 165,
                      }}
                    >
                      {isAssigned && (
                        <button
                          className={styles.btnPrimary}
                          onClick={() => handleAcceptCase(tx)}
                          type="button"
                          style={{
                            fontSize: 12,
                            height: 32,
                            minHeight: 32,
                            padding: "6px 12px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Play size={13} />
                          {t.actions.acceptInvestigation}
                        </button>
                      )}

                      {isInvestigating && (
                        <button
                          className={styles.btnPrimary}
                          onClick={() => onReview(tx)}
                          type="button"
                          style={{
                            fontSize: 12,
                            height: 32,
                            minHeight: 32,
                            padding: "6px 12px",
                            background: "var(--security-purple)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Send size={13} />
                          {t.actions.submitReport}
                        </button>
                      )}

                      {isReported && (
                        <button
                          className={styles.button}
                          onClick={() => onReview(tx)}
                          type="button"
                          style={{
                            fontSize: 12,
                            height: 32,
                            minHeight: 32,
                            padding: "6px 12px",
                            borderColor: "#8c7b00",
                            color: "#ffd700",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <Eye size={13} />
                          {t.actions.reviewReport}
                        </button>
                      )}

                      <button
                        className={styles.button}
                        onClick={() => onReview(tx)}
                        type="button"
                        style={{
                          fontSize: 12,
                          height: 32,
                          minHeight: 32,
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {t.actions.caseDetails}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     VIEW 2: OPERATION CENTRAL DISPATCH QUEUE (Bàn điều phối)
  ───────────────────────────────────────────────────────────── */
  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.caseQueue.opTitle}</h1>
          <p>{t.caseQueue.opSubtitle}</p>
        </div>
      </div>

      {/* Operation Macro KPIs */}
      <section className={styles.metricsGrid} style={{ marginTop: 20 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.caseQueue.kpis.totalQueue}</div>
          <strong className={styles.statValue}>{operationStats.total}</strong>
          <span className={styles.statDescription}>{t.caseQueue.kpis.totalQueueDesc}</span>
        </article>

        <article
          className={`${styles.statCard} ${operationStats.unassigned > 0 ? styles.statWarning : ""}`}
        >
          <div className={styles.statLabel}>{t.caseQueue.kpis.unassigned}</div>
          <strong
            className={styles.statValue}
            style={{ color: operationStats.unassigned > 0 ? "var(--security-orange)" : undefined }}
          >
            {operationStats.unassigned}
          </strong>
          <span className={styles.statDescription}>{t.caseQueue.kpis.unassignedDesc}</span>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.caseQueue.kpis.inField}</div>
          <strong className={styles.statValue} style={{ color: "var(--security-blue)" }}>
            {operationStats.inField}
          </strong>
          <span className={styles.statDescription}>{t.caseQueue.kpis.inFieldDesc}</span>
        </article>

        <article
          className={styles.statCard}
          style={{ borderColor: operationStats.reported > 0 ? "#8c7b00" : undefined }}
        >
          <div className={styles.statLabel}>{t.caseQueue.kpis.awaitingReview}</div>
          <strong className={styles.statValue} style={{ color: "#ffd700" }}>
            {operationStats.reported}
          </strong>
          <span className={styles.statDescription}>{t.caseQueue.kpis.awaitingReviewDesc}</span>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.caseQueue.kpis.completed}</div>
          <strong className={styles.statValue} style={{ color: "var(--security-green)" }}>
            {operationStats.completed}
          </strong>
          <span className={styles.statDescription}>{t.caseQueue.kpis.completedDesc}</span>
        </article>
      </section>

      {/* Operation Queue Tabs */}
      <div
        className={styles.tableControls}
        style={{ padding: "8px 0 16px", borderBottom: "1px solid var(--security-border)" }}
      >
        <div className={styles.tabs} role="tablist">
          <button
            className={`${styles.tab} ${opTab === "all" ? styles.tabActive : ""}`}
            onClick={() => setOpTab("all")}
            type="button"
          >
            {t.caseQueue.tabs.allQueue} ({allCases.length})
          </button>
          <button
            className={`${styles.tab} ${opTab === "unassigned" ? styles.tabActive : ""}`}
            onClick={() => setOpTab("unassigned")}
            type="button"
          >
            {t.caseQueue.tabs.unassigned} ({operationStats.unassigned})
          </button>
          <button
            className={`${styles.tab} ${opTab === "in-field" ? styles.tabActive : ""}`}
            onClick={() => setOpTab("in-field")}
            type="button"
          >
            {t.caseQueue.tabs.inField} ({operationStats.inField})
          </button>
          <button
            className={`${styles.tab} ${opTab === "reported" ? styles.tabActive : ""}`}
            onClick={() => setOpTab("reported")}
            type="button"
          >
            {t.caseQueue.tabs.awaitingReview} ({operationStats.reported})
          </button>
          <button
            className={`${styles.tab} ${opTab === "completed" ? styles.tabActive : ""}`}
            onClick={() => setOpTab("completed")}
            type="button"
          >
            {t.caseQueue.tabs.completed} ({operationStats.completed})
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label={t.actions.allProjects}
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="all">{t.actions.allProjects}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operation Dispatch Queue Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {filteredOperationCases.length === 0 ? (
          <div className={styles.panel} style={{ padding: 40, textAlign: "center" }}>
            <p className={styles.muted}>{t.caseQueue.emptyMessage}</p>
          </div>
        ) : (
          filteredOperationCases.map((tx) => {
            const badgeStyle = STATUS_BADGE_STYLE[tx.caseStatus || "Open"];
            const isUnassigned = tx.caseStatus === "Open" && !tx.assignedInvestigator;
            const isReported = tx.caseStatus === "Reported";

            return (
              <article
                key={tx.id}
                className={styles.panel}
                style={{
                  padding: "16px 18px",
                  borderLeft: isReported
                    ? "4px solid #ffd700"
                    : isUnassigned
                      ? "4px solid var(--security-orange)"
                      : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Status badges & Assignment Tag */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className={styles.badge}
                        style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.text,
                          borderColor: badgeStyle.border,
                          fontWeight: 700,
                        }}
                      >
                        {getBadgeLabel(tx.caseStatus)}
                      </span>

                      <RiskLevelBadge
                        riskLevel={tx.riskLevel}
                        score={tx.riskScore}
                        threshold={threshold}
                      />

                      <span
                        style={{
                          color: "var(--security-muted)",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {tx.caseId}
                      </span>

                      {/* Investigator Assignment Badge */}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: tx.assignedInvestigator
                            ? "rgba(2, 132, 199, 0.15)"
                            : "rgba(237, 167, 101, 0.15)",
                          color: tx.assignedInvestigator ? "#38bdf8" : "var(--security-orange)",
                          border: "1px solid",
                          borderColor: tx.assignedInvestigator ? "#0284c7" : "#715139",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <UserCheck size={12} />
                        {tx.assignedInvestigator
                          ? `${t.caseStatus.investigatorBadge}: ${tx.assignedInvestigator}`
                          : t.caseStatus.unassignedBadge}
                      </span>
                    </div>

                    {/* Transaction header */}
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--security-text)",
                        marginBottom: 4,
                      }}
                    >
                      {tx.transactionReference} — {tx.projectName}
                    </div>

                    {/* Metadata line */}
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--security-muted)",
                        marginBottom: 6,
                      }}
                    >
                      {tx.transactionType}
                      {tx.channel && ` · ${t.risk.channel}: ${tx.channel}`}
                      {tx.deviceId && ` · ${t.risk.device}: ${tx.deviceId}`}
                      {` · ${t.risk.riskScore}: ${tx.riskScore}/100`}
                      {tx.amount != null &&
                        ` · ${tx.amount.toLocaleString(language === "vi" ? "vi-VN" : "en-US")} ${tx.currency || "VND"}`}
                      {` · Entity: ${tx.entityReference}`}
                    </div>

                    {/* Triggered rules pills */}
                    {tx.triggeredRules.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          marginBottom: 8,
                        }}
                      >
                        {tx.triggeredRules.map((r) => (
                          <span key={r} className={styles.ruleTag}>
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reported Notice Callout (Highlight for Operation Leader) */}
                    {isReported && tx.investigationReport && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          borderRadius: 4,
                          background: "rgba(255, 215, 0, 0.08)",
                          border: "1px solid rgba(255, 215, 0, 0.3)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FileCheck2 size={15} style={{ color: "#ffd700" }} />
                          <span style={{ color: "#ffd700" }}>
                            <strong>{t.caseQueue.calloutReported}:</strong> {t.caseQueue.proposedFinding}{" "}
                            <strong>
                              {getFindingLabel(tx.investigationReport.finding)}
                            </strong>{" "}
                            {t.caseQueue.submittedBy} {tx.investigationReport.submittedBy}
                          </span>
                        </div>
                        <span style={{ color: "var(--security-muted)", fontSize: 10 }}>
                          {t.caseQueue.calloutReportedPending}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Operation Actions */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flexShrink: 0,
                      width: 165,
                    }}
                  >
                    {isUnassigned && (
                      <select
                        className={styles.control}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleQuickAssign(tx, e.target.value);
                          }
                        }}
                        aria-label={t.actions.assignInvestigator}
                        style={{
                          fontSize: 12,
                          height: 32,
                          minHeight: 32,
                          padding: "0 8px",
                          borderRadius: 4,
                          background: "var(--security-control)",
                          color: "var(--security-blue)",
                          border: "1px solid var(--security-blue)",
                          fontWeight: 600,
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        <option value="" disabled style={{ background: "var(--security-panel)", color: "var(--security-muted)" }}>
                          {t.actions.assignInvestigator}
                        </option>
                        {AVAILABLE_INVESTIGATORS.map((inv) => (
                          <option
                            key={inv}
                            value={inv}
                            style={{ background: "var(--security-panel)", color: "var(--security-text)" }}
                          >
                            {inv}
                          </option>
                        ))}
                      </select>
                    )}

                    {isReported && (
                      <button
                        className={styles.btnPrimary}
                        onClick={() => onReview(tx)}
                        type="button"
                        style={{
                          background: "#ffd700",
                          color: "#1f2025",
                          fontWeight: 700,
                          fontSize: 12,
                          height: 32,
                          minHeight: 32,
                          padding: "6px 12px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <ShieldCheck size={13} />
                        {t.actions.approveReport}
                      </button>
                    )}

                    <button
                      className={styles.button}
                      onClick={() => onReview(tx)}
                      type="button"
                      style={{
                        fontSize: 12,
                        height: 32,
                        minHeight: 32,
                        padding: "6px 12px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {t.actions.caseDetails}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
