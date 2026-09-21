"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseStatus, RolePermissions, TransactionRisk } from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ScoringSourceBadge } from "./ScoringSourceBadge";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface AlertCaseDrawerProps {
  transaction: TransactionRisk | null;
  open: boolean;
  onClose: () => void;
  onUpdateTransaction: (updated: TransactionRisk) => void;
  permissions?: RolePermissions;
}

const STATUS_FLOW: CaseStatus[] = [
  "Open",
  "Reviewing",
  "Confirmed Fraud",
  "False Alarm",
  "Resolved",
];

interface RuleEvidenceDetail {
  code: string;
  name: string;
  observed: string;
  threshold: string;
  riskPoints: number;
}

function getRuleEvidenceDetails(transaction: TransactionRisk): RuleEvidenceDetail[] {
  const map: Record<string, (tx: TransactionRisk) => RuleEvidenceDetail> = {
    velocity_check: (tx) => ({
      code: "velocity_check",
      name: "Velocity Check (Tần suất dồn dập)",
      observed: "14 giao dịch trong 1h qua (Tăng 4.2x so với baseline)",
      threshold: "Ngưỡng kích hoạt: > 10 giao dịch/1h",
      riskPoints: 30,
    }),
    amount_threshold: (tx) => ({
      code: "amount_threshold",
      name: "Amount Threshold (Vượt hạn mức giá trị)",
      observed: `${tx.amount != null ? tx.amount.toLocaleString() : "45,000,000"} ${tx.currency || "VND"}`,
      threshold: `Ngưỡng tối đa cho phép: > 20,000,000 ${tx.currency || "VND"}`,
      riskPoints: 25,
    }),
    geo_anomaly: (tx) => ({
      code: "geo_anomaly",
      name: "Geo Anomaly (Vị trí bất thường)",
      observed: "IP: Singapore (Cách 1,420 km sau 35 phút từ VN)",
      threshold: "Vị trí lạ (khác VN) hoặc tốc độ di chuyển bất khả thi",
      riskPoints: 35,
    }),
    device_fingerprint: (tx) => ({
      code: "device_fingerprint",
      name: "Device Fingerprint (Thiết bị chưa xác thực)",
      observed: "Thiết bị mới #DEV-94812 (Hash phần cứng chưa từng thấy)",
      threshold: "Thiết bị chưa từng đăng ký (New Device == true) hoặc trong Blacklist",
      riskPoints: 40,
    }),
    unusual_hour: (tx) => ({
      code: "unusual_hour",
      name: "Unusual Hour (Khung giờ đêm)",
      observed: `${new Date(tx.processedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (Khung giờ đêm)`,
      threshold: "Giao dịch phát sinh từ 00:00 đến 06:00",
      riskPoints: 15,
    }),
    dormant_account_reactivated: (tx) => ({
      code: "dormant_account_reactivated",
      name: "Dormant Account Reactivated (Ngủ đông kích hoạt lại)",
      observed: "Tài khoản không hoạt động 118 ngày vừa kích hoạt lại",
      threshold: "Tài khoản ngủ đông > 90 ngày phát sinh giao dịch lớn",
      riskPoints: 30,
    }),
    first_time_high_value: (tx) => ({
      code: "first_time_high_value",
      name: "First Time High Value (Lần đầu giao dịch lớn)",
      observed: `Giao dịch ${tx.amount != null ? tx.amount.toLocaleString() : "85,000,000"} ${tx.currency || "VND"} trên tài khoản 12 ngày tuổi`,
      threshold: "Tài khoản < 30 ngày giao dịch > 50,000,000 VND",
      riskPoints: 35,
    }),
    suspicious_user_agent: (tx) => ({
      code: "suspicious_user_agent",
      name: "Suspicious User Agent (Trình duyệt nghi vấn)",
      observed: "Headless Chrome / Python Automated Script",
      threshold: "Điểm tin cậy User-agent < 30",
      riskPoints: 20,
    }),
    rapid_ip_change: (tx) => ({
      code: "rapid_ip_change",
      name: "Rapid IP Change (Đổi IP liên tục)",
      observed: "4 địa chỉ IP khác nhau trong vòng 45 phút",
      threshold: "Thay đổi IP liên tục (> 3 IP / 1h)",
      riskPoints: 25,
    }),
  };

  return transaction.triggeredRules.map((ruleCode) => {
    if (map[ruleCode]) {
      return map[ruleCode](transaction);
    }
    return {
      code: ruleCode,
      name: ruleCode.replace(/_/g, " ").toUpperCase(),
      observed: "Đã vượt ngưỡng thiết lập trong hệ thống",
      threshold: "Quy tắc tự động kích hoạt",
      riskPoints: 20,
    };
  });
}

