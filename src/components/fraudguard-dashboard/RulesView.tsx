"use client";

import { useCallback, useState } from "react";
import type { ConditionGroupNode, RolePermissions, RuleConditionNode, RuleTemplate } from "./types";
import { RuleBuilder } from "./RuleBuilder";
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

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleTemplate | null>(null);

  const filteredRules = rules.filter((r) => {
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
          <h1>Rule Templates</h1>
          <p>Cấu hình rule, điều kiện AND/OR, risk point và threshold</p>
        </div>
        <button
          className={`${styles.btnPrimary} ${!canManage ? styles.actionDisabledTooltip : ""}`}
          onClick={() => canManage && handleCreate()}
          disabled={!canManage}
          title={!canManage ? "Chỉ SME Admin mới có quyền tạo Rule mới" : undefined}
          type="button"
        >
          + Create Rule
        </button>
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
    </>
  );
}
