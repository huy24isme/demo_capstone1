import type { RuleTemplate, RuleSetEvaluation } from '../components/fraudguard-dashboard/types';
import { canDeploy, type Enterprise } from '../data/fraudguard-enterprises';
import type { UserProfile } from '../components/fraudguard-dashboard/types';
import { candidateRule } from './rule-lifecycle';
import { evaluateRuleSet, type RuleSetSample } from './rule-set';
export interface SetTest {
  signature: string; testedAt: string; samples: RuleSetSample[];
  results: RuleSetEvaluation[]; labeled: number; mismatched: number; complete: boolean;
}
export interface SetVersion {
  version: number; rules: RuleTemplate[]; publishedAt: string; reviewer: string; reviewNote: string; test: SetTest;
}
export interface ManagedRuleSet {
  id: string; name: string; enterpriseId: string; projectIds: string[];
  legacySets?: LegacyRuleSet[];
  handover?: { version: number; by: string; at: string };
  draft?: { rules: RuleTemplate[]; test?: SetTest };
  versions: SetVersion[]; activeVersion?: number;
}
export type LegacyRuleSet = Omit<ManagedRuleSet, 'enterpriseId' | 'projectIds' | 'legacySets'> & { projectId: string };
export function setSignature(rules: RuleTemplate[]) { return JSON.stringify(rules); }
export function snapshotRules(rules: RuleTemplate[], scope: string | string[]): RuleTemplate[] {
  const projectIds = typeof scope === 'string' ? [scope] : scope;
  return rules.map(source => {
    const candidate = candidateRule(source);
    if (!candidate.appliesTo.projects.includes('*') && !candidate.appliesTo.projects.some(id => projectIds.includes(id))) throw new Error('Rule không thuộc project đã chọn.');
    const { draft, history, ...rule } = structuredClone(candidate);
    return { ...rule, version: source.draft || source.status !== 'Published' ? `${rule.version} [draft]` : rule.version, status: 'Published', enabled: true, appliesTo: { ...rule.appliesTo, projects: candidate.appliesTo.projects.includes('*') ? [...projectIds] : candidate.appliesTo.projects.filter(id => projectIds.includes(id)) } };
  });
}
export function testDraft(set: ManagedRuleSet, samples: RuleSetSample[]): SetTest {
  if (!set.draft?.rules.length || !samples.length || samples.some(s => !set.projectIds.includes(s.projectId))) throw new Error('Cần bản nháp có rule và dữ liệu đúng project.');
  const results = samples.map(sample => evaluateRuleSet(set.draft!.rules, sample));
  const covered = new Set(results.flatMap(r => r.rules.filter(rule => rule.outcome !== 'Error').map(rule => rule.id)));
  return { signature: setSignature(set.draft.rules), testedAt: new Date().toISOString(), samples: structuredClone(samples), results,
    labeled: samples.filter(s => s.expected !== undefined).length,
    mismatched: samples.filter((s, i) => s.expected !== undefined && s.expected !== results[i].result).length,
    complete: results.every(r => r.status === 'Complete') && set.draft.rules.every(r => covered.has(r.id)) };
}
export function canPublishSet(set: ManagedRuleSet) {
  const test = set.draft?.test;
  return !!(set.draft?.rules.length && test && test.signature === setSignature(set.draft.rules) && test.complete && test.mismatched === 0);
}
export function publishSet(set: ManagedRuleSet, reviewer: string, reviewNote: string): ManagedRuleSet {
  if (!canPublishSet(set) || !reviewer.trim() || !reviewNote.trim()) throw new Error('Cần kiểm thử hợp lệ và xác nhận review trước khi phát hành.');
  const version = Math.max(0, ...set.versions.map(v => v.version)) + 1;
  const release: SetVersion = { version, rules: structuredClone(set.draft!.rules), test: structuredClone(set.draft!.test!), reviewer, reviewNote: reviewNote.trim(), publishedAt: new Date().toISOString() };
  return { ...set, draft: undefined, versions: [...set.versions, release] };
}
export function activateSet(sets: ManagedRuleSet[], id: string, version: number): ManagedRuleSet[] {
  const target = sets.find(s => s.id === id);
  if (!target?.versions.some(v => v.version === version)) throw new Error('Chỉ kích hoạt phiên bản đã phát hành.');
  return sets.map(s => s.enterpriseId !== target.enterpriseId ? s : { ...s, activeVersion: s.id === id ? version : undefined });
}
export function activeSetRules(sets: ManagedRuleSet[]): RuleTemplate[] {
  return sets.flatMap(s => s.versions.find(v => v.version === s.activeVersion)?.rules ?? []);
}

export function canChangeEnterpriseSets(previous: ManagedRuleSet[], next: ManagedRuleSet[], user: UserProfile, enterprises: Enterprise[]) {
  if (user.role !== 'Implementation Staff') return false;
  if (new Set(next.map(s => s.enterpriseId)).size !== next.length || new Set(next.map(s => s.id)).size !== next.length) return false;
  for (const set of next) {
    const old = previous.find(s => s.id === set.id);
    if (JSON.stringify(old) === JSON.stringify(set)) continue;
    const enterprise = enterprises.find(e => e.id === set.enterpriseId);
    if (!enterprise || !canDeploy(user, enterprise) || old && old.enterpriseId !== set.enterpriseId) return false;
    if (enterprise.specification && !enterprise.specification.confirmedAt && (set.versions.length > (old?.versions.length ?? 0) || set.activeVersion !== old?.activeVersion || JSON.stringify(set.handover) !== JSON.stringify(old?.handover))) return false;
    if (!set.projectIds.length || set.projectIds.some(p => !enterprise.projectIds.includes(p))) return false;
    if (set.activeVersion && !set.versions.some(v => v.version === set.activeVersion)) return false;
    const snapshots = [...(set.draft?.rules ?? []), ...set.versions.flatMap(v => v.rules)];
    if (snapshots.some(r => !r.appliesTo.projects.length || r.appliesTo.projects.some(p => !enterprise.projectIds.includes(p)))) return false;
  }
  // Removing enterprise sets is not part of the deployment workflow.
  return previous.every(s => next.some(n => n.id === s.id));
}
export function migrateProjectSets(oldSets: LegacyRuleSet[], enterprises: Enterprise[]) {
  const sets: ManagedRuleSet[] = [];
  const unassigned: LegacyRuleSet[] = [];
  for (const old of oldSets) if (!enterprises.some(e => e.projectIds.includes(old.projectId))) unassigned.push(old);
  for (const enterprise of enterprises) {
    const records = oldSets.filter(s => enterprise.projectIds.includes(s.projectId));
    if (!records.length) continue;
    if (records.length === 1) {
      const { projectId, ...old } = records[0];
      sets.push({ ...old, enterpriseId: enterprise.id, projectIds: [...enterprise.projectIds] });
    } else {
      // Preserve every old release for explicit review; never silently combine active definitions.
      sets.push({ id: 'enterprise-' + enterprise.id, name: enterprise.name + ' Rules', enterpriseId: enterprise.id, projectIds: [...enterprise.projectIds], versions: [], draft: { rules: [] }, legacySets: structuredClone(records) });
    }
  }
  return { sets, unassigned };
}
