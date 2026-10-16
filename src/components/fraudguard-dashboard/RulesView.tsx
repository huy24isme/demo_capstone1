"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import type {
  ConditionGroupNode,
  RolePermissions,
  RuleConditionNode,
  RuleTemplate,
  TransactionRisk,
} from "./types";
import { candidateRule, saveRuleDraft } from "@/lib/rule-lifecycle";
import { RuleBuilder } from "./RuleBuilder";
import { RuleDetailDrawer } from "./RuleDetailDrawer";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface RulesViewProps {
  transactions?: TransactionRisk[];
  initialRules: RuleTemplate[];
  onRulesChange: React.Dispatch<React.SetStateAction<RuleTemplate[]>>;
  permissions?: RolePermissions;
  onNavigateToTesting?: () => void;
}

function renderConditions(
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
          paddingLeft: depth * 16,
        }}
      >
        <span className={styles.ruleTag}>{node.field}</span>
        <span style={{ color: "var(--security-orange)", fontWeight: 600 }}>
          {node.operator}
        </span>
        <span style={{ color: "var(--security-text)" }}>
          {String(node.value)}
        </span>
      </div>
    );
  }

  return (
    <div key={node.id} style={{ paddingLeft: depth * 16 }}>
      {depth > 0 && (
        <span
          style={{
            color: "var(--security-purple)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          ({node.logic})
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {node.children.map((child, i) => (
          <div key={child.id}>
            {i > 0 && depth === 0 && (
              <span
                style={{
                  color: "var(--security-purple)",
                  fontSize: 11,
                  fontWeight: 600,
                  marginRight: 8,
                }}
              >
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

export function RulesView({ initialRules, onRulesChange, permissions, onNavigateToTesting, transactions }: RulesViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const canManage = permissions ? permissions.canManageRules : true;
  const { toast } = useToast();
  const rules = initialRules;
  const setRules = onRulesChange;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // 2-Tier Rule Architecture state (Review 1 Feedback 3)
  const [ruleTierTab, setRuleTierTab] = useState<"all" | "system" | "custom">("all");
  const isSystemRule = (r: RuleTemplate) => r.category !== "custom";

  const handleStartDryRun = () => { if (permissions?.canAccessRuleTesting) onNavigateToTesting?.(); };

  // Detail Drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRuleForDetail, setSelectedRuleForDetail] =
    useState<RuleTemplate | null>(null);

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
    if (!canManage || rules.find(r => r.id === ruleId)?.status !== "Published") return;
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() }
          : r,
      ),
    );
    setSelectedRuleForDetail((prev) =>
      prev && prev.id === ruleId
        ? { ...prev, enabled: !prev.enabled, updatedAt: new Date().toISOString() }
        : prev,
    );
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      toast(
        "success",
        language === "vi"
          ? `Quy tắc "${rule.name}" đã ${rule.enabled ? "tắt" : "bật"}`
          : `Rule "${rule.name}" ${rule.enabled ? "disabled" : "enabled"}`,
      );
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setBuilderOpen(true);
  };

  const handleEdit = (rule: RuleTemplate) => {
    setEditingRule({ ...candidateRule(rule), status: "Draft" });
    setBuilderOpen(true);
  };

  const handleClone = (rule: RuleTemplate) => {
    const cloned: RuleTemplate = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      enabled: false,
      status: "Draft", version: "v1.0", draft: undefined, history: [], publishedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, cloned]);
    toast(
      "success",
      language === "vi"
        ? `Đã nhân bản quy tắc "${rule.name}"`
        : `Rule "${rule.name}" cloned`,
    );
  };

  const handleDelete = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    if (rule) {
      toast(
        "info",
        language === "vi"
          ? `Đã xóa quy tắc "${rule.name}"`
          : `Rule "${rule.name}" deleted`,
      );
    }
  };

  const handleSave = useCallback(
    (saved: RuleTemplate) => {
      if (!canManage) return;
      setRules((prev) => {
        const exists = prev.find((r) => r.id === saved.id);
        if (exists) {
          return prev.map((r) => (r.id === saved.id ? saveRuleDraft(r, saved) : r));
        }
        return [...prev, saveRuleDraft(undefined, saved)];
      });
      toast(
        "success",
        editingRule
          ? language === "vi"
            ? `Đã lưu bản nháp quy tắc "${saved.name}"`
            : `Rule "${saved.name}" draft saved`
          : language === "vi"
          ? `Đã tạo quy tắc "${saved.name}"`
          : `Rule "${saved.name}" created`,
      );
    },
    [editingRule, toast, language, setRules, canManage],
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
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.rulesView.title}</h1>
          <p>{t.rulesView.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={styles.btnSecondary}
            disabled={!permissions?.canAccessRuleTesting}
            onClick={handleStartDryRun}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {t.rulesView.btnDryRun}
          </button>
          <button
            className={`${styles.btnPrimary} ${!canManage ? styles.actionDisabledTooltip : ""}`}
            onClick={() => canManage && handleCreate()}
            disabled={!canManage}
            title={!canManage ? "Deployment Staff permission required" : undefined}
            type="button"
          >
            {t.rulesView.btnNewRule}
          </button>
        </div>
      </div>

      {/* Stats */}
      <section
        className={styles.metricsGrid}
        style={{ marginTop: 24 }}
      >
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.rulesView.kpis.total}</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>
            {t.rulesView.kpis.totalDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.rulesView.kpis.enabled}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-green)" }}
          >
            {stats.enabled}
          </strong>
          <span className={styles.statDescription}>
            {t.rulesView.kpis.enabledDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.rulesView.kpis.disabled}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-muted)" }}
          >
            {stats.disabled}
          </strong>
          <span className={styles.statDescription}>
            {t.rulesView.kpis.disabledDesc}
          </span>
        </article>
      </section>

      {/* 2-Tier Rule Engine Tabs (Review 1 Feedback 3) */}
      <div
        className={styles.tabs}
        style={{
          margin: "16px 0 14px 0",
          borderBottom: "1px solid var(--security-border)",
        }}
      >
        <button
          className={`${styles.tab} ${ruleTierTab === "all" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("all")}
          type="button"
        >
          {t.rulesView.tierTabs.all.replace("{count}", String(rules.length))}
        </button>
        <button
          className={`${styles.tab} ${ruleTierTab === "system" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("system")}
          type="button"
        >
          {t.rulesView.tierTabs.system.replace("{count}", String(systemRulesCount))}
        </button>
        <button
          className={`${styles.tab} ${ruleTierTab === "custom" ? styles.tabActive : ""}`}
          onClick={() => setRuleTierTab("custom")}
          type="button"
        >
          {t.rulesView.tierTabs.custom.replace("{count}", String(customRulesCount))}
        </button>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label={t.rulesView.filters.status}
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
          >
            <option value="all">{t.rulesView.filters.allStatus}</option>
            <option value="enabled">{t.rulesView.filters.enabledOnly}</option>
            <option value="disabled">{t.rulesView.filters.disabledOnly}</option>
          </select>
          <select
            className={styles.control}
            aria-label={t.rulesView.filters.category}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">{t.rulesView.filters.allCategories}</option>
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
              style={{ padding: "16px", opacity: rule.enabled ? 1 : 0.65 }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{ flex: 1, cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className={styles.ruleTag}
                      style={{
                        color: "var(--security-blue)",
                        borderColor: "var(--security-border-strong)",
                      }}
                    >
                      {rule.version || "v1.0"}{rule.draft ? (language === "vi" ? " · Có bản nháp" : " · Draft pending") : ""}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--security-text)",
                      }}
                    >
                      {rule.name}
                    </span>
                    {rule.status && rule.status !== "Published" && (
                      <span
                        className={styles.badge}
                        style={{
                          background: "rgba(237, 167, 101, 0.15)",
                          color: "var(--security-orange)",
                          borderColor: "var(--high-border)",
                          fontSize: 11,
                        }}
                      >
                        {rule.status.toUpperCase()}
                      </span>
                    )}
                    <span
                      className={`${styles.badge} ${rule.enabled ? styles.low : styles.medium}`}
                      style={{ fontSize: 11 }}
                    >
                      {rule.enabled ? "ENABLED" : "DISABLED"}
                    </span>
                    <span className={styles.categoryBadge}>{rule.category}</span>
                    <span style={{ fontSize: 11, color: "var(--security-subtle)" }}>
                      {rule.conditionGroup.logic}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--security-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {rule.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexShrink: 0,
                  }}
                >

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
                    title={t.rulesView.card.btnDetails}
                    type="button"
                  >
                    <Eye size={14} color="var(--security-blue)" />
                    {t.rulesView.card.btnDetails}
                  </button>

                  <button
                    className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                    onClick={() => canManage && handleToggle(rule.id)}
                    disabled={!canManage || rule.status !== "Published"}
                    title={!canManage ? "Deployment Staff permission required" : undefined}
                    style={{ minWidth: 70 }}
                    type="button"
                  >
                    {rule.enabled
                      ? t.rulesView.card.btnDisable
                      : t.rulesView.card.btnEnable}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid var(--security-border)",
                  }}
                >
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
                    {t.rulesView.card.conditions.replace(
                      "{logic}",
                      rule.conditionGroup.logic,
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {renderConditions(rule.conditionGroup)}
                  </div>

                  {/* Applies to */}
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: "var(--security-muted)",
                    }}
                  >
                    <strong>{t.rulesView.card.appliesTo}</strong>{" "}
                    {t.rulesView.card.types} {rule.appliesTo.transactionTypes.join(", ")} ·{" "}
                    {t.rulesView.card.projects} {rule.appliesTo.projects.join(", ")}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleEdit(rule)}
                      disabled={!canManage}
                      title={!canManage ? "Deployment Staff permission required" : undefined}
                      type="button"
                    >
                      {t.rulesView.card.btnEdit}
                    </button>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleClone(rule)}
                      disabled={!canManage}
                      title={!canManage ? "Deployment Staff permission required" : undefined}
                      type="button"
                    >
                      {t.rulesView.card.btnClone}
                    </button>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      onClick={() => canManage && handleDelete(rule.id)}
                      disabled={!canManage}
                      title={!canManage ? "Deployment Staff permission required" : undefined}
                      style={{ color: canManage ? "var(--critical-text)" : undefined }}
                      type="button"
                    >
                      {t.rulesView.card.btnDelete}
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: "var(--security-subtle)",
                    }}
                  >
                    {t.rulesView.card.updated}{" "}
                    {new Date(rule.updatedAt).toLocaleDateString(dateLocale)}
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
        transactions={transactions}
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

      {/* Dry-run Simulation Modal */}
    </>
  );
}
