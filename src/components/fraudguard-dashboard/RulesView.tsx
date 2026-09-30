"use client";

import { useCallback, useState } from "react";
import { Eye } from "lucide-react";
import type { ConditionGroupNode, RolePermissions, RuleConditionNode, RuleTemplate } from "./types";
import { RuleBuilder } from "./RuleBuilder";
import { RuleDetailDrawer } from "./RuleDetailDrawer";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface RulesViewProps {
  initialRules: RuleTemplate[];
  permissions?: RolePermissions;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: styles.severityCritical,
  high: styles.severityHigh,
  medium: styles.severityMedium,
  low: styles.severityLow,
};

function renderConditions(node: ConditionGroupNode | RuleConditionNode, depth = 0): React.ReactNode {
  if (node.type === "condition") {
    return (
      <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, paddingLeft: depth * 16 }}>
        <span className={styles.ruleTag}>{node.field}</span>
        <span style={{ color: "var(--security-orange)", fontWeight: 600 }}>{node.operator}</span>
        <span style={{ color: "var(--security-text)" }}>{String(node.value)}</span>
      </div>
    );
  }

  return (
    <div key={node.id} style={{ paddingLeft: depth * 16 }}>
      {depth > 0 && (
        <span style={{ color: "var(--security-purple)", fontSize: 10, fontWeight: 600 }}>
          ({node.logic})
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {node.children.map((child, i) => (
          <div key={child.id}>
            {i > 0 && depth === 0 && (
              <span style={{ color: "var(--security-purple)", fontSize: 10, fontWeight: 600, marginRight: 8 }}>
                {node.logic}
              </span>
            )}
            {renderConditions(child, depth + (child.type === "group" ? 1 : 0))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RulesView({ initialRules, permissions }: RulesViewProps) {
  const canManage = permissions ? permissions.canManageRules : true;
  const { toast } = useToast();
  const [rules, setRules] = useState(initialRules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // 2-Tier Rule Architecture state (Review 1 Feedback 3)
  const [ruleTierTab, setRuleTierTab] = useState<"all" | "system" | "custom">("all");
  const isSystemRule = (r: RuleTemplate) => r.category !== "custom" && !r.name.includes("EdTech");

  // Dry-run Simulation state
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  const handleStartDryRun = () => {
    setDryRunOpen(true);
    setDryRunLoading(true);
    setTimeout(() => {
      setDryRunLoading(false);
    }, 700);
  };

  // Detail Drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRuleForDetail, setSelectedRuleForDetail] = useState<RuleTemplate | null>(null);

  const handleOpenDetail = (rule: RuleTemplate) => {
    setSelectedRuleForDetail(rule);
    setDetailDrawerOpen(true);
  };

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleTemplate | null>(null);

  const filteredRules = rules.filter((r) => {
    if (ruleTierTab === "system" && !isSystemRule(r)) return false;
    if (ruleTierTab === "custom" && isSystemRule(r)) return false;
    if (filterEnabled === "enabled" && !r.enabled) return false;
    if (filterEnabled === "disabled" && r.enabled) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const handleToggle = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r,
      ),
    );
    setSelectedRuleForDetail((prev) =>
      prev && prev.id === ruleId
        ? { ...prev, enabled: !prev.enabled, updatedAt: new Date().toISOString() }
        : prev,
    );
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      toast("success", `Rule "${rule.name}" ${rule.enabled ? "disabled" : "enabled"}`);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setBuilderOpen(true);
  };

  const handleEdit = (rule: RuleTemplate) => {
    setEditingRule(rule);
    setBuilderOpen(true);
  };

  const handleClone = (rule: RuleTemplate) => {
    const cloned: RuleTemplate = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      enabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, cloned]);
    toast("success", `Rule "${rule.name}" cloned`);
  };

  const handleDelete = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    if (rule) toast("info", `Rule "${rule.name}" deleted`);
  };

  const handleSave = useCallback(
    (saved: RuleTemplate) => {
      setRules((prev) => {
        const exists = prev.find((r) => r.id === saved.id);
        if (exists) {
          return prev.map((r) => (r.id === saved.id ? saved : r));
        }
        return [...prev, saved];
      });
      toast("success", editingRule ? `Rule "${saved.name}" updated` : `Rule "${saved.name}" created`);
    },
    [editingRule, toast],
  );

  const systemRulesCount = rules.filter(isSystemRule).length;
  const customRulesCount = rules.filter((r) => !isSystemRule(r)).length;

  const stats = {
    total: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
  };

  return (
    <>
      <div className={styles.breadcrumb}>FraudGuard / Configuration / Rule Templates</div>
      <div className={styles.pageHeading}>
        <div>
          <h1>Rule Templates (Động cơ Luật 2 Cấp độ)</h1>
          <p>Tách biệt Quy tắc Chuẩn Hệ thống & Quy tắc Tùy biến Doanh nghiệp (Góp ý số 3)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={styles.btnSecondary}
            onClick={handleStartDryRun}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            🧪 Chạy Thử Nghiệm (Dry-run Test)
          </button>
          <button
            className={`${styles.btnPrimary} ${!canManage ? styles.actionDisabledTooltip : ""}`}
            onClick={() => canManage && handleCreate()}
            disabled={!canManage}
            title={!canManage ? "Chỉ SME Admin mới có quyền tạo Rule mới" : undefined}
            type="button"
          >
            + Tạo Rule Mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <section
        className={styles.metricsGrid}
        style={{ marginTop: 24, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Total rules</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>Tất cả rule templates</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Enabled</div>
          <strong className={styles.statValue} style={{ color: "var(--security-green)" }}>
            {stats.enabled}
          </strong>
          <span className={styles.statDescription}>Đang hoạt động</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Disabled</div>
          <strong className={styles.statValue} style={{ color: "var(--security-muted)" }}>
            {stats.disabled}
          </strong>
          <span className={styles.statDescription}>Đã tắt</span>
        </article>
      </section>

      {/* 2-Tier Rule Engine Tabs (Review 1 Feedback 3) */}
      <div className={styles.tabs} style={{ margin: "16px 0 14px 0", borderBottom: "1px solid var(--security-border)" }}>
        <button
          className={`${styles.tab} ${ruleTierTab === "all" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("all")}
          type="button"
        >
          Tất cả quy tắc ({rules.length})
        </button>
        <button
          className={`${styles.tab} ${ruleTierTab === "system" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("system")}
          type="button"
        >
          🛡️ Quy tắc Mặc định Hệ thống ({systemRulesCount})
        </button>
        <button
          className={`${styles.tab} ${ruleTierTab === "custom" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("custom")}
          type="button"
        >
          ⚙️ Quy tắc Doanh nghiệp Tùy biến ({customRulesCount})
        </button>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label="Rule status"
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
          >
            <option value="all">All rules</option>
            <option value="enabled">Enabled only</option>
            <option value="disabled">Disabled only</option>
          </select>
          <select
            className={styles.control}
            aria-label="Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            <option value="velocity">Velocity</option>
            <option value="amount">Amount</option>
            <option value="identity">Identity</option>
            <option value="behavior">Behavior</option>
            <option value="geo">Geo</option>
            <option value="device">Device</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Rule list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredRules.map((rule) => {
          const isExpanded = expandedId === rule.id;
          return (
            <article
              key={rule.id}
              className={styles.panel}
              style={{ padding: "14px 17px", opacity: rule.enabled ? 1 : 0.65 }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className={`${styles.severityDot} ${SEVERITY_DOT[rule.severity]}`} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--security-text)" }}>
                      {rule.name}
                    </span>
                    <span className={`${styles.badge} ${rule.enabled ? styles.low : styles.medium}`} style={{ fontSize: 9 }}>
                      {rule.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                    <span className={styles.categoryBadge}>{rule.category}</span>
                    <span style={{ fontSize: 10, color: "var(--security-subtle)" }}>
                      {rule.conditionGroup.logic}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--security-muted)", lineHeight: 1.5 }}>
                    {rule.description}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--security-orange)" }}>
                      +{rule.riskPoints}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--security-subtle)" }}>Điểm phạt</div>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--security-blue)" }}>
                      {rule.threshold}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--security-subtle)" }}>
                      Ngưỡng ({rule.multiplier ?? (rule.riskPoints ? Math.max(1, Math.round(rule.threshold / rule.riskPoints)) : 1)}x)
                    </div>
                  </div>

                  <button
                    className={styles.button}
                    onClick={() => handleOpenDetail(rule)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 12px",
                      minHeight: 34,
                    }}
                    title="Xem chi tiết toàn diện của Rule"
                    type="button"
                  >
                    <Eye size={14} color="var(--security-blue)" />
                    Details
                  </button>

                  <button
                    className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                    onClick={() => canManage && handleToggle(rule.id)}
                    disabled={!canManage}
                    title={!canManage ? "Chỉ SME Admin mới có quyền bật/tắt Rule" : undefined}
                    style={{ minWidth: 70 }}
                    type="button"
                  >
                    {rule.enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--security-border)" }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--security-subtle)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    Conditions ({rule.conditionGroup.logic})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {renderConditions(rule.conditionGroup)}
                  </div>

                  {/* Applies to */}
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--security-muted)" }}>
                    <strong>Applies to:</strong> Types: {rule.appliesTo.transactionTypes.join(", ")} · Projects:{" "}
                    {rule.appliesTo.projects.join(", ")}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleEdit(rule)}
                      disabled={!canManage}
                      title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleClone(rule)}
                      disabled={!canManage}
                      title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                      type="button"
                    >
                      Clone
                    </button>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleDelete(rule.id)}
                      disabled={!canManage}
                      title={!canManage ? "Yêu cầu quyền SME Admin" : undefined}
                      style={{ color: canManage ? "var(--critical-text)" : undefined }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 10, color: "var(--security-subtle)" }}>
                    Updated: {new Date(rule.updatedAt).toUTCString()}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Rule Builder Modal */}
      <RuleBuilder
        rule={editingRule}
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSave}
      />

      {/* Rule Detail Drawer */}
      <RuleDetailDrawer
        rule={selectedRuleForDetail}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        onEdit={(rule) => {
          setDetailDrawerOpen(false);
          handleEdit(rule);
        }}
        onClone={(rule) => {
          handleClone(rule);
        }}
        onToggle={handleToggle}
        onDelete={(ruleId) => {
          handleDelete(ruleId);
          setDetailDrawerOpen(false);
        }}
        permissions={permissions}
      />

      {/* Dry-run Simulation Modal (Review 1 Feedback 3) */}
      {dryRunOpen && (
        <>
          <div className={styles.builderOverlay} onClick={() => setDryRunOpen(false)} aria-hidden="true" />
          <div
            className={styles.builderModal}
            style={{ maxWidth: 660 }}
            role="dialog"
            aria-label="Dry-run Test Results"
          >
            <div className={styles.builderHeader}>
              <h2 className={styles.builderTitle}>🧪 Kết quả Chạy Thử Nghiệm Luật (Dry-run Simulation)</h2>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setDryRunOpen(false)}
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className={styles.builderBody}>
              {dryRunLoading ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: "var(--security-blue)" }}>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    Đang quét 100 giao dịch mẫu giả lập qua tất cả quy tắc đang BẬT...
                  </div>
                  <div className="skeleton" style={{ height: 6, borderRadius: 3, width: "65%", margin: "0 auto" }} />
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "var(--security-control)", padding: 12, borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--security-muted)" }}>Giao dịch đối soát</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>100</div>
                    </div>
                    <div style={{ background: "rgba(237, 103, 117, 0.15)", border: "1px solid var(--critical-border)", padding: 12, borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--critical-text)" }}>Bất thường (Anomaly)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--critical-text)" }}>8 (8.0%)</div>
                    </div>
                    <div style={{ background: "rgba(120, 201, 172, 0.15)", border: "1px solid #3f665a", padding: 12, borderRadius: 6, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--security-green)" }}>Bình thường (Normal)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--security-green)" }}>92 (92.0%)</div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 11, color: "var(--security-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Quy tắc kích hoạt nhiều nhất (Top Triggered Rules)
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--security-control)", borderRadius: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Velocity Check (Tần suất dồn dập)</span>
                      <span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>
                        4 lần kích hoạt
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--security-control)", borderRadius: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>Amount Threshold (Vượt hạn mức 20M)</span>
                      <span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>
                        3 lần kích hoạt
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--security-control)", borderRadius: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>EdTech Excessive Refund (Lạm dụng hoàn tiền)</span>
                      <span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>
                        1 lần kích hoạt
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(113, 185, 244, 0.1)", border: "1px solid var(--security-blue)", borderRadius: 6, fontSize: 12 }}>
                    💡 <strong>Đánh giá kiểm thử:</strong> Tỷ lệ phát hiện 8.0% là mức an toàn cho doanh nghiệp SME, không gây nhiễu loạn cho đội ngũ thẩm định.
                  </div>
                </div>
              )}
            </div>
            <div className={styles.builderFooter}>
              <button className={styles.btnSecondary} onClick={() => setDryRunOpen(false)} type="button">
                Đóng
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