export function AlertCaseDrawer({
  transaction,
  open,
  onClose,
  onUpdateTransaction,
  permissions,
}: AlertCaseDrawerProps) {
  const canManage = permissions ? permissions.canManageCases : true;
  const { toast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<Array<{ text: string; time: string }>>([]);
  const [isMutating, setIsMutating] = useState(false);

  // Focus trap and escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset notes when transaction changes
  useEffect(() => {
    setNotes([]);
    setNote("");
  }, [transaction?.id]);

  if (!open || !transaction) return null;

  const handleCreateCase = () => {
    setIsMutating(true);
    setTimeout(() => {
      const updated: TransactionRisk = {
        ...transaction,
        caseId: `CASE-${Date.now()}`,
        caseStatus: "Open",
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("success", `Case created for ${transaction.transactionReference}`);
    }, 600);
  };

  const handleStatusChange = (newStatus: CaseStatus) => {
    setIsMutating(true);
    setTimeout(() => {
      const updated: TransactionRisk = {
        ...transaction,
        caseStatus: newStatus,
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("success", `Case status updated to ${newStatus}`);
    }, 500);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    setNotes((prev) => [
      ...prev,
      { text: note.trim(), time: new Date().toLocaleTimeString() },
    ]);
    setNote("");
    toast("info", "Note added");
  };

  return (
    <>
      <div
        className={styles.drawerOverlay}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-label={`Transaction detail: ${transaction.transactionReference}`}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Transaction Detail</h2>
          <button
            className={styles.drawerCloseBtn}
            onClick={onClose}
            aria-label="Close drawer"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* Transaction info */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Overview</h3>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Reference</span>
              <span>{transaction.transactionReference}</span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Entity</span>
              <span>{transaction.entityReference}</span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Project</span>
              <span>{transaction.projectName}</span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Type</span>
              <span>{transaction.transactionType}</span>
            </div>
            {transaction.amount != null && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Amount</span>
                <span>
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </span>
              </div>
            )}
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Processed</span>
              <span>{new Date(transaction.processedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Risk scoring */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Risk Assessment</h3>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Risk Level</span>
              <RiskLevelBadge riskLevel={transaction.riskLevel} />
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Score</span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                {transaction.riskScore}/100
              </span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Source</span>
              <ScoringSourceBadge source={transaction.scoringSource} />
            </div>
            {transaction.confidence != null && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Confidence</span>
                <span>{(transaction.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          {/* Evidence */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Evidence & Rule Trigger Breakdown</h3>
            {transaction.triggeredRules.length > 0 ? (
              <div className={styles.evidenceList}>
                {getRuleEvidenceDetails(transaction).map((ev) => (
                  <div key={ev.code} className={styles.evidenceCard}>
                    <div className={styles.evidenceHeader}>
                      <span className={styles.evidenceRuleName}>{ev.name}</span>
                      <span className={styles.evidencePointsBadge}>+{ev.riskPoints} pts</span>
                    </div>

                    <div className={styles.evidenceGrid}>
                      <div className={styles.evidenceCol}>
                        <span className={styles.evidenceColLabel}>Ghi nhận thực tế (Observed)</span>
                        <span className={styles.evidenceObservedVal}>{ev.observed}</span>
                      </div>
                      <div className={styles.evidenceCol}>
                        <span className={styles.evidenceColLabel}>Ngưỡng quy định (Threshold)</span>
                        <span className={styles.evidenceThresholdVal}>{ev.threshold}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: "6px 0", fontSize: 12, color: "var(--security-muted)" }}>
                Không có rule nào bị kích hoạt (Giao dịch an toàn).
              </p>
            )}

            {transaction.explanation && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 4, background: "rgba(0,0,0,0.2)" }}>
                <span className={styles.drawerLabel} style={{ display: "block", marginBottom: 4 }}>
                  {transaction.scoringSource === "AI" ? "AI Pipeline Analysis" : "System Summary"}
                </span>
                <p style={{ margin: 0, color: "var(--security-text)", fontSize: 12, lineHeight: 1.5 }}>
                  {transaction.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Case management */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Case Management</h3>
            {!transaction.caseId ? (
              <button
                className={`${styles.drawerPrimaryBtn} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                onClick={handleCreateCase}
                disabled={isMutating || !canManage}
                title={!canManage ? "Chỉ Risk Staff hoặc SME Admin mới có quyền tạo Case" : undefined}
                type="button"
              >
                {isMutating ? "Creating…" : "Create Case"}
              </button>
            ) : (
              <>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerLabel}>Case ID</span>
                  <span>{transaction.caseId}</span>
                </div>
                <div className={styles.drawerRow}>
                  <span className={styles.drawerLabel}>Status</span>
                  <span>{transaction.caseStatus}</span>
                </div>
                <div className={styles.drawerRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                  <span className={styles.drawerLabel}>
                    Update Status {!canManage && "(Read-only)"}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {STATUS_FLOW.filter((s) => s !== transaction.caseStatus).map(
                      (status) => (
                        <button
                          key={status}
                          className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                          onClick={() => handleStatusChange(status)}
                          disabled={isMutating || !canManage}
                          title={!canManage ? "Chỉ Risk Staff hoặc SME Admin mới có quyền cập nhật trạng thái" : undefined}
                          type="button"
                        >
                          {status}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {transaction.caseId && (
            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>Notes</h3>
              {notes.map((n, i) => (
                <div key={i} className={styles.noteItem}>
                  <span className={styles.noteTime}>{n.time}</span>
                  <span>{n.text}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  className={styles.searchInput}
                  placeholder={!canManage ? "Quyền hạn giới hạn: Không thể thêm ghi chú" : "Add a note…"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canManage && handleAddNote()}
                  disabled={!canManage}
                  style={{ flex: 1, opacity: !canManage ? 0.6 : 1 }}
                />
                <button
                  className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                  onClick={handleAddNote}
                  disabled={!note.trim() || !canManage}
                  title={!canManage ? "Không có quyền thêm ghi chú" : undefined}
                  type="button"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
