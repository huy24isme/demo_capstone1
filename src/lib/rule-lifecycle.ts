import type { RuleTemplate } from "../components/fraudguard-dashboard/types";
import { nextSandboxVersion } from "./rule-sandbox";
export function candidateRule(rule: RuleTemplate): RuleTemplate { return rule.draft ?? rule; }
function definition(rule: RuleTemplate) { return JSON.stringify([rule.name, rule.description, rule.category, rule.conditionGroup, rule.appliesTo]); }
export function saveRuleDraft(current: RuleTemplate | undefined, edited: RuleTemplate): RuleTemplate {
  if (current?.status === "Published" && definition(current) === definition(edited)) return { ...current, draft: undefined };
  const { draft, history, ...snapshot } = edited;
  const clean = { ...snapshot, status: "Draft" as const, enabled: false, publishedAt: undefined, version: current?.version ?? "v1.0" };
  return current?.status === "Published" ? { ...current, draft: clean } : { ...clean, history: current?.history };
}
export function publishRuleDraft(rule: RuleTemplate): RuleTemplate {
  if (rule.status === "Published" && !rule.draft) throw new Error("No draft to publish");
  const version = rule.status === "Published" ? nextSandboxVersion(rule.version) : "v1.0";
  if (!version) throw new Error("Invalid version");
  const { draft, history, ...previous } = rule;
  const candidate = candidateRule(rule);
  const { draft: ignoredDraft, history: ignoredHistory, ...snapshot } = candidate;
  const now = new Date().toISOString();
  return { ...snapshot, status: "Published", version, enabled: rule.status === "Published" ? rule.enabled : false,
    publishedAt: now, updatedAt: now, history: [...(history ?? []), ...(rule.status === "Published" ? [previous] : [])] };
}
