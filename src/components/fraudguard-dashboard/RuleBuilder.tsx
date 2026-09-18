"use client";

import { useEffect, useState } from "react";
import type {
  ConditionGroupNode,
  ConditionOperator,
  LogicGroup,
  RuleCategory,
  RuleConditionNode,
  RuleSeverity,
  RuleTemplate,
} from "./types";
import styles from "./SecurityDashboard.module.css";

/* ── Field definitions with Category mapping & smart defaults ── */

interface FieldMeta {
  value: string;
  label: string;
  group: string;
  category: RuleCategory | "all";
  defaultOperator: ConditionOperator;
  defaultValue: string | number | boolean;
  valueType: "number" | "string" | "boolean";
  placeholder?: string;
}

const FIELDS: FieldMeta[] = [
  // Geo
  {
    value: "geo.country",
    label: "Country",
    group: "Geo",
    category: "geo",
    defaultOperator: "!=",
    defaultValue: "VN",
    valueType: "string",
    placeholder: "e.g. VN, US, SG",
  },
  {
    value: "geo.distance_km",
    label: "Distance (km)",
    group: "Geo",
    category: "geo",
    defaultOperator: ">",
    defaultValue: 500,
    valueType: "number",
    placeholder: "500",
  },
  // Velocity
  {
    value: "velocity.tx_count.1h",
    label: "TX count (1h)",
    group: "Velocity",
    category: "velocity",
    defaultOperator: ">",
    defaultValue: 10,
    valueType: "number",
    placeholder: "10",
  },
  {
    value: "velocity.tx_count.24h",
    label: "TX count (24h)",
    group: "Velocity",
    category: "velocity",
    defaultOperator: ">",
    defaultValue: 50,
    valueType: "number",
    placeholder: "50",
  },
  {
    value: "velocity.password_reset.1h",
    label: "Password resets (1h)",
    group: "Velocity",
    category: "velocity",
    defaultOperator: ">",
    defaultValue: 0,
    valueType: "number",
    placeholder: "0",
  },
  {
    value: "velocity.unique_ips.1h",
    label: "Unique IPs (1h)",
    group: "Velocity",
    category: "velocity",
    defaultOperator: ">",
    defaultValue: 3,
    valueType: "number",
    placeholder: "3",
  },
  // Amount / Transaction
  {
    value: "amount",
    label: "Amount",
    group: "Transaction",
    category: "amount",
    defaultOperator: ">",
    defaultValue: 20000000,
    valueType: "number",
    placeholder: "20,000,000",
  },
  {
    value: "currency",
    label: "Currency",
    group: "Transaction",
    category: "amount",
    defaultOperator: "==",
    defaultValue: "VND",
    valueType: "string",
    placeholder: "VND",
  },
  {
    value: "entity.avg_amount",
    label: "Avg amount (history)",
    group: "Transaction",
    category: "amount",
    defaultOperator: ">",
    defaultValue: 5000000,
    valueType: "number",
    placeholder: "5,000,000",
  },
  // Device
  {
    value: "device.is_new",
    label: "New device",
    group: "Device",
    category: "device",
    defaultOperator: "==",
    defaultValue: true,
    valueType: "boolean",
  },
  {
    value: "device.is_blacklisted",
    label: "Blacklisted device",
    group: "Device",
    category: "device",
    defaultOperator: "==",
    defaultValue: true,
    valueType: "boolean",
  },
  // Identity
  {
    value: "entity.age_days",
    label: "Account age (days)",
    group: "Identity",
    category: "identity",
    defaultOperator: "<",
    defaultValue: 30,
    valueType: "number",
    placeholder: "30",
  },
  // Behavior / Time
  {
    value: "entity.dormant_days",
    label: "Dormant days",
    group: "Behavior",
    category: "behavior",
    defaultOperator: ">",
    defaultValue: 90,
    valueType: "number",
    placeholder: "90",
  },
  {
    value: "time.hour",
    label: "Hour (0-23)",
    group: "Behavior",
    category: "behavior",
    defaultOperator: "<",
    defaultValue: 6,
    valueType: "number",
    placeholder: "6",
  },
  {
    value: "time.is_weekend",
    label: "Is weekend",
    group: "Behavior",
    category: "behavior",
    defaultOperator: "==",
    defaultValue: true,
    valueType: "boolean",
  },
  {
    value: "time_since_last_tx_min",
    label: "Minutes since last TX",
    group: "Behavior",
    category: "behavior",
    defaultOperator: "<",
    defaultValue: 120,
    valueType: "number",
    placeholder: "120",
  },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: "in", label: "in" },
  { value: "not_in", label: "not in" },
];

