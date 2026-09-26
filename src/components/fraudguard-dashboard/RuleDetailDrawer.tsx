"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Copy,
  Edit3,
  Trash2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import type {
  ConditionGroupNode,
  RolePermissions,
  RuleConditionNode,
  RuleTemplate,
  TransactionRisk,
} from "./types";
import { fraudGuardTransactions } from "@/data/fraudguard-transactions";
import styles from "./SecurityDashboard.module.css";

interface RuleDetailDrawerProps {
  rule: RuleTemplate | null;
  open: boolean;
  onClose: () => void;
  onEdit: (rule: RuleTemplate) => void;
  onClone: (rule: RuleTemplate) => void;
  onToggle: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
  permissions?: RolePermissions;
}

const SEVERITY_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "var(--critical-bg)", text: "var(--critical-text)", dot: styles.severityCritical },
  high: { bg: "var(--high-bg)", text: "var(--high-text)", dot: styles.severityHigh },
  medium: { bg: "var(--medium-bg)", text: "var(--medium-text)", dot: styles.severityMedium },
  low: { bg: "rgba(120, 201, 172, 0.15)", text: "var(--security-green)", dot: styles.severityLow },
};

function renderConditionHierarchy(
  node: ConditionGroupNode | RuleConditionNode,
  depth = 0,
): React.ReactNode {
  if (node.type === "condition") {
    return (
      <div
        key={node.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          padding: "6px 10px",
          background: "var(--security-control)",
          borderRadius: 4,
          border: "1px solid var(--security-border)",
          marginLeft: depth * 16,
        }}
      >
        <span className={styles.ruleTag} style={{ fontSize: 11 }}>
          {node.field}
        </span>
        <span style={{ color: "var(--security-orange)", fontWeight: 700, fontSize: 12 }}>
          {node.operator}
        </span>
        <span style={{ color: "var(--security-blue)", fontWeight: 600, fontSize: 12 }}>
          {String(node.value)}
        </span>
      </div>
    );
  }

  return (
    <div key={node.id} style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: depth * 16 }}>
      {depth > 0 && (
        <span
          style={{
            color: "var(--security-purple)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          GROUP LOGIC: {node.logic}
        </span>
      )}
      {node.children.map((child, i) => (
        <div key={child.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {i > 0 && (
            <div style={{ paddingLeft: 12, color: "var(--security-purple)", fontSize: 10, fontWeight: 700 }}>
              {node.logic}
            </div>
          )}
          {renderConditionHierarchy(child, depth + (child.type === "group" ? 1 : 0))}
        </div>
      ))}
    </div>
  );
}

export function RuleDetailDrawer({
  rule,
  open,
  onClose,
  onEdit,
  onClone,
  onToggle,
  onDelete,
  permissions,
}: RuleDetailDrawerProps) {
  const canManage = permissions ? permissions.canManageRules : true;
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus and ESC handling
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    drawerRef.current?.focus();
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Derived Performance Metrics for this Rule
  const metrics = useMemo(() => {
    if (!rule) return null;
    const seed = rule.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const triggers = 28 + (seed % 65);
    const falsePositives = Math.max(1, Math.round(triggers * (0.04 + (seed % 6) * 0.01)));
    const confirmedFraud = triggers - falsePositives;
    const precision = Math.round((confirmedFraud / triggers) * 100);
    const blockedAmountVND = (triggers * (3500000 + (seed % 5000000))).toLocaleString();

    return {
      triggers,
      confirmedFraud,
      falsePositives,
      precision,
      blockedAmountVND,
    };
  }, [rule]);

  // Sample transactions that triggered this rule or category
  const matchedTransactions = useMemo(() => {
    if (!rule) return [];
    const cat = rule.category.toLowerCase();
    const ruleKey = rule.id.toLowerCase();

    return fraudGuardTransactions
      .filter(
        (t) =>
          t.triggeredRules.some(
            (r) =>
              r.toLowerCase().includes(cat) ||
              rule.name.toLowerCase().includes(r.replace(/_/g, " ")),
          ) ||
          (rule.severity === "critical" && t.riskLevel === "Critical") ||
          (rule.severity === "high" && t.riskLevel === "High"),
      )
      .slice(0, 3);
  }, [rule]);

  if (!open || !rule) return null;

  const sevStyle = SEVERITY_COLOR[rule.severity] || SEVERITY_COLOR.medium;

  return (
    <>
      <div className={styles.drawerOverlay} onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-label={`Rule detail: ${rule.name}`}
        tabIndex={-1}
        style={{ width: "min(560px, 100vw)" }}
      >
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: sevStyle.bg,
                display: "grid",
                placeItems: "center",
                color: sevStyle.text,
              }}
            >
              <Sliders size={18} />
            </div>
            <div>
              <h2 className={styles.drawerTitle} style={{ fontSize: 16 }}>
                Rule Specification Detail
              </h2>
              <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                ID: {rule.id}
              </span>
            </div>
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
          {/* Main Info Card */}
          <div className={styles.drawerSection}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className={`${styles.severityDot} ${sevStyle.dot}`} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--security-text)" }}>
                    {rule.name}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  <span className={styles.categoryBadge} style={{ fontSize: 10 }}>
                    CATEGORY: {rule.category}
                  </span>
                  <span
                    className={styles.badge}
                    style={{
                      background: sevStyle.bg,
                      color: sevStyle.text,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {rule.severity.toUpperCase()}
                  </span>
                  <span
                    className={`${styles.badge} ${rule.enabled ? styles.low : styles.medium}`}
                    style={{ fontSize: 10 }}
                  >
                    {rule.enabled ? "ACTIVE (ENABLED)" : "PAUSED (DISABLED)"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--security-text-secondary)", lineHeight: 1.6 }}>
                  {rule.description}
                </p>
              </div>

              {/* Status Toggle Switch */}
              <button
                className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                style={{
                  minWidth: 80,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderColor: rule.enabled ? "var(--security-green)" : "var(--security-border-strong)",
                  color: rule.enabled ? "var(--security-green)" : "var(--security-muted)",
                }}
                onClick={() => canManage && onToggle(rule.id)}
                disabled={!canManage}
                title={!canManage ? "Chỉ SME Admin mới có quyền bật/tắt" : undefined}
                type="button"
              >
                {rule.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>

          {/* Risk Scoring & Thresholds */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Cấu hình Điểm số & Ngưỡng Kích hoạt</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  background: "var(--security-control)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  border: "1px solid var(--security-border)",
                }}
              >
                <div className={styles.drawerLabel} style={{ marginBottom: 4 }}>
                  Điểm phạt rủi ro (Risk Points)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--security-orange)" }}>
                  +{rule.riskPoints} pts
                </div>
                <span style={{ fontSize: 10, color: "var(--security-subtle)" }}>
                  Cộng trực tiếp vào Risk Score Gateway (0–100)
                </span>
              </div>

              <div
                style={{
                  background: "var(--security-control)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  border: "1px solid var(--security-border)",
                }}
              >
                <div className={styles.drawerLabel} style={{ marginBottom: 4 }}>
                  Ngưỡng quyết định (Threshold)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--security-blue)" }}>
                  {rule.threshold}
                </div>
                <span style={{ fontSize: 10, color: "var(--security-subtle)" }}>
                  Tự động kích hoạt Alert nếu điểm ≥ {rule.threshold}
                </span>
              </div>
            </div>

            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Dự án áp dụng (Projects)</span>
              <span style={{ fontWeight: 600, color: "var(--security-text)" }}>
                {rule.appliesTo.projects.join(", ")}
              </span>
            </div>
            <div className={styles.drawerRow}>
              <span className={styles.drawerLabel}>Loại giao dịch (Transaction Types)</span>
              <span style={{ fontWeight: 600, color: "var(--security-text)" }}>
                {rule.appliesTo.transactionTypes.join(", ")}
              </span>
            </div>
          </div>

          {/* Logic & Condition Tree */}
          <div className={styles.drawerSection}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 className={styles.drawerSectionTitle} style={{ margin: 0 }}>
                Cấu trúc Điều kiện (Condition AST)
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--security-purple)",
                  padding: "2px 6px",
                  borderRadius: 3,
                  background: "var(--security-purple-bg)",
                }}
              >
                ROOT LOGIC: {rule.conditionGroup.logic}
              </span>
            </div>

            <div
              style={{
                background: "color-mix(in srgb, var(--security-panel) 90%, black)",
                border: "1px solid var(--security-border)",
                borderRadius: 6,
                padding: "12px 14px",
              }}
            >
              {renderConditionHierarchy(rule.conditionGroup)}
            </div>
          </div>

          {/* 30-Day Performance & Impact Metrics */}
          {metrics && (
            <div className={styles.drawerSection}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <TrendingUp size={16} color="var(--security-green)" />
                <h3 className={styles.drawerSectionTitle} style={{ margin: 0 }}>
                  Hiệu năng thực tế 30 ngày qua
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ background: "var(--security-control)", padding: 10, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--security-text)" }}>
                    {metrics.triggers}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--security-muted)" }}>Số lần kích hoạt</div>
                </div>
                <div style={{ background: "var(--security-control)", padding: 10, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--security-green)" }}>
                    {metrics.precision}%
                  </div>
                  <div style={{ fontSize: 10, color: "var(--security-muted)" }}>Độ chính xác</div>
                </div>
                <div style={{ background: "var(--security-control)", padding: 10, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--critical-text)" }}>
                    {metrics.falsePositives}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--security-muted)" }}>Báo động giả</div>
                </div>
              </div>

              {/* Volume guarded */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: 4,
                  background: "rgba(120, 201, 172, 0.08)",
                  border: "1px solid rgba(120, 201, 172, 0.2)",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--security-text-secondary)" }}>
                  Tổng tiền rủi ro bị chặn lại:
                </span>
                <strong style={{ color: "var(--security-green)", fontSize: 13 }}>
                  {metrics.blockedAmountVND} VND
                </strong>
              </div>
            </div>
          )}

          {/* Sample Matched Transactions */}
          <div className={styles.drawerSection}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Activity size={16} color="var(--security-blue)" />
              <h3 className={styles.drawerSectionTitle} style={{ margin: 0 }}>
                Giao dịch khớp luật gần đây
              </h3>
            </div>

            {matchedTransactions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--security-muted)" }}>
                Chưa có giao dịch nào khớp với rule này trong phiên làm việc.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {matchedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 4,
                      background: "var(--security-control)",
                      border: "1px solid var(--security-border)",
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--security-text)" }}>
                        {tx.transactionReference} · {tx.projectName}
                      </div>
                      <div style={{ color: "var(--security-muted)", fontSize: 10 }}>
                        {tx.amount != null ? `${tx.amount.toLocaleString()} ${tx.currency}` : "N/A"} · Entity: {tx.entityReference}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: tx.riskLevel === "Critical" ? "var(--critical-text)" : "var(--high-text)",
                        }}
                      >
                        Score: {tx.riskScore}/100
                      </span>
                      <div style={{ fontSize: 9, color: "var(--security-subtle)" }}>
                        {new Date(tx.processedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions & Timestamps */}
          <div className={styles.drawerSection}>
            <h3 className={styles.drawerSectionTitle}>Thao tác Quản trị</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                className={`${styles.btnPrimary} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => {
                  onClose();
                  onEdit(rule);
                }}
                disabled={!canManage}
                title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                type="button"
              >
                <Edit3 size={14} /> Edit Rule
              </button>

              <button
                className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => {
                  onClone(rule);
                  onClose();
                }}
                disabled={!canManage}
                title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                type="button"
              >
                <Copy size={14} /> Clone
              </button>

              <button
                className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: canManage ? "var(--critical-text)" : undefined,
                  borderColor: canManage ? "var(--critical-border)" : undefined,
                }}
                onClick={() => {
                  if (confirm(`Bạn có chắc chắn muốn xóa rule "${rule.name}"?`)) {
                    onDelete(rule.id);
                    onClose();
                  }
                }}
                disabled={!canManage}
                title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                type="button"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: "var(--security-subtle)" }}>
              <div>📅 Ngày tạo: {new Date(rule.createdAt).toLocaleString()}</div>
              <div>🔄 Cập nhật lần cuối: {new Date(rule.updatedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
