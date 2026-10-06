"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CaseDecision,
  CaseNote,
  CaseStatus,
  InvestigationFinding,
  InvestigationReport,
  RolePermissions,
  TransactionRisk,
  UserRole,
} from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ScoringSourceBadge } from "./ScoringSourceBadge";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";
import {
  CheckCircle2,
  AlertOctagon,
  UserCheck,
  Clock,
  RotateCcw,
  Check,
  Send,
  Play,
  ShieldCheck,
  User,
} from "lucide-react";

interface AlertCaseDrawerProps {
  transaction: TransactionRisk | null;
  open: boolean;
  onClose: () => void;
  onUpdateTransaction: (updated: TransactionRisk) => void;
  permissions?: RolePermissions;
  currentRole?: UserRole;
  currentUserName?: string;
  threshold?: number;
}

export const AVAILABLE_INVESTIGATORS = [
  "Nguyễn Văn An",
  "Lê Quốc Bảo",
  "Trần Thu Hà",
  "Phạm Minh Tuấn",
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
    velocity_check: () => ({
      code: "velocity_check",
      name: "Velocity Check (Tần suất dồn dập)",
      observed: "14 giao dịch trong 1h qua (Tăng 4.2x so với baseline)",
      threshold: "Ngưỡng kích hoạt: > 10 giao dịch/1h",
      riskPoints: 30,
    }),
    amount_threshold: (tx) => {
      const isRefund = tx.transactionType === "refund";
      const isSub = tx.transactionType === "subscription";
      const thresholdVal = isRefund ? 10000000 : isSub ? 2000000 : 20000000;
      const typeLabel = isRefund ? "hoàn tiền" : isSub ? "gói định kỳ" : "giao dịch";
      return {
        code: "amount_threshold",
        name: "Amount Threshold (Vượt hạn mức giá trị)",
        observed: `${tx.amount != null ? tx.amount.toLocaleString() : "45,000,000"} ${tx.currency || "VND"}`,
        threshold: `Ngưỡng tối đa ${typeLabel}: > ${thresholdVal.toLocaleString()} ${tx.currency || "VND"}`,
        riskPoints: 25,
      };
    },
    geo_anomaly: () => ({
      code: "geo_anomaly",
      name: "Geo Anomaly (Vị trí bất thường)",
      observed: "IP: Singapore (Cách 1,420 km sau 35 phút từ VN)",
      threshold: "Vị trí lạ (khác VN) hoặc tốc độ di chuyển bất khả thi",
      riskPoints: 35,
    }),
    device_fingerprint: (tx) => ({
      code: "device_fingerprint",
      name: "Device Fingerprint (Thiết bị chưa xác thực)",
      observed: `Thiết bị ${tx.deviceId || "#DEV-94812"} (Hash phần cứng chưa từng thấy)`,
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
    dormant_account_reactivated: () => ({
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
    suspicious_user_agent: () => ({
      code: "suspicious_user_agent",
      name: "Suspicious User Agent (Trình duyệt nghi vấn)",
      observed: "Headless Chrome / Python Automated Script",
      threshold: "Điểm tin cậy User-agent < 30",
      riskPoints: 20,
    }),
    rapid_ip_change: () => ({
      code: "rapid_ip_change",
      name: "Rapid IP Change (Đổi mạng liên tục)",
      observed: "4 địa chỉ IP khác nhau từ 3 ISP trong vòng 45 phút",
      threshold: "Entity đổi > 3 IP trong 1h",
      riskPoints: 25,
    }),
    "High Transaction Amount": (tx) => ({
      code: "High Transaction Amount",
      name: "High Transaction Amount (Đơn COD giá trị cao)",
      observed: `Giá trị đơn: ${tx.amount != null ? tx.amount.toLocaleString() : "12,500,000"} VND qua kênh COD`,
      threshold: "Ngưỡng kiểm soát COD: > 10,000,000 VND",
      riskPoints: 25,
    }),
    "New Device": (tx) => ({
      code: "New Device",
      name: "New Device (Thiết bị lần đầu xuất hiện)",
      observed: `Phần cứng ID: ${tx.deviceId || "DEV_A291"} (Không có trong lịch sử tài khoản)`,
      threshold: "Thiết bị mới chưa từng liên kết (is_new == true)",
      riskPoints: 20,
    }),
    "4 Failed Transactions in 24 Hours": () => ({
      code: "4 Failed Transactions in 24 Hours",
      name: "4 Failed Transactions (4 lần thất bại trong 24h)",
      observed: "Ghi nhận 4 lần đặt hàng/thanh toán thất bại trong 24 giờ qua",
      threshold: "Số lần thanh toán lỗi trong 24h >= 4",
      riskPoints: 30,
    }),
    "Address Reuse": () => ({
      code: "Address Reuse",
      name: "Address Reuse (Trùng lặp địa chỉ nhận hàng)",
      observed: "Địa chỉ giao hàng trùng khớp với 3 tài khoản khách hàng khác nhau",
      threshold: "Địa chỉ được dùng bởi > 2 tài khoản trong 48h",
      riskPoints: 15,
    }),
  };

  const results: RuleEvidenceDetail[] = [];
  for (const ruleKey of transaction.triggeredRules) {
    if (map[ruleKey]) {
      results.push(map[ruleKey](transaction));
    } else {
      results.push({
        code: ruleKey,
        name: ruleKey.replace(/_/g, " "),
        observed: "Kích hoạt dựa trên bộ rule an ninh động",
        threshold: "Ngưỡng chuẩn",
        riskPoints: 20,
      });
    }
  }
  return results;
}

const WORKFLOW_STEPS = [
  { key: "created", label: "Khởi tạo" },
  { key: "assigned", label: "Phân công" },
  { key: "investigating", label: "Thực địa" },
  { key: "reported", label: "Nộp Báo cáo" },
  { key: "closed", label: "Phán quyết" },
];

function getWorkflowStepIndex(status?: CaseStatus): number {
  if (!status || status === "Open") return 0;
  if (status === "Assigned") return 1;
  if (status === "Investigating") return 2;
  if (status === "Reported") return 3;
  return 4; // Confirmed Fraud, False Alarm, Resolved
}

const FINDING_INFO: Record<
  InvestigationFinding,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  Suspicious: {
    label: "Nghi vấn gian lận (SUSPICIOUS)",
    bg: "var(--critical-bg)",
    text: "var(--critical-text)",
    border: "var(--critical-border)",
    desc: "Đề xuất phong tỏa đơn, báo bưu cục dừng phát hàng, đưa thực thể vào Blacklist.",
  },
  Legitimate: {
    label: "Giao dịch hợp lệ (LEGITIMATE)",
    bg: "rgba(120, 201, 172, 0.15)",
    text: "var(--security-green)",
    border: "#3f665a",
    desc: "Đã xác minh khách hàng thật, người nhận xác nhận đơn, tiếp tục phát hàng bình thường.",
  },
  "Need More Info": {
    label: "Cần thêm chứng cứ (NEED MORE INFO)",
    bg: "rgba(237, 167, 101, 0.15)",
    text: "var(--security-orange)",
    border: "#715139",
    desc: "Chưa liên lạc được số điện thoại nhận hàng, bưu tá đang lưu kho chờ gọi lại.",
  },
};

export function AlertCaseDrawer({
  transaction,
  open,
  onClose,
  onUpdateTransaction,
  permissions,
  currentRole = "Operation",
  currentUserName = "Trần Mai Anh",
  threshold = 75,
}: AlertCaseDrawerProps) {
  const { toast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Investigator zone local inputs
  const [investigatorNote, setInvestigatorNote] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [selectedFinding, setSelectedFinding] = useState<InvestigationFinding>("Suspicious");
  const [reportNote, setReportNote] = useState("");

  // Operation zone local inputs
  const [selectedInvestigator, setSelectedInvestigator] = useState(
    transaction?.assignedInvestigator || AVAILABLE_INVESTIGATORS[0],
  );
  const [operationFeedback, setOperationFeedback] = useState("");
  const [isMutating, setIsMutating] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Sync state when transaction opens/changes
  useEffect(() => {
    if (transaction) {
      setSelectedInvestigator(transaction.assignedInvestigator || AVAILABLE_INVESTIGATORS[0]);
      if (transaction.investigationReport) {
        setSelectedFinding(transaction.investigationReport.finding);
        setEvidenceNotes(transaction.investigationReport.evidenceNotes || "");
        setReportNote(transaction.investigationReport.notes || "");
      } else {
        setSelectedFinding("Suspicious");
        setEvidenceNotes("");
        setReportNote("");
      }
      setInvestigatorNote("");
      setOperationFeedback("");
    }
  }, [transaction?.id, transaction?.caseStatus]);

  if (!open || !transaction) return null;

  // Role permissions
  const isPlatformAdmin = currentRole === "Platform Admin";
  const isSMEAdmin = currentRole === "SME Admin";
  const isOperation = currentRole === "Operation" || isSMEAdmin || isPlatformAdmin;
  const isInvestigator = currentRole === "Investigator";
  const isViewer = currentRole === "Viewer" || permissions?.isReadOnly;

  const currentStep = getWorkflowStepIndex(transaction.caseStatus);

  // Handlers
  const handleCreateCase = () => {
    setIsMutating(true);
    setTimeout(() => {
      const updated: TransactionRisk = {
        ...transaction,
        caseId: `CASE-${Date.now().toString().slice(-6)}`,
        caseStatus: "Open",
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("success", `Đã tạo Case ${updated.caseId} cho giao dịch ${transaction.transactionReference}`);
    }, 350);
  };

  const handleAssignInvestigator = () => {
    if (!selectedInvestigator) return;
    setIsMutating(true);
    setTimeout(() => {
      const updated: TransactionRisk = {
        ...transaction,
        caseId: transaction.caseId || `CASE-${Date.now().toString().slice(-6)}`,
        caseStatus: "Assigned",
        assignedInvestigator: selectedInvestigator,
        assignedAt: new Date().toISOString(),
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("success", `Đã phân công Case cho Điều tra viên ${selectedInvestigator}`);
    }, 350);
  };

  // Investigator: Accept case & start field investigation
  const handleStartInvestigating = () => {
    setIsMutating(true);
    setTimeout(() => {
      const startNote: CaseNote = {
        text: "Điều tra viên đã tiếp nhận hồ sơ và bắt đầu quy trình thẩm định thực địa.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        author: currentUserName || "Nguyễn Văn An",
      };
      const updated: TransactionRisk = {
        ...transaction,
        caseStatus: "Investigating",
        investigationNotes: [...(transaction.investigationNotes || []), startNote],
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("info", `Đã tiếp nhận hồ sơ. Trạng thái chuyển sang: Đang xác minh (Investigating)`);
    }, 300);
  };

  // Add field notes
  const handleAddInvestigatorNote = () => {
    if (!investigatorNote.trim()) return;
    const newNote: CaseNote = {
      text: investigatorNote.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      author: currentUserName || (isInvestigator ? "Nguyễn Văn An" : "Vận hành"),
    };
    const updated: TransactionRisk = {
      ...transaction,
      investigationNotes: [...(transaction.investigationNotes || []), newNote],
    };
    onUpdateTransaction(updated);
    setInvestigatorNote("");
    toast("info", "Đã cập nhật nhật ký xác minh");
  };

  // Investigator: Submit official investigation report
  const handleSubmitInvestigationReport = () => {
    setIsMutating(true);
    setTimeout(() => {
      const report: InvestigationReport = {
        finding: selectedFinding,
        notes: reportNote.trim() || "Đã thu thập đầy đủ tài liệu và chứng cứ giao vận liên quan.",
        evidenceNotes: evidenceNotes.trim() || "Ghi nhận thông tin bất thường về người nhận và địa chỉ đơn hàng.",
        submittedAt: new Date().toISOString(),
        submittedBy: currentUserName || transaction.assignedInvestigator || "Nguyễn Văn An",
      };
      const logNote: CaseNote = {
        text: `[Nộp Báo cáo]: Đã hoàn thành thẩm định với kết luận đề xuất: ${selectedFinding.toUpperCase()}.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        author: currentUserName || "Nguyễn Văn An",
      };
      const updated: TransactionRisk = {
        ...transaction,
        caseStatus: "Reported",
        investigationReport: report,
        investigationNotes: [...(transaction.investigationNotes || []), logNote],
      };
      onUpdateTransaction(updated);
      setIsMutating(false);
      toast("success", `Đã gửi Báo cáo điều tra tới Trưởng nhóm Vận hành (${selectedFinding})`);
    }, 450);
  };

  // Operation: Final Authority Decision
  const handleOperationDecision = (newStatus: "Confirmed Fraud" | "False Alarm" | "Resolved" | "Investigating") => {
    setIsMutating(true);
    setTimeout(() => {
      const isReinvestigate = newStatus === "Investigating";
      const decision: CaseDecision = {
        status: newStatus,
        decidedBy: `${currentUserName || "Trần Mai Anh"} (Operation)`,
        decidedAt: new Date().toISOString(),
        directive: operationFeedback.trim() || undefined,
      };

      const updated: TransactionRisk = {
        ...transaction,
        caseStatus: newStatus,
        caseDecision: isReinvestigate ? undefined : decision,
      };

      if (operationFeedback.trim()) {
        const feedbackNote: CaseNote = {
          text: isReinvestigate
            ? `[Yêu cầu Thẩm tra lại từ Lãnh đạo]: ${operationFeedback.trim()}`
            : `[Chỉ đạo Phê duyệt Vận hành]: ${operationFeedback.trim()}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          author: `${currentUserName || "Trần Mai Anh"} (Operation Leader)`,
        };
        updated.investigationNotes = [...(updated.investigationNotes || []), feedbackNote];
      }

      onUpdateTransaction(updated);
      setIsMutating(false);

      const labelMap: Record<string, string> = {
        "Confirmed Fraud": "Xác nhận gian lận (Confirmed Fraud)",
        "False Alarm": "Báo động giả (False Alarm)",
        Resolved: "Đóng hồ sơ (Resolved)",
        Investigating: "Yêu cầu thẩm tra lại (Re-investigation)",
      };
      toast("success", `Hồ sơ ${transaction.caseId} đã chuyển sang: ${labelMap[newStatus]}`);
    }, 450);
  };

  const getStatusBadgeStyle = (status?: CaseStatus) => {
    switch (status) {
      case "Open":
        return { bg: "rgba(237, 167, 101, 0.15)", text: "var(--security-orange)", border: "#715139" };
      case "Assigned":
        return { bg: "rgba(113, 185, 244, 0.15)", text: "var(--security-blue)", border: "#2d5a7b" };
      case "Investigating":
        return { bg: "rgba(173, 138, 243, 0.15)", text: "var(--security-purple)", border: "#5c4778" };
      case "Reported":
        return { bg: "rgba(255, 215, 0, 0.15)", text: "#ffd700", border: "#8c7b00" };
      case "Confirmed Fraud":
        return { bg: "var(--critical-bg)", text: "var(--critical-text)", border: "var(--critical-border)" };
      case "False Alarm":
      case "Resolved":
        return { bg: "rgba(120, 201, 172, 0.15)", text: "var(--security-green)", border: "#3f665a" };
      default:
        return { bg: "var(--security-control)", text: "var(--security-muted)", border: "var(--security-border)" };
    }
  };

  const statusStyle = getStatusBadgeStyle(transaction.caseStatus);
  const ruleEvidences = getRuleEvidenceDetails(transaction);
  const isCaseClosed =
    transaction.caseStatus === "Confirmed Fraud" ||
    transaction.caseStatus === "False Alarm" ||
    transaction.caseStatus === "Resolved";

  return (
    <>
      <div className={styles.drawerOverlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-label={`Chi tiết giao dịch: ${transaction.transactionReference}`}
        tabIndex={-1}
        style={{ width: "min(680px, 100vw)" }}
      >
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 className={styles.drawerTitle}>Transaction & Case Detail</h2>
              {transaction.caseStatus && (
                <span
                  className={styles.badge}
                  style={{
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    borderColor: statusStyle.border,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {transaction.caseStatus.toUpperCase()}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
              {transaction.transactionReference} {transaction.caseId ? `· Case ID: ${transaction.caseId}` : ""}
            </span>
          </div>
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
          {/* Workflow Stepper */}
          {transaction.caseId && (
            <div className={styles.stepperContainer} aria-label="Tiến độ xử lý hồ sơ">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div key={step.key} className={styles.stepperItem}>
                    <div
                      className={`${styles.stepperDot} ${
                        isActive
                          ? styles.stepperDotActive
                          : isCompleted
                          ? styles.stepperDotCompleted
                          : ""
                      }`}
                    >
                      {isCompleted ? <Check size={11} /> : idx + 1}
                    </div>
                    <span
                      className={`${styles.stepperLabel} ${
                        isActive ? styles.stepperLabelActive : ""
                      }`}
                    >
                      {step.label}
                    </span>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div
                        className={`${styles.stepperLine} ${
                          isCompleted ? styles.stepperLineCompleted : ""
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Transaction info */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Transaction Information (Thông tin đơn hàng)</h3>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Mã giao dịch</span>
              <strong style={{ fontFamily: "monospace" }}>{transaction.transactionReference}</strong>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Khách hàng / Entity</span>
              <span>{transaction.entityReference}</span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Dự án (Project)</span>
              <span>{transaction.projectName}</span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Loại giao dịch</span>
              <span>{transaction.transactionType}</span>
            </div>
            {transaction.channel && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Kênh bán hàng (Channel)</span>
                <span style={{ fontWeight: 600, color: "var(--security-blue)" }}>{transaction.channel}</span>
              </div>
            )}
            {transaction.deviceId && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Mã thiết bị (Device ID)</span>
                <span style={{ fontFamily: "monospace" }}>{transaction.deviceId}</span>
              </div>
            )}
            {transaction.amount != null && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Giá trị đơn hàng</span>
                <span style={{ fontWeight: 600 }}>
                  {transaction.amount.toLocaleString()} {transaction.currency}
                </span>
              </div>
            )}
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Thời gian xử lý</span>
              <span>{new Date(transaction.processedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Risk scoring */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Risk Assessment (Đánh giá nhị phân)</h3>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Đánh giá hệ thống</span>
              <RiskLevelBadge riskLevel={transaction.riskLevel} />
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Risk Score (Ngưỡng τ = {threshold})</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: transaction.riskScore >= threshold ? "var(--security-red)" : "var(--security-green)",
                }}
              >
                {transaction.riskScore}/100
              </span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Nguồn tính điểm</span>
              <ScoringSourceBadge source={transaction.scoringSource} />
            </div>
            {transaction.confidence != null && (
              <div className={styles.drawerRow}>
                <span className={styles.drawerLabel}>Độ tin cậy mô hình (Confidence)</span>
                <span style={{ color: "var(--security-blue)", fontWeight: 600 }}>
                  {(transaction.confidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Detection result & Evidence breakdown */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Detection Result & Evidence Breakdown</h3>
            {ruleEvidences.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {ruleEvidences.map((ev) => (
                  <div key={ev.code} className={styles.evidenceItemCard}>
                    <div className={styles.evidenceItemHeader}>
                      <span className={styles.evidenceItemName}>{ev.name}</span>
                      <span className={styles.evidenceItemScore}>+{ev.riskPoints} pts</span>
                    </div>
                    <div className={styles.evidenceRow}>
                      <div className={styles.evidenceCol}>
                        <span className={styles.evidenceColLabel}>GHI NHẬN THỰC TẾ (OBSERVED)</span>
                        <span className={styles.evidenceObservedVal}>{ev.observed}</span>
                      </div>
                      <div className={styles.evidenceCol}>
                        <span className={styles.evidenceColLabel}>NGƯỠNG QUY ĐỊNH (THRESHOLD)</span>
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

          {/* ───────────────────────────────────────────────────────────── */}
          {/* CASE CREATION (If alert has no case yet)                      */}
          {/* ───────────────────────────────────────────────────────────── */}
          {!transaction.caseId ? (
            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSectionTitle}>Khởi tạo Case Thẩm định</h3>
              <p style={{ fontSize: 12, color: "var(--security-muted)", marginBottom: 12 }}>
                Giao dịch có điểm rủi ro vượt ngưỡng. Tạo hồ sơ case để phân công thẩm định viên điều tra.
              </p>
              <button
                className={styles.drawerPrimaryBtn}
                onClick={handleCreateCase}
                disabled={isMutating || isViewer}
                type="button"
              >
                {isMutating ? "Đang tạo hồ sơ…" : "Tạo Case điều tra (Create Case)"}
              </button>
            </div>
          ) : (
            <>
              {/* ───────────────────────────────────────────────────────────── */}
              {/* BRANCH 1: INVESTIGATOR VIEW (Field Investigation Workbench)   */}
              {/* ───────────────────────────────────────────────────────────── */}
              {isInvestigator && (
                <div
                  className={styles.drawerSection}
                  style={{
                    border: "1px solid #2d5a7b",
                    borderRadius: 6,
                    padding: 16,
                    background: "rgba(113, 185, 244, 0.03)",
                    marginTop: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <h3 className={styles.drawerSectionTitle} style={{ margin: 0, color: "var(--security-blue)", fontSize: 13 }}>
                        Bàn làm việc Thẩm định viên (Investigation Workbench)
                      </h3>
                      <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                        Phụ trách: <strong>{transaction.assignedInvestigator || currentUserName}</strong>
                      </span>
                    </div>
                    <span className={styles.badge} style={{ background: "rgba(113, 185, 244, 0.15)", color: "var(--security-blue)", borderColor: "#2d5a7b" }}>
                      VAI TRÒ: THẨM ĐỊNH VIÊN
                    </span>
                  </div>

                  {/* State 1: Assigned (Waiting to accept) */}
                  {transaction.caseStatus === "Assigned" && (
                    <div style={{ padding: "12px 14px", borderRadius: 5, background: "rgba(113, 185, 244, 0.1)", border: "1px solid #2d5a7b", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: "var(--security-text)", marginBottom: 10 }}>
                        📌 Hồ sơ này vừa được Ban Vận hành phân công cho bạn. Hãy tiếp nhận để bắt đầu thẩm định thực địa.
                      </div>
                      <button
                        className={styles.drawerPrimaryBtn}
                        onClick={handleStartInvestigating}
                        disabled={isMutating}
                        type="button"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          background: "var(--security-blue)",
                        }}
                      >
                        <Play size={15} />
                        {isMutating ? "Đang xử lý…" : "Tiếp nhận & Bắt đầu thẩm định (Accept Case)"}
                      </button>
                    </div>
                  )}

                  {/* State 2: Investigating (Active workspace to write & submit) */}
                  {transaction.caseStatus === "Investigating" && (
                    <>
                      {/* Investigation Notes History */}
                      <div style={{ marginBottom: 14 }}>
                        <span className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
                          Nhật ký xác minh thực địa (Investigation Notes)
                        </span>
                        {transaction.investigationNotes && transaction.investigationNotes.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, maxHeight: 180, overflowY: "auto" }}>
                            {transaction.investigationNotes.map((n, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 4,
                                  background: "var(--security-control)",
                                  fontSize: 11,
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--security-subtle)", marginBottom: 2 }}>
                                  <strong style={{ color: "var(--security-text)" }}>{n.author}</strong>
                                  <span>{n.time}</span>
                                </div>
                                <div style={{ color: "var(--security-text-secondary)" }}>{n.text}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--security-muted)" }}>
                            Chưa có ghi chú nào. Hãy thêm ghi chú khi gọi điện hoặc đối chiếu bưu cục.
                          </p>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            className={styles.searchInput}
                            placeholder="Ghi chú xác minh (VD: Đã gọi khách, số máy bận…)"
                            value={investigatorNote}
                            onChange={(e) => setInvestigatorNote(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddInvestigatorNote()}
                            style={{ flex: 1, minHeight: 32, fontSize: 12 }}
                          />
                          <button
                            className={styles.button}
                            onClick={handleAddInvestigatorNote}
                            disabled={!investigatorNote.trim()}
                            type="button"
                            style={{ minHeight: 32 }}
                          >
                            Ghi lại
                          </button>
                        </div>
                      </div>

                      {/* Evidence Summary Input */}
                      <div style={{ marginBottom: 14 }}>
                        <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 4 }}>
                          Tóm tắt Chứng cứ thực địa (Evidence Summary)
                        </label>
                        <textarea
                          className={styles.searchInput}
                          rows={2}
                          placeholder="VD: Đối chiếu bưu tá phát hiện địa chỉ ảo; người nhận không trùng khớp tên tài khoản…"
                          value={evidenceNotes}
                          onChange={(e) => setEvidenceNotes(e.target.value)}
                          style={{ width: "100%", height: 56, fontSize: 12, padding: "8px 10px", resize: "vertical" }}
                        />
                      </div>

                      {/* Suggested Result Selection */}
                      <div style={{ marginBottom: 14 }}>
                        <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
                          Đề xuất kết quả thẩm tra lên Lãnh đạo (Suggested Finding)
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {(["Suspicious", "Legitimate", "Need More Info"] as InvestigationFinding[]).map((f) => {
                            const info = FINDING_INFO[f];
                            const isChecked = selectedFinding === f;
                            return (
                              <label
                                key={f}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 10,
                                  padding: "8px 12px",
                                  borderRadius: 5,
                                  background: isChecked ? info.bg : "rgba(255, 255, 255, 0.02)",
                                  border: `1px solid ${isChecked ? info.border : "var(--security-border)"}`,
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="invFinding"
                                  value={f}
                                  checked={isChecked}
                                  onChange={() => setSelectedFinding(f)}
                                  style={{ marginTop: 2 }}
                                />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: info.text }}>
                                    {info.label}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--security-subtle)", marginTop: 2 }}>
                                    {info.desc}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Report Notes */}
                      <div style={{ marginBottom: 16 }}>
                        <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 4 }}>
                          Ghi chú báo cáo gửi Trưởng nhóm Vận hành
                        </label>
                        <input
                          className={styles.searchInput}
                          placeholder="Ý kiến đề xuất bổ sung cho Trưởng nhóm…"
                          value={reportNote}
                          onChange={(e) => setReportNote(e.target.value)}
                          style={{ width: "100%", minHeight: 32, fontSize: 12 }}
                        />
                      </div>

                      {/* Submit Report Button */}
                      <button
                        className={styles.drawerPrimaryBtn}
                        onClick={handleSubmitInvestigationReport}
                        disabled={isMutating}
                        type="button"
                        style={{
                          background: "linear-gradient(135deg, #0284c7, #2563eb)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          fontWeight: 600,
                        }}
                      >
                        <Send size={15} />
                        {isMutating ? "Đang gửi báo cáo…" : "Nộp Báo cáo lên Trưởng nhóm Vận hành (Submit Report)"}
                      </button>
                    </>
                  )}

                  {/* State 3: Reported (Submitted, Read-only view for Investigator) */}
                  {transaction.caseStatus === "Reported" && transaction.investigationReport && (
                    <div>
                      <div style={{ padding: "10px 14px", borderRadius: 5, background: "rgba(255, 215, 0, 0.1)", border: "1px solid #8c7b00", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ffd700", fontWeight: 600, fontSize: 12 }}>
                          <Clock size={16} />
                          BÁO CÁO ĐÃ NỘP — ĐANG CHỜ TRƯỞNG NHÓM VẬN HÀNH PHÊ DUYỆT
                        </div>
                        <div style={{ fontSize: 11, color: "var(--security-text-secondary)", marginTop: 4 }}>
                          Bạn đã hoàn tất nộp hồ sơ thẩm tra vào lúc {new Date(transaction.investigationReport.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Trưởng nhóm Vận hành (Trần Mai Anh) đang xem xét để đưa ra quyết định xử lý cuối cùng.
                        </div>
                      </div>

                      {/* Dossier Card */}
                      <div className={styles.dossierCard}>
                        <div className={styles.dossierHeader}>
                          <div className={styles.dossierAuthorInfo}>
                            <div className={styles.dossierAvatar}>
                              <User size={14} />
                            </div>
                            <div>
                              <div className={styles.dossierAuthorName}>
                                Người nộp: {transaction.investigationReport.submittedBy}
                              </div>
                              <div className={styles.dossierTime}>
                                {new Date(transaction.investigationReport.submittedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <span
                            className={styles.badge}
                            style={{
                              background: FINDING_INFO[transaction.investigationReport.finding]?.bg,
                              color: FINDING_INFO[transaction.investigationReport.finding]?.text,
                              borderColor: FINDING_INFO[transaction.investigationReport.finding]?.border,
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {transaction.investigationReport.finding.toUpperCase()}
                          </span>
                        </div>

                        {transaction.investigationReport.evidenceNotes && (
                          <div className={styles.dossierEvidenceBox}>
                            <span className={styles.dossierEvidenceLabel}>Chứng cứ thực địa đã thu thập:</span>
                            <p className={styles.dossierEvidenceText}>{transaction.investigationReport.evidenceNotes}</p>
                          </div>
                        )}

                        {transaction.investigationReport.notes && (
                          <div className={styles.dossierNotesBox}>
                            <strong>Ghi chú phân tích:</strong> {transaction.investigationReport.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* State 4: Closed (Verdict received) */}
                  {isCaseClosed && (
                    <div>
                      <div className={styles.closedVerdictCard}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <ShieldCheck size={18} style={{ color: "var(--security-green)" }} />
                          <strong style={{ fontSize: 13, color: "var(--security-text)" }}>
                            Phán quyết cuối cùng từ Ban Vận hành
                          </strong>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--security-text-secondary)", marginBottom: 6 }}>
                          Trạng thái kết luận: <strong style={{ color: statusStyle.text }}>{transaction.caseStatus}</strong>
                        </div>
                        {transaction.caseDecision?.directive && (
                          <div style={{ fontSize: 11, color: "var(--security-muted)", background: "rgba(255, 255, 255, 0.03)", padding: "8px 10px", borderRadius: 4 }}>
                            <strong>Chỉ đạo xử lý:</strong> {transaction.caseDecision.directive}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* BRANCH 2: OPERATION / ADMIN VIEW (Dispatch & Final Decision)  */}
              {/* ───────────────────────────────────────────────────────────── */}
              {isOperation && (
                <div
                  className={styles.drawerSection}
                  style={{
                    border: "1px solid #483d66",
                    borderRadius: 6,
                    padding: 16,
                    background: "rgba(173, 138, 243, 0.03)",
                    marginTop: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <h3 className={styles.drawerSectionTitle} style={{ margin: 0, color: "var(--security-purple)", fontSize: 13 }}>
                        Bàn Điều phối & Phê duyệt Vận hành (Operation Review & Decision Deck)
                      </h3>
                      <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                        Thẩm quyền: <strong>{currentUserName || "Trần Mai Anh"} (Trưởng nhóm Vận hành)</strong>
                      </span>
                    </div>
                    <span className={styles.badge} style={{ background: "rgba(173, 138, 243, 0.15)", color: "var(--security-purple)", borderColor: "#483d66" }}>
                      VAI TRÒ: VẬN HÀNH / PHÊ DUYỆT
                    </span>
                  </div>

                  {/* 1. Assignment Control */}
                  {!isCaseClosed && (
                    <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 5, background: "rgba(0, 0, 0, 0.2)", border: "1px solid var(--security-border)" }}>
                      <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
                        Phân công Điều tra viên thực địa (Assign Investigator)
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          className={styles.control}
                          value={selectedInvestigator}
                          onChange={(e) => setSelectedInvestigator(e.target.value)}
                          style={{ flex: 1, minHeight: 32 }}
                        >
                          {AVAILABLE_INVESTIGATORS.map((inv) => (
                            <option key={inv} value={inv}>
                              {inv} {inv === "Nguyễn Văn An" ? "(Chuyên viên COD)" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.button}
                          onClick={handleAssignInvestigator}
                          disabled={isMutating}
                          type="button"
                          style={{ minHeight: 32 }}
                        >
                          <UserCheck size={14} style={{ marginRight: 4 }} />
                          {transaction.assignedInvestigator ? "Điều chuyển" : "Gán ca"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Dossier Review from Investigator (READ-ONLY DOSSIER) */}
                  <div style={{ marginBottom: 14 }}>
                    <span className={styles.drawerLabel} style={{ display: "block", marginBottom: 8 }}>
                      Hồ sơ Thẩm tra từ Điều tra viên (Investigator Dossier & Evidence)
                    </span>

                    {transaction.caseStatus === "Open" && (
                      <div style={{ padding: "12px 14px", borderRadius: 5, background: "rgba(237, 167, 101, 0.08)", border: "1px solid #715139", fontSize: 11, color: "var(--security-orange)" }}>
                        ⏳ Hồ sơ đang chờ phân công Điều tra viên thụ lý. Vui lòng chọn điều tra viên ở trên.
                      </div>
                    )}

                    {(transaction.caseStatus === "Assigned" || transaction.caseStatus === "Investigating") && (
                      <div style={{ padding: "12px 14px", borderRadius: 5, background: "rgba(113, 185, 244, 0.08)", border: "1px solid #2d5a7b", fontSize: 11, color: "var(--security-blue)" }}>
                        <div>
                          🔍 Điều tra viên <strong>{transaction.assignedInvestigator || "Nguyễn Văn An"}</strong> đang xác minh thực địa. Chưa có báo cáo kết luận chính thức gửi lên.
                        </div>
                        {transaction.investigationNotes && transaction.investigationNotes.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(113, 185, 244, 0.2)" }}>
                            <div style={{ color: "var(--security-text)", fontWeight: 600, marginBottom: 4 }}>Nhật ký thực địa của ĐTV:</div>
                            {transaction.investigationNotes.map((n, i) => (
                              <div key={i} style={{ color: "var(--security-text-secondary)", marginBottom: 2 }}>
                                • [{n.time}] {n.author}: {n.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* OFFICIAL SUBMITTED REPORT DOSSIER */}
                    {(transaction.caseStatus === "Reported" || isCaseClosed) && transaction.investigationReport && (
                      <div className={styles.dossierCard}>
                        <div className={styles.dossierHeader}>
                          <div className={styles.dossierAuthorInfo}>
                            <div className={styles.dossierAvatar}>
                              <User size={14} />
                            </div>
                            <div>
                              <div className={styles.dossierAuthorName}>
                                Báo cáo từ: {transaction.investigationReport.submittedBy}
                              </div>
                              <div className={styles.dossierTime}>
                                Nộp lúc: {new Date(transaction.investigationReport.submittedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div>
                            <span
                              className={styles.badge}
                              style={{
                                background: FINDING_INFO[transaction.investigationReport.finding]?.bg,
                                color: FINDING_INFO[transaction.investigationReport.finding]?.text,
                                borderColor: FINDING_INFO[transaction.investigationReport.finding]?.border,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              ĐỀ XUẤT: {transaction.investigationReport.finding.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Evidence box */}
                        {transaction.investigationReport.evidenceNotes && (
                          <div className={styles.dossierEvidenceBox}>
                            <span className={styles.dossierEvidenceLabel}>Chứng cứ hiện trường thu thập:</span>
                            <p className={styles.dossierEvidenceText}>{transaction.investigationReport.evidenceNotes}</p>
                          </div>
                        )}

                        {/* Notes box */}
                        {transaction.investigationReport.notes && (
                          <div className={styles.dossierNotesBox}>
                            <strong>Nhận định của Điều tra viên:</strong> {transaction.investigationReport.notes}
                          </div>
                        )}

                        {/* Audit Trail Timeline */}
                        {transaction.investigationNotes && transaction.investigationNotes.length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--security-border)" }}>
                            <span style={{ fontSize: 10, color: "var(--security-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                              Lịch sử nhật ký điều tra:
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {transaction.investigationNotes.map((n, i) => (
                                <div key={i} style={{ fontSize: 11, color: "var(--security-muted)" }}>
                                  <span style={{ color: "var(--security-subtle)" }}>[{n.time}]</span>{" "}
                                  <strong style={{ color: "var(--security-text)" }}>{n.author}:</strong> {n.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Final Authority Decision Deck */}
                  {!isCaseClosed ? (
                    <div className={styles.operationDecisionCard}>
                      <div className={styles.operationDecisionHeader}>
                        <h4 className={styles.operationDecisionTitle}>
                          Thẩm quyền Phê duyệt & Ra phán quyết (Final Authority Deck)
                        </h4>
                        <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                          Chỉ định kết luận & chỉ đạo xử lý
                        </span>
                      </div>

                      {/* Directive input */}
                      <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 4 }}>
                        Chỉ đạo Vận hành / Lý do phê duyệt (Gửi bưu cục / kho vận)
                      </label>
                      <input
                        className={styles.decisionDirectiveInput}
                        placeholder="VD: Xác nhận hủy giao đơn COD này qua Viettel Post, đưa thiết bị vào Blacklist…"
                        value={operationFeedback}
                        onChange={(e) => setOperationFeedback(e.target.value)}
                      />

                      {/* Action buttons */}
                      <div className={styles.decisionActionGrid}>
                        <button
                          className={`${styles.button} ${styles.decisionBtnFraud}`}
                          onClick={() => handleOperationDecision("Confirmed Fraud")}
                          disabled={isMutating}
                          type="button"
                        >
                          <AlertOctagon size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                          Xác nhận Gian lận (Confirm Fraud)
                        </button>

                        <button
                          className={`${styles.button} ${styles.decisionBtnFalseAlarm}`}
                          onClick={() => handleOperationDecision("False Alarm")}
                          disabled={isMutating}
                          type="button"
                        >
                          <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                          Báo động giả (False Alarm)
                        </button>

                        {transaction.caseStatus === "Reported" && (
                          <button
                            className={`${styles.button} ${styles.decisionBtnReinvestigate}`}
                            onClick={() => handleOperationDecision("Investigating")}
                            disabled={isMutating}
                            type="button"
                          >
                            <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                            Yêu cầu Thẩm tra lại (Re-investigate)
                          </button>
                        )}

                        <button
                          className={`${styles.button} ${styles.decisionBtnResolve}`}
                          onClick={() => handleOperationDecision("Resolved")}
                          disabled={isMutating}
                          type="button"
                        >
                          <Check size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                          Đóng hồ sơ (Resolve Case)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.closedVerdictCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <ShieldCheck size={18} style={{ color: "var(--security-green)" }} />
                        <strong style={{ fontSize: 13, color: "var(--security-text)" }}>
                          Hồ sơ đã được đóng với phán quyết chính thức
                        </strong>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--security-text-secondary)", marginBottom: 6 }}>
                        Kết luận: <strong style={{ color: statusStyle.text }}>{transaction.caseStatus}</strong>
                        {transaction.caseDecision?.decidedBy && ` · Bởi: ${transaction.caseDecision.decidedBy}`}
                      </div>
                      {transaction.caseDecision?.directive && (
                        <div style={{ fontSize: 11, color: "var(--security-muted)", background: "rgba(255, 255, 255, 0.03)", padding: "8px 10px", borderRadius: 4 }}>
                          <strong>Chỉ đạo xử lý đã ban hành:</strong> {transaction.caseDecision.directive}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* BRANCH 3: VIEWER (Read-only Summary)                          */}
              {/* ───────────────────────────────────────────────────────────── */}
              {isViewer && (
                <div className={styles.drawerSection} style={{ padding: 14, background: "rgba(255, 255, 255, 0.02)", borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: "var(--security-muted)" }}>
                    🔒 Bạn đang ở chế độ Chỉ đọc (Viewer). Các thao tác điều phối, thẩm tra và ra quyết định bị khóa.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
