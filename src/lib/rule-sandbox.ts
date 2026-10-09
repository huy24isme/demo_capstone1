import type { ConditionGroupNode, RuleConditionNode, RuleTemplate } from "../components/fraudguard-dashboard/types";

export interface SandboxTransaction {
  projectId: string;
  transactionType: string;
  fields: Record<string, string | number | boolean>;
}

function numeric(value: unknown, field: string): number {
  if (typeof value === "boolean" || value == null || String(value).trim() === "") {
    throw new Error(`Invalid number: ${field}`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid number: ${field}`);
  return number;
}

function list(value: RuleConditionNode["value"]): unknown[] {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected a comma-separated list");
  const values: unknown = value.trim().startsWith("[") ? JSON.parse(value) : value.split(",").map((v) => v.trim());
  if (!Array.isArray(values) || !values.length || values.some((v) => v === "" || v == null || typeof v === "object")) {
    throw new Error("Invalid list");
  }
  return values;
}

function comparable(value: unknown, actual: string | number | boolean, field: string) {
  if (typeof actual === "number") return numeric(value, field);
  if (typeof actual === "boolean") {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new Error(`Invalid boolean: ${field}`);
  }
  if (typeof value !== "string") throw new Error(`Invalid text: ${field}`);
  return value;
}

function matches(node: ConditionGroupNode | RuleConditionNode, fields: SandboxTransaction["fields"]): boolean {
  if (node.type === "group") {
    if (!node.children.length) throw new Error("Empty condition group");
    // Evaluate every child so OR/AND cannot conceal missing sample fields.
    const results = node.children.map((child) => matches(child, fields));
    if (node.logic === "AND") return results.every(Boolean);
    if (node.logic === "OR") return results.some(Boolean);
    throw new Error("Invalid group logic");
  }
  if (!Object.hasOwn(fields, node.field)) throw new Error(`Missing sample field: ${node.field}`);
  const actual = fields[node.field];
  switch (node.operator) {
    case "==": return actual === comparable(node.value, actual, node.field);
    case "!=": return actual !== comparable(node.value, actual, node.field);
    case ">": return numeric(actual, node.field) > numeric(node.value, node.field);
    case ">=": return numeric(actual, node.field) >= numeric(node.value, node.field);
    case "<": return numeric(actual, node.field) < numeric(node.value, node.field);
    case "<=": return numeric(actual, node.field) <= numeric(node.value, node.field);
    case "in":
    case "not_in": {
      const found = list(node.value).map((v) => comparable(v, actual, node.field)).includes(actual);
      return node.operator === "in" ? found : !found;
    }
    case "between": {
      const bounds = list(node.value).map((v) => numeric(v, node.field));
      if (bounds.length !== 2 || bounds[0] > bounds[1]) throw new Error(`Invalid range: ${node.field}`);
      const number = numeric(actual, node.field);
      return number >= bounds[0] && number <= bounds[1];
    }
    default: throw new Error(`Unsupported operator: ${node.operator}`);
  }
}

export function evaluateSandboxRule(rule: RuleTemplate, transaction: SandboxTransaction, riskPoints: number, threshold: number) {
  if (!Number.isFinite(riskPoints) || riskPoints < 0 || !Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
    throw new Error("Invalid risk points or threshold");
  }
  const inScope = (rule.appliesTo.projects.includes("*") || rule.appliesTo.projects.includes(transaction.projectId)) &&
    (rule.appliesTo.transactionTypes.includes("*") || rule.appliesTo.transactionTypes.includes(transaction.transactionType));
  // A sandbox explicitly tests the selected rule, including disabled drafts.
  const triggered = inScope && matches(rule.conditionGroup, transaction.fields);
  const actualScore = triggered ? Math.min(100, riskPoints) : 0;
  return { actualScore, actualAnomaly: actualScore >= threshold, triggered: triggered ? [rule.name] : [] };
}

export function nextSandboxVersion(version: string): string | null {
  const match = /^v?(\d+(?:\.\d+)*)$/.exec(version);
  if (!match) return null;
  const parts = match[1].split(".").map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part)) || !Number.isSafeInteger(parts[parts.length - 1] + 1)) return null;
  parts[parts.length - 1] += 1;
  return `v${parts.join(".")}`;
}