const CATEGORIES: { value: RuleCategory; label: string }[] = [
  { value: "velocity", label: "Velocity (Tần suất)" },
  { value: "amount", label: "Amount (Số tiền)" },
  { value: "identity", label: "Identity (Danh tính)" },
  { value: "behavior", label: "Behavior (Hành vi)" },
  { value: "geo", label: "Geo (Vị trí địa lý)" },
  { value: "device", label: "Device (Thiết bị)" },
  { value: "custom", label: "Custom (Tùy chỉnh)" },
];

const SEVERITIES: { value: RuleSeverity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/* ── Helpers ── */

let _counter = 0;
function uid() {
  return `n-${Date.now()}-${++_counter}`;
}

function getFieldMeta(fieldValue: string): FieldMeta {
  return (
    FIELDS.find((f) => f.value === fieldValue) ?? {
      value: fieldValue,
      label: fieldValue,
      group: "Custom",
      category: "custom",
      defaultOperator: ">",
      defaultValue: 0,
      valueType: "number",
    }
  );
}

function createConditionForCategory(category: RuleCategory): RuleConditionNode {
  const match =
    FIELDS.find((f) => f.category === category) ?? FIELDS[0];
  return {
    type: "condition",
    id: uid(),
    field: match.value,
    operator: match.defaultOperator,
    value: match.defaultValue,
  };
}

function emptyGroupForCategory(category: RuleCategory): ConditionGroupNode {
  return {
    type: "group",
    id: uid(),
    logic: "AND",
    children: [createConditionForCategory(category)],
  };
}

const MULTIPLIER_OPTIONS = [
  { value: 1, label: "1x - Kích hoạt ngay lần đầu vi phạm" },
  { value: 2, label: "2x - Cần tích lũy / tái phạm 2 lần" },
  { value: 3, label: "3x - Cần tích lũy / tái phạm 3 lần (3-Strike)" },
  { value: 4, label: "4x - Tích lũy cấp độ nghiêm trọng cao" },
];

function emptyRule(category: RuleCategory = "geo"): Omit<RuleTemplate, "id" | "createdAt" | "updatedAt"> {
  const riskPoints = 25;
  const multiplier = 1;
  return {
    name: "",
    description: "",
    category,
    severity: "medium",
    conditionGroup: emptyGroupForCategory(category),
    riskPoints,
    multiplier,
    threshold: Math.min(100, riskPoints * multiplier),
    enabled: true,
    appliesTo: { transactionTypes: ["*"], projects: ["*"] },
  };
}

/* ── Condition Group Editor (recursive) ── */

function ConditionGroupEditor({
  group,
  selectedCategory,
  onChange,
  onRemove,
  isRoot = false,
}: {
  group: ConditionGroupNode;
  selectedCategory: RuleCategory;
  onChange: (updated: ConditionGroupNode) => void;
  onRemove?: () => void;
  isRoot?: boolean;
}) {
  const updateChild = (index: number, child: RuleConditionNode | ConditionGroupNode) => {
    const next = [...group.children];
    next[index] = child;
    onChange({ ...group, children: next });
  };

  const removeChild = (index: number) => {
    onChange({ ...group, children: group.children.filter((_, i) => i !== index) });
  };

  const addCondition = () => {
    onChange({
      ...group,
      children: [...group.children, createConditionForCategory(selectedCategory)],
    });
  };

  const addSubGroup = () => {
    onChange({
      ...group,
      children: [...group.children, emptyGroupForCategory(selectedCategory)],
    });
  };

  const toggleLogic = (logic: LogicGroup) => {
    onChange({ ...group, logic });
  };

  // Group fields: category-specific first, then other fields
  const categoryFields = FIELDS.filter(
    (f) => selectedCategory === "custom" || f.category === selectedCategory,
  );
  const otherFields = FIELDS.filter(
    (f) => selectedCategory !== "custom" && f.category !== selectedCategory,
  );

  return (
    <div className={`${styles.conditionGroup} ${!isRoot ? styles.conditionGroupNested : ""}`}>
      <div className={styles.conditionGroupHeader}>
        <div className={styles.logicToggle}>
          <button
            type="button"
            className={`${styles.logicBtn} ${group.logic === "AND" ? styles.logicBtnActive : ""}`}
            onClick={() => toggleLogic("AND")}
          >
            AND
          </button>
          <button
            type="button"
            className={`${styles.logicBtn} ${group.logic === "OR" ? styles.logicBtnActive : ""}`}
            onClick={() => toggleLogic("OR")}
          >
            OR
          </button>
        </div>
        {!isRoot && onRemove && (
          <button type="button" className={styles.conditionRemove} onClick={onRemove} title="Remove group">
            ✕
          </button>
        )}
      </div>

      {group.children.map((child, i) => {
        if (child.type === "group") {
          return (
            <ConditionGroupEditor
              key={child.id}
              group={child}
              selectedCategory={selectedCategory}
              onChange={(updated) => updateChild(i, updated)}
              onRemove={() => removeChild(i)}
            />
          );
        }

        const meta = getFieldMeta(child.field);

        return (
          <div key={child.id} className={styles.conditionRow}>
            {/* Field selection with optgroup prioritized by selected Category */}
            <select
              className={styles.conditionField}
              value={child.field}
              onChange={(e) => {
                const newField = e.target.value;
                const newMeta = getFieldMeta(newField);
                updateChild(i, {
                  ...child,
                  field: newField,
                  operator: newMeta.defaultOperator,
                  value: newMeta.defaultValue,
                });
              }}
            >
              {selectedCategory !== "custom" && categoryFields.length > 0 && (
                <optgroup label={`★ Khuyên dùng cho ${selectedCategory.toUpperCase()}`}>
                  {categoryFields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.group} - {f.label}
                    </option>
                  ))}
                </optgroup>
              )}

              {otherFields.length > 0 && (
                <optgroup label={selectedCategory === "custom" ? "Tất cả trường dữ liệu" : "Các trường khác"}>
                  {otherFields.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.group} - {f.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Operator selection */}
            <select
              className={styles.conditionOp}
              value={child.operator}
              onChange={(e) =>
                updateChild(i, { ...child, operator: e.target.value as ConditionOperator })
              }
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            {/* Value input: smart boolean switch or text/number input */}
            {meta.valueType === "boolean" ? (
              <select
                className={styles.conditionValue}
                value={String(child.value)}
                onChange={(e) => updateChild(i, { ...child, value: e.target.value === "true" })}
              >
                <option value="true">True (Đúng)</option>
                <option value="false">False (Sai)</option>
              </select>
            ) : (
              <input
                className={styles.conditionValue}
                type={meta.valueType === "number" ? "number" : "text"}
                value={String(child.value)}
                placeholder={meta.placeholder || "Value"}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = Number(raw);
                  updateChild(i, {
                    ...child,
                    value: meta.valueType === "number" ? (isNaN(num) || raw === "" ? raw : num) : raw,
                  });
                }}
              />
            )}

            {group.children.length > 1 && (
              <button
                type="button"
                className={styles.conditionRemove}
                onClick={() => removeChild(i)}
                title="Remove"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <div className={styles.conditionActions}>
        <button type="button" className={styles.addBtn} onClick={addCondition}>
          + Condition
        </button>
        <button type="button" className={styles.addBtn} onClick={addSubGroup}>
          + Sub-group
        </button>
      </div>
    </div>
  );
}

/* ── Rule Builder Modal ── */

interface RuleBuilderProps {
  rule?: RuleTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (rule: RuleTemplate) => void;
}

export function RuleBuilder({ rule, open, onClose, onSave }: RuleBuilderProps) {
  const isEdit = !!rule;
  const [form, setForm] = useState(emptyRule("geo"));

  useEffect(() => {
    if (rule) {
      const rp = rule.riskPoints ?? 25;
      const mult = rule.multiplier ?? (rule.threshold ? Math.max(1, Math.round(rule.threshold / (rp || 1))) : 1);
      const th = rule.threshold ?? Math.min(100, rp * mult);
      setForm({
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        conditionGroup: rule.conditionGroup,
        riskPoints: rp,
        multiplier: mult,
        threshold: th,
        enabled: rule.enabled,
        appliesTo: rule.appliesTo,
      });
    } else {
      setForm(emptyRule("geo"));
    }
  }, [rule]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: rule?.id ?? `rule-${Date.now()}`,
      ...form,
      createdAt: rule?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  const patch = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleRiskPointsChange = (val: number) => {
    const points = Math.max(1, Math.min(100, isNaN(val) ? 0 : val));
    setForm((prev) => {
      const mult = prev.multiplier || 1;
      return {
        ...prev,
        riskPoints: points,
        threshold: Math.min(100, points * mult),
      };
    });
  };

  const handleMultiplierChange = (mult: number) => {
    setForm((prev) => ({
      ...prev,
      multiplier: mult,
      threshold: Math.min(100, (prev.riskPoints || 25) * mult),
    }));
  };

  // Handle category change: auto-update default condition if building new rule
  const handleCategoryChange = (newCategory: RuleCategory) => {
    setForm((prev) => {
      const isUntouchedSingleCondition =
        prev.conditionGroup.children.length === 1 &&
        prev.conditionGroup.children[0].type === "condition";

      return {
        ...prev,
        category: newCategory,
        conditionGroup: isUntouchedSingleCondition
          ? emptyGroupForCategory(newCategory)
          : prev.conditionGroup,
      };
    });
  };

  return (
    <div className={styles.builderOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.builderModal} role="dialog" aria-label={isEdit ? "Edit rule" : "Create rule"}>
        <div className={styles.builderHeader}>
          <h2 className={styles.builderTitle}>{isEdit ? "Edit Rule" : "Create Rule"}</h2>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.builderBody}>
          {/* Category + Severity on top so Category drives the template */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category (Phân loại)</label>
              <select
                className={styles.formInput}
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as RuleCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Severity (Mức độ)</label>
              <select
                className={styles.formInput}
                value={form.severity}
                onChange={(e) => patch("severity", e.target.value as RuleSeverity)}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Rule name</label>
            <input
              className={styles.formInput}
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="e.g. Unusual Overseas Withdrawal"
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Description</label>
            <textarea
              className={styles.formTextarea}
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="Mô tả mục đích của rule này..."
            />
          </div>

          {/* Risk Points + Multiplier Threshold Row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Điểm phạt (Risk Points: 1-100)</label>
              <input
                className={styles.formInput}
                type="number"
                min={1}
                max={100}
                value={form.riskPoints}
                onChange={(e) => handleRiskPointsChange(Number(e.target.value))}
                placeholder="e.g. 25"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Ngưỡng kích hoạt Cảnh báo (Multiplier)
              </label>
              <select
                className={styles.formInput}
                value={form.multiplier || 1}
                onChange={(e) => handleMultiplierChange(Number(e.target.value))}
              >
                {MULTIPLIER_OPTIONS.map((opt) => {
                  const calculatedPoints = Math.min(100, (form.riskPoints || 0) * opt.value);
                  return (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}x - {opt.label.split(" - ")[1]} ({calculatedPoints} pts)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>


          {/* Conditions - Smartly linked with selectedCategory */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Conditions (Điều kiện đánh giá theo {form.category.toUpperCase()})
            </label>
            <ConditionGroupEditor
              group={form.conditionGroup}
              selectedCategory={form.category}
              onChange={(g) => patch("conditionGroup", g)}
              isRoot
            />
          </div>

          {/* Applies To */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Transaction types</label>
              <input
                className={styles.formInput}
                value={form.appliesTo.transactionTypes.join(", ")}
                onChange={(e) =>
                  patch("appliesTo", {
                    ...form.appliesTo,
                    transactionTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="* for all, or: payment, transfer, withdrawal"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Projects</label>
              <input
                className={styles.formInput}
                value={form.appliesTo.projects.join(", ")}
                onChange={(e) =>
                  patch("appliesTo", {
                    ...form.appliesTo,
                    projects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="* for all, or project IDs"
              />
            </div>
          </div>
        </div>

        <div className={styles.builderFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!form.name.trim()}
          >
            {isEdit ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
