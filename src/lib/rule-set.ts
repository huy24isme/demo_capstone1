import type { RuleTemplate, ConditionGroupNode, RuleConditionNode, TransactionRisk, RuleSetEvaluation } from '../components/fraudguard-dashboard/types';
import { evaluateSandboxRule, type SandboxTransaction } from './rule-sandbox';
export interface RuleSetSample extends SandboxTransaction { id: string; ref: string; expected?: 'Normal' | 'Abnormal' | 'Undetermined' }
export function requiredRuleFields(node: ConditionGroupNode | RuleConditionNode): string[] {
  return node.type === 'condition' ? [node.field] : [...new Set(node.children.flatMap(requiredRuleFields))];
}
export function applicableRules(rules: RuleTemplate[], sample: SandboxTransaction) {
  return rules.filter(rule => rule.status === 'Published' && rule.enabled &&
    (rule.appliesTo.projects.includes('*') || rule.appliesTo.projects.includes(sample.projectId)) &&
    (rule.appliesTo.transactionTypes.includes('*') || rule.appliesTo.transactionTypes.includes(sample.transactionType)));
}
export function evaluateRuleSet(rules: RuleTemplate[], sample: SandboxTransaction): RuleSetEvaluation {
  const selected = applicableRules(rules, sample);
  const results = selected.map(rule => {
    const snapshot = { id: rule.id, name: rule.name, version: rule.version, conditionGroup: structuredClone(rule.conditionGroup) };
    const missing = requiredRuleFields(rule.conditionGroup).filter(field => !Object.hasOwn(sample.fields, field));
    try {
      if (missing.length) throw new Error('Missing fields: ' + missing.join(', '));
      const result = evaluateSandboxRule(rule, sample);
      return { ...snapshot, outcome: result.actualAnomaly ? 'Matched' as const : 'NotMatched' as const };
    } catch (error) { return { ...snapshot, outcome: 'Error' as const, error: error instanceof Error ? error.message : String(error) }; }
  });
  const matched = results.filter(r => r.outcome === 'Matched').length;
  const failed = results.filter(r => r.outcome === 'Error').length;
  return { applicable: selected.length, evaluated: selected.length - failed, matched, failed,
    status: !selected.length ? 'NotEvaluated' : failed ? 'Incomplete' : 'Complete',
    result: matched ? 'Abnormal' : !selected.length || failed ? 'Undetermined' : 'Normal',
    evaluatedAt: new Date().toISOString(), fields: { ...sample.fields }, rules: results };
}
export function parseRuleSetSamples(input: string): RuleSetSample[] {
  const data: unknown = JSON.parse(input);
  if (!Array.isArray(data) || !data.length || data.length > 1000) throw new Error('Expected 1–1000 transactions');
  const ids = new Set<string>();
  for (const row of data) {
    if (!row || ['id','ref','projectId','transactionType'].some(key => typeof row[key] !== 'string' || !row[key].trim())) throw new Error('Each transaction needs id, ref, projectId and transactionType');
    if (ids.has(row.id)) throw new Error('Duplicate transaction id: ' + row.id); ids.add(row.id);
    if (!row.fields || Array.isArray(row.fields) || typeof row.fields !== 'object' || Object.values(row.fields).some(value => !['string','number','boolean'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value))) throw new Error('fields must contain text, finite numbers or booleans');
    if (row.expected !== undefined && !['Normal','Abnormal','Undetermined'].includes(row.expected)) throw new Error('Invalid expected result');
  }
  return data;
}
export function detectionTransaction(sample: RuleSetSample, evaluation: RuleSetEvaluation, projectName: string, id: string): TransactionRisk {
  return { id, transactionReference: sample.ref, projectId: sample.projectId, projectName, transactionType: sample.transactionType,
    entityReference: String(sample.fields.user_hash ?? 'sandbox-demo'), amount: typeof sample.fields.amount === 'number' ? sample.fields.amount : undefined,
    currency: typeof sample.fields.currency === 'string' ? sample.fields.currency : undefined,
    riskLevel: evaluation.result, scoringSource: 'RULE', triggeredRules: evaluation.rules.filter(r => r.outcome === 'Matched').map(r => r.name),
    ruleEvaluation: evaluation, alertId: evaluation.matched ? 'ALT-' + id : undefined, processedAt: evaluation.evaluatedAt,
    explanation: 'Sandbox demo: ' + evaluation.matched + '/' + evaluation.evaluated + ' rules matched; ' + evaluation.failed + ' errors.' };
}
