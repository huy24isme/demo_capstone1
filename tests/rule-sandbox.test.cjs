const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(relative, imports = {}) {
  const filename = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, structuredClone, require: (name) => name in imports ? imports[name] : require(name) }, { filename });
  return exports;
}
const engine = load('src/lib/rule-sandbox.ts');
const { evaluateSandboxRule: evaluate, nextSandboxVersion } = engine;
const lifecycle = load('src/lib/rule-lifecycle.ts', { './rule-sandbox': engine });
const rules = load('src/data/fraudguard-rules.ts').fraudGuardRules;
const condition = (field, operator, value) => ({ type: 'condition', id: field, field, operator, value });
const group = (logic, children) => ({ type: 'group', id: 'group', logic, children });
const rule = (node) => ({ ...rules[0], conditionGroup: group('AND', [node]) });
const tx = (fields, extra = {}) => ({ projectId: 'proj-abc-cod', transactionType: 'payment', fields, ...extra });

test('selected condition tree and nested AND/OR directly determine the result', () => {
  const r = rule(group('OR', [condition('amount', '>', 100), group('AND', [condition('channel', '==', 'COD'), condition('amount', '>=', 50)])]));
  assert.equal(evaluate(r, tx({ amount: 50, channel: 'COD' })).actualAnomaly, true);

  assert.equal(evaluate(r, tx({ amount: 50, channel: 'Online' })).actualAnomaly, false);
});

test('all supported operators preserve number, text and boolean semantics', () => {
  for (const [actual, operator, expected, matched] of [
    [10, '>', 10, false], [10, '>=', 10, true], [10, '<', 10, false], [10, '<=', 10, true],
    [10, '==', '10', true], [10, '!=', 10, false], [false, '==', 'false', true],
    ['VN', 'in', 'VN,SG', true], ['VN', 'not_in', '["SG","US"]', true],
    [10, 'in', '[5,10]', true], [10, 'between', '10,20', true], [20, 'between', '[10,20]', true],
    [21, 'between', '10,20', false],
  ]) assert.equal(evaluate(rule(condition('field', operator, expected)), tx({ field: actual })).actualAnomaly, matched);
});

test('invalid/missing data raises an error even in an OR branch', () => {
  assert.throws(() => evaluate(rule(group('OR', [condition('amount', '>', 1), condition('missing', '!=', 0)])), tx({ amount: 20 })), /Missing sample field/);
  for (const [actual, operator, expected] of [[true, '>', 0], [10, '>', ''], [10, 'between', '20,10'], [10, 'in', ''], [true, '==', 'yes']]) {
    assert.throws(() => evaluate(rule(condition('field', operator, expected)), tx({ field: actual })));
  }
  assert.throws(() => evaluate(rule(group('AND', [])), tx({})), /Empty/);
  assert.throws(() => evaluate(rule(condition('field', 'unknown', 1)), tx({ field: 1 })), /Unsupported/);
});

test('results contain no risk score and a matching rule always returns abnormal', () => {
  const result = evaluate(rule(condition('amount', '>', 0)), tx({ amount: 1 }));
  assert.equal(result.actualAnomaly, true);
  assert.equal('actualScore' in result, false);
  assert.equal(result.triggered.length, 1);
});

test('project/type applicability is enforced; disabled drafts can be tested', () => {
  const r = { ...rules[0], enabled: false, appliesTo: { projects: ['proj-abc-cod'], transactionTypes: ['payment'] } };
  assert.equal(evaluate(r, tx({ amount: 20000000, channel: 'COD' })).actualAnomaly, true);
  assert.equal(evaluate(r, tx({}, { projectId: 'other' })).actualAnomaly, false);
  assert.equal(evaluate(r, tx({}, { transactionType: 'refund' })).actualAnomaly, false);
});

test('versions advance from the selected version and reject unsupported formats', () => {
  assert.equal(nextSandboxVersion('v1.2'), 'v1.3');
  assert.equal(nextSandboxVersion('2.4.9'), 'v2.4.10');
  assert.equal(nextSandboxVersion('v2.0'), 'v2.1');
  assert.equal(nextSandboxVersion('draft'), null);
});

// Exercise the real component handlers without a browser; this is not a DOM/E2E test.
function harness(initialRules = rules, withPublisher = true, extraProps = {}) {
  const states = [], effectDeps = [], toasts = [], published = [];
  let cursor, effects, dirty, tree, props;
  const react = {
    useState(initial) {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], (value) => { const next = typeof value === 'function' ? value(states[slot]) : value; if (!Object.is(next, states[slot])) { states[slot] = next; dirty = true; } }];
    },
    useEffect(effect, deps) {
      const slot = cursor++;
      if (!effectDeps[slot] || deps.some((d, i) => !Object.is(d, effectDeps[slot][i]))) { effectDeps[slot] = deps; effects.push(effect); }
    },
  };
  const translations = load('src/components/fraudguard-dashboard/i18n/translations.ts').translations;
  const component = load('src/components/fraudguard-dashboard/RuleTestingView.tsx', {
    './ReadableConditions': load('src/components/fraudguard-dashboard/ReadableConditions.tsx', { './SecurityDashboard.module.css': { default: {} } }),
    react, './RuleSetTestingView': { RuleSetTestingView: () => null }, '@/lib/rule-sandbox': engine, '@/lib/rule-lifecycle': lifecycle, './SecurityDashboard.module.css': { default: {} },
    'lucide-react': { Play: 'icon', Check: 'icon', Sliders: 'icon' },
    './ToastProvider': { useToast: () => ({ toast: (...args) => toasts.push(args) }) },
    './i18n/LanguageContext': { useLanguage: () => ({ language: 'en', t: translations.en }) },
  }).RuleTestingView;
  props = { rules: initialRules, onPublishRule: withPublisher ? (r) => { published.push(r); props.rules = props.rules.map((old) => old.id === r.id ? r : old); } : undefined };
  function render() {
    for (let i = 0; i < 10; i++) { cursor = 0; effects = []; dirty = false; tree = component(props); effects.forEach((e) => e()); if (!dirty) return; }
    throw Error('Render did not settle');
  }
  function nodes() { const result = []; function walk(n) { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object' && n.props) { result.push(n); walk(n.props.children); } } walk(tree); return result; }
  const action = (name) => nodes().find((n) => n.type === 'button' && n.props.onClick?.name === name);
  const click = (name) => { const button = action(name); assert.ok(button); if (!button.props.disabled) button.props.onClick(); render(); };
  const change = (id, value) => { nodes().find((n) => n.props.id === id).props.onChange({ target: { value } }); render(); };
  Object.assign(props, extraProps);
  render();
  nodes().find(n => n.props.id === 'sandbox-single-mode').props.onClick(); render();
  return { action, click, change, nodes, toasts, published, render };
}

test('sandbox isolates the selected enterprise even when active sets reuse rule IDs', () => {
  const activeRules = ['p1', 'p2'].map(project => ({ ...rules[0], appliesTo: { ...rules[0].appliesTo, projects: [project] } }));
  const ui = harness(rules, true, { activeRules, enterprises: [
    { id: 'e1', name: 'First', projectIds: ['p1'] },
    { id: 'e2', name: 'Second', projectIds: ['p2'] },
  ] });
  ui.nodes().find(n => n.type === 'button' && n.props.children === 'Rule set test').props.onClick(); ui.render();
  let sandbox = ui.nodes().find(n => n.props.enterpriseLabel === 'First');
  assert.equal(sandbox.props.rules.length, 1);
  assert.equal(sandbox.props.rules[0].appliesTo.projects[0], 'p1');
  ui.nodes().find(n => n.type === 'select' && n.props.value === 'e1').props.onChange({ target: { value: 'e2' } }); ui.render();
  sandbox = ui.nodes().find(n => n.props.enterpriseLabel === 'Second');
  assert.equal(sandbox.props.rules.length, 1);
  assert.equal(sandbox.props.rules[0].appliesTo.projects[0], 'p2');
});

test('publish requires a passing current test; changing rules invalidates even if reverted', () => {
  const ui = harness(rules.map(r => lifecycle.saveRuleDraft(r, { ...r, description: r.description + " revised" })));
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
  ui.click('handleRunSandboxTest');
  assert.match(ui.toasts.at(-1)[1], /5\/5/);
  assert.equal(ui.action('handlePublishVersion').props.disabled, false);
  ui.change('sandbox-rule', 'rule-cod-002');
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
  ui.change('sandbox-rule', 'rule-cod-001');
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
  ui.click('handleRunSandboxTest');
  ui.click('handlePublishVersion');
  assert.equal(ui.published[0].version, 'v1.1');
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
});

test('changed conditions fail independent labels and missing fields block publishing', () => {
  const changed = {...rules[0], conditionGroup: group('AND', [condition('amount', '>', 15000000)])};
  const ui = harness([changed, ...rules.slice(1)]);
  ui.click('handleRunSandboxTest');
  assert.match(ui.toasts.at(-1)[1], /4\/5/);
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
  ui.change('sandbox-rule', 'rule-cod-004');
  ui.click('handleRunSandboxTest');
  assert.match(ui.toasts.at(-1)[1], /5\/5/);
  ui.change('sandbox-rule', 'rule-001');
  ui.click('handleRunSandboxTest');
  assert.ok(ui.nodes().some((n) => n.props.role === 'alert' && JSON.stringify(n.props.children).includes('velocity.tx_count.1h')));
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
});

test('no rules or no publish callback cannot report a successful publication', () => {
  assert.equal(harness([]).action('handleRunSandboxTest').props.disabled, true);
  const ui = harness(rules, false);
  ui.click('handleRunSandboxTest');
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
});

test('demo rule and fallback transactions agree with triggered rules and alerts', () => {
  const transactions = load('src/data/fraudguard-transactions.ts').fraudGuardTransactions;
  for (const tx of transactions) {
    assert.equal('riskScore' in tx, false);
    assert.ok(['Normal', 'Abnormal'].includes(tx.riskLevel));
    if (tx.scoringSource !== 'AI') {
      assert.equal(tx.riskLevel === 'Abnormal', tx.triggeredRules.length > 0, tx.id);
      if (tx.riskLevel === 'Abnormal') assert.ok(tx.alertId, tx.id);
    }
  }
  for (const rule of rules) {
    assert.equal('riskPoints' in rule, false);
    assert.equal('threshold' in rule, false);
  }
});

test('CSV exports classification, source and explanation without a score', async () => {
  let blob;
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/export-csv.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Blob,
    URL: {createObjectURL(value) {blob = value; return 'blob:test';}, revokeObjectURL() {}},
    document: {createElement() {return {click() {}};}},
  });
  exports.exportTransactionsCSV([{riskLevel:'Abnormal', transactionReference:'test', projectName:'demo', transactionType:'payment', scoringSource:'RULE', triggeredRules:['rule-a','rule-b'], explanation:'Matched "amount", review required', entityReference:'entity', processedAt:'2026-10-12'}]);
  const csv = await blob.text();
  assert.doesNotMatch(csv.split('\n')[0], /score/i);
  assert.match(csv, /Detection Result.*Detection Source.*Triggered Rules.*Explanation/);
  assert.match(csv, /"Abnormal"/);
  assert.match(csv, /"rule-a; rule-b"/);
  assert.match(csv, /"Matched ""amount"", review required"/);
});

test('draft edits never overwrite the active definition; publication preserves history and activation', () => {
  const live = rules[0];
  const edited = { ...live, name: 'Changed', conditionGroup: group('AND', [condition('amount', '>', 15000000)]) };
  const saved = lifecycle.saveRuleDraft(live, edited);
  assert.equal(saved.name, live.name);
  assert.equal(saved.conditionGroup, live.conditionGroup);
  assert.equal(saved.draft.name, 'Changed');
  const published = lifecycle.publishRuleDraft(saved);
  assert.equal(published.name, 'Changed');
  assert.equal(published.version, 'v1.1');
  assert.equal(published.history[0].name, live.name);
  assert.equal(published.enabled, live.enabled);
  assert.throws(() => lifecycle.publishRuleDraft(published), /No draft/);
});
test('new rule first publication is v1.0 and disabled; forged lifecycle fields are discarded on save', () => {
  const saved = lifecycle.saveRuleDraft(undefined, { ...rules[0], version: 'v99.9', enabled: true });
  assert.equal(saved.status, 'Draft');
  assert.equal(saved.enabled, false);
  assert.equal(saved.version, 'v1.0');
  const published = lifecycle.publishRuleDraft(saved);
  assert.equal(published.version, 'v1.0');
  assert.equal(published.enabled, false);
});
test('unchanged published rule cannot be republished after a passing sandbox run', () => {
  const ui = harness(); ui.click('handleRunSandboxTest');
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
});

const ingestion = load('src/lib/ingestion-validation.ts');
test('CSV and JSON validation reads content and rejects incomplete transactions', () => {
  const row = { timestamp: '2026-10-12T01:00:00Z', amount: 100, currency: 'VND', transaction_type: 'payment', user_hash: 'user,one' };
  assert.equal(ingestion.validateIngestion(JSON.stringify([row]), 'sample.json'), 1);
  assert.equal(ingestion.validateIngestion('timestamp,amount,currency,transaction_type,user_hash\r\n2026-10-12T01:00:00Z,100,VND,payment,"user,one"', 'sample.csv'), 1);
  assert.throws(() => ingestion.validateIngestion(JSON.stringify([{ ...row, amount: -1 }]), 'sample.json'), /Invalid/);
  assert.throws(() => ingestion.validateIngestion(JSON.stringify([{}]), 'sample.json'), /Missing/);
  assert.throws(() => ingestion.validateIngestion('timestamp,amount\n"unfinished', 'sample.csv'), /Unclosed/);
  assert.throws(() => ingestion.validateIngestion('[]', 'sample.xlsx'), /CSV/);
});
test('saving an unchanged published definition does not create a publishable draft', () => {
  assert.equal(lifecycle.saveRuleDraft(rules[0], { ...rules[0] }).draft, undefined);
});

test('custom dataset supports new rules, rejects out-of-scope samples, and edits invalidate publication', () => {
  const draft = lifecycle.saveRuleDraft(undefined, { ...rules[0], id: 'custom-qa', appliesTo: { projects: ['qa'], transactionTypes: ['payment'] }, conditionGroup: group('AND', [condition('amount', '>', 10)]) });
  const ui = harness([draft]);
  const sample = { id: 'one', ref: 'QA-1', projectId: 'qa', transactionType: 'payment', fields: { amount: 11 }, expectedAnomaly: true };
  ui.change('sandbox-dataset', JSON.stringify([sample])); ui.click('handleRunSandboxTest');
  assert.equal(ui.action('handlePublishVersion').props.disabled, false);
  ui.change('sandbox-dataset', JSON.stringify([{ ...sample, projectId: 'wrong' }]));
  assert.equal(ui.action('handlePublishVersion').props.disabled, true);
  ui.click('handleRunSandboxTest');
  assert.ok(ui.nodes().some(n => n.props.role === 'alert' && JSON.stringify(n.props.children).includes('scope')));
});

const cases = load('src/lib/case-workflow.ts');
test('case mutations require the assigned investigator and nonempty authored findings', () => {
  const previous = { id: 'tx', scoringSource: 'AI', caseId: 'case', caseStatus: 'Investigating', assignedInvestigator: 'Owner', riskLevel: 'Abnormal' };
  const owner = { role: 'Investigator', name: 'Owner' };
  const report = { ...previous, caseStatus: 'Reported', investigationReport: { notes: 'Observed evidence', submittedBy: 'Owner' } };
  assert.equal(cases.canUpdateCase(previous, report, owner), true);
  assert.equal(cases.canUpdateCase(previous, report, { ...owner, name: 'Other' }), false);
  assert.equal(cases.canUpdateCase(previous, { ...report, investigationReport: { notes: ' ', submittedBy: 'Owner' } }, owner), false);
  for (const role of ['Viewer', 'Platform Admin']) assert.equal(cases.canUpdateCase(previous, report, { role, name: 'Owner' }), false);
});
test('final case decisions need a reason; closed cases and normal transactions cannot be mutated', () => {
  const previous = { id: 'tx', scoringSource: 'AI', caseId: 'case', caseStatus: 'Open', riskLevel: 'Abnormal' };
  const actor = { role: 'Operator', name: 'Lead' };
  const final = { ...previous, caseStatus: 'Confirmed Fraud', caseDecision: { directive: 'Reviewed evidence' } };
  assert.equal(cases.canUpdateCase(previous, final, actor), true);
  assert.equal(cases.canUpdateCase(previous, { ...final, caseDecision: { directive: '' } }, actor), false);
  assert.equal(cases.canUpdateCase(final, { ...final, caseStatus: 'Assigned', assignedInvestigator: 'Owner' }, actor), false);
  assert.equal(cases.canUpdateCase({ id: 'tx', riskLevel: 'Normal' }, previous, actor), false);
});

const ruleSet = load('src/lib/rule-set.ts', { './rule-sandbox': engine });
const active = (id, node, extra = {}) => ({ ...rules[0], id, name: id, status: 'Published', enabled: true, conditionGroup: group('AND', [node]), appliesTo: { projects: ['p1'], transactionTypes: ['payment'] }, ...extra });
const inputTx = { projectId: 'p1', transactionType: 'payment', fields: { amount: 12 } };
test('rule set checks all 10 applicable rules and one match is abnormal', () => {
  const ten = Array.from({ length: 10 }, (_, index) => active('r' + index, condition('amount', '>', index === 0 ? 10 : 100)));
  const result = ruleSet.evaluateRuleSet(ten, inputTx);
  assert.equal(result.applicable, 10); assert.equal(result.evaluated, 10); assert.equal(result.matched, 1);
  assert.equal(result.result, 'Abnormal'); assert.equal(result.status, 'Complete');
});
test('only live enabled scope-matching rules run, never drafts or other project rules', () => {
  const base = active('live', condition('amount', '>', 100));
  const result = ruleSet.evaluateRuleSet([base, { ...base, id: 'disabled', enabled: false }, { ...base, id: 'draft', status: 'Draft' }, { ...base, id: 'other', appliesTo: { projects: ['other'], transactionTypes: ['payment'] } }, { ...base, id: 'refund', appliesTo: { projects: ['p1'], transactionTypes: ['refund'] } }], inputTx);
  assert.equal(result.applicable, 1); assert.equal(result.result, 'Normal');
});
test('missing fields do not abort other rules or become normal', () => {
  const missing = active('missing', condition('history.count', '>', 3));
  const match = active('match', condition('amount', '>', 10));
  const result = ruleSet.evaluateRuleSet([missing, match], inputTx);
  assert.equal(result.result, 'Abnormal'); assert.equal(result.status, 'Incomplete'); assert.equal(result.failed, 1); assert.equal(result.matched, 1);
  assert.equal(ruleSet.evaluateRuleSet([missing], inputTx).result, 'Undetermined');
  assert.equal(ruleSet.evaluateRuleSet([], inputTx).status, 'NotEvaluated');
  assert.equal(ruleSet.evaluateRuleSet([], inputTx).result, 'Undetermined');
});
test('evaluation snapshots survive edits and only abnormal results create alerts, not cases', () => {
  const live = active('r1', condition('amount', '>', 10));
  const evaluation = ruleSet.evaluateRuleSet([live], inputTx);
  live.conditionGroup.children[0].value = 500;
  assert.equal(evaluation.rules[0].conditionGroup.children[0].value, 10);
  const sample = { ...inputTx, id: 'sample', ref: 'TX1' };
  const row = ruleSet.detectionTransaction(sample, evaluation, 'Project', 'demo1');
  assert.ok(row.alertId); assert.equal(row.caseId, undefined); assert.equal(row.caseStatus, undefined);
  const unknown = ruleSet.detectionTransaction(sample, ruleSet.evaluateRuleSet([], inputTx), 'Project', 'demo2');
  assert.equal(unknown.alertId, undefined); assert.equal(unknown.riskLevel, 'Undetermined');
});
test('dataset parser accepts unlabeled samples but rejects duplicate IDs and invalid field values', () => {
  const sample = { ...inputTx, id: 's1', ref: 'TX1' };
  assert.equal(ruleSet.parseRuleSetSamples(JSON.stringify([sample])).length, 1);
  assert.throws(() => ruleSet.parseRuleSetSamples(JSON.stringify([sample, sample])), /Duplicate/);
  assert.throws(() => ruleSet.parseRuleSetSamples(JSON.stringify([{ ...sample, fields: { amount: null } }])), /fields/);
});

const enterpriseData = load('src/data/fraudguard-enterprises.ts');
test('SME transaction scope excludes foreign projects and fails closed without an enterprise', () => {
 const data = load('src/data/fraudguard-transactions.ts').fraudGuardTransactions;
 for (const role of ['SME Admin', 'Operator', 'Investigator', 'Viewer']) {
   const abc = enterpriseData.transactionsForEnterprise(data, { role, enterpriseId: 'tenant-abc' }, enterpriseData.demoEnterprises);
   assert.ok(abc.length > 0);
   assert.ok(abc.every(tx => tx.projectId === 'proj-abc-cod'));
   const techpay = enterpriseData.transactionsForEnterprise(data, { role, enterpriseId: 'tenant-techpay' }, enterpriseData.demoEnterprises);
   assert.ok(techpay.length > 0);
   assert.ok(techpay.every(tx => ['proj-wallet', 'proj-checkout'].includes(tx.projectId)));
   assert.ok(!techpay.some(tx => abc.some(item => item.id === tx.id)));
 }
 assert.equal(enterpriseData.transactionsForEnterprise(data, { role: 'SME Admin' }, enterpriseData.demoEnterprises).length, 0);
 assert.equal(enterpriseData.transactionsForEnterprise(data, { role: 'SME Admin', enterpriseId: 'unknown' }, enterpriseData.demoEnterprises).length, 0);
});
const roleData = load('src/data/fraudguard-roles.ts');
const managed = load('src/lib/rule-set-lifecycle.ts', { '../data/fraudguard-enterprises': enterpriseData, './rule-lifecycle': lifecycle, './rule-set': ruleSet });
function draftSet(id = 'set1') { return { id, name: id, enterpriseId: 'e1', projectIds: ['p1'], versions: [], draft: { rules: managed.snapshotRules([active('r1', condition('amount', '>', 10))], 'p1') } }; }
const labeledSample = { ...inputTx, id: 's1', ref: 'TX-1', expected: 'Abnormal' };
test('set publication requires complete current tests and reviewer evidence', () => {
 const set = draftSet(); assert.equal(managed.canPublishSet(set), false);
 assert.throws(() => managed.publishSet(set, 'Admin', 'reviewed'));
 set.draft.test = managed.testDraft(set, [labeledSample]);
 assert.equal(managed.canPublishSet(set), true);
 assert.throws(() => managed.publishSet(set, 'Admin', ' '));
 const released = managed.publishSet(set, 'Admin', 'Reviewed specification');
 assert.equal(released.versions[0].version, 1); assert.equal(released.activeVersion, undefined); assert.equal(released.draft, undefined);
 set.draft.rules[0].conditionGroup.children[0].value = 100;
 assert.equal(managed.canPublishSet(set), false);
 assert.equal(released.versions[0].rules[0].conditionGroup.children[0].value, 10);
});
test('missing data, mismatches and unexercised members block set publication', () => {
 const set = draftSet();
 for (const sample of [{ ...labeledSample, expected: 'Normal' }, { ...labeledSample, fields: {} }]) {
  set.draft.test = managed.testDraft(set, [sample]); assert.equal(managed.canPublishSet(set), false);
 }
 set.draft.rules.push({ ...set.draft.rules[0], id: 'refund-only', appliesTo: { projects: ['p1'], transactionTypes: ['refund'] } });
 set.draft.test = managed.testDraft(set, [labeledSample]); assert.equal(managed.canPublishSet(set), false);
 assert.throws(() => managed.testDraft(set, [{ ...labeledSample, projectId: 'other' }]));
});
test('activation is exclusive per project and draft edits never alter runtime release', () => {
 function publish(id) { const s = draftSet(id); s.draft.test = managed.testDraft(s, [labeledSample]); return managed.publishSet(s, 'Admin', 'Confirmed'); }
 let sets = managed.activateSet([publish('one'), publish('two')], 'one', 1);
 assert.equal(managed.activeSetRules(sets).length, 1);
 sets[0].draft = { rules: structuredClone(sets[0].versions[0].rules) };
 sets[0].draft.rules[0].conditionGroup.children[0].value = 500;
 assert.equal(managed.activeSetRules(sets)[0].conditionGroup.children[0].value, 10);
 sets = managed.activateSet(sets, 'two', 1);
 assert.equal(sets[0].activeVersion, undefined); assert.equal(sets[1].activeVersion, 1);
 assert.throws(() => managed.activateSet(sets, 'two', 2));
});
test('unlabeled tests retain their unlabeled evidence and snapshots are independent of library drafts', () => {
 const source = active('r1', condition('amount', '>', 10)); source.draft = { ...source, conditionGroup: group('AND', [condition('amount', '>', 20)]) };
 const snapshots = managed.snapshotRules([source], 'p1'); source.draft.conditionGroup.children[0].value = 999;
 assert.equal(snapshots[0].conditionGroup.children[0].value, 20);
 const s = draftSet(); s.draft.test = managed.testDraft(s, [{ ...labeledSample, expected: undefined }]);
 assert.equal(s.draft.test.labeled, 0); assert.equal(managed.canPublishSet(s), true);
 const release = managed.publishSet(s, 'Reviewer', 'Manually checked against specification');
 assert.equal(release.versions[0].test.labeled, 0);
});

test('rule set UI creates, tests, reviews, publishes and activates a version', () => {
 const states = []; let cursor, tree;
 const react = { useState(initial) { const slot = cursor++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; } };
 const Tester = () => null;
 const component = load('src/components/fraudguard-dashboard/RuleSetsView.tsx', {
  './ReadableConditions': load('src/components/fraudguard-dashboard/ReadableConditions.tsx', { './SecurityDashboard.module.css': { default: {} } }),
  react, './EnterpriseRulesView': { EnterpriseRulesView: () => null }, '@/data/fraudguard-enterprises': enterpriseData, '@/data/fraudguard-roles': roleData, '@/lib/rule-set': ruleSet, '@/lib/rule-set-lifecycle': managed, './RuleSetTestingView': { RuleSetTestingView: Tester }, '@/lib/rule-lifecycle': lifecycle,
  './i18n/LanguageContext': { useLanguage: () => ({ language: 'vi' }) }, './SecurityDashboard.module.css': { default: {} }
 }).RuleSetsView;
 const s = draftSet();
 const props = { sets: [s], rules: s.draft.rules, projects: [{ id: 'p1', name: 'Wallet' }], enterprises: [{ id: 'e1', name: 'Enterprise', projectIds: ['p1'], deploymentStaffId: 'staff' }], currentUser: { id: 'staff', role: 'Implementation Staff' }, onAssign() {}, reviewer: 'Admin', onOpenLibrary() {}, onChange(next) { props.sets = next; } };
 function render() { cursor = 0; tree = component(props); }
 function nodes() { const out = []; function walk(n) { if (Array.isArray(n)) n.forEach(walk); else if (n?.props) { out.push(n); walk(n.props.children); } } walk(tree); return out; }
 function button(text) { return nodes().find(n => n.type === 'button' && (Array.isArray(n.props.children) ? n.props.children.filter(child => typeof child === 'string').join('') : n.props.children) === text); }
 function click(text) { const b = button(text); assert.ok(b, text); assert.ok(!b.props.disabled, text); b.props.onClick(); render(); }
 render(); click('Xem chi tiết');
 assert.equal(button('Phát hành phiên bản tập rule').props.disabled, true);
 nodes().find(n => n.type === Tester).props.onTestCompleted([labeledSample]); render();
 assert.equal(button('Phát hành phiên bản tập rule').props.disabled, true);
 nodes().find(n => n.type === 'textarea').props.onChange({ target: { value: 'Verified the business specification.' } }); render();
 nodes().filter(n => n.type === 'input' && n.props.type === 'checkbox').at(-1).props.onChange({ target: { checked: true } }); render();
 click('Phát hành phiên bản tập rule');
 assert.equal(props.sets[0].versions.length, 1); assert.equal(props.sets[0].activeVersion, undefined);
 click('Kích hoạt cho doanh nghiệp'); assert.equal(props.sets[0].activeVersion, 1);
 click('Tạo phiên bản nháp mới');
 assert.equal(props.sets[0].activeVersion, 1); assert.equal(button('Phát hành phiên bản tập rule').props.disabled, true);
});

test('enterprise roles separate platform administration from assigned deployment', () => {
 const admin = { id: 'admin', role: 'Platform Admin' }, staff = { id: 'staff', role: 'Implementation Staff' };
 const enterprises = [{ id: 'e1', name: 'One', projectIds: ['p1','p2'], deploymentStaffId: 'staff' }, { id: 'e2', name: 'Two', projectIds: ['p3'], deploymentStaffId: 'other' }];
 assert.equal(roleData.getRolePermissions('Platform Admin').canManageRules, false);
 assert.equal(roleData.getRolePermissions('Platform Admin').canAccessRuleTesting, false);
 assert.equal(roleData.getRolePermissions('Implementation Staff').canManageRules, true);
 assert.equal(roleData.getRolePermissions('Implementation Staff').canManageCases, false);
 assert.equal(enterpriseData.visibleEnterprises(admin, enterprises).length, 2);
 assert.equal(enterpriseData.visibleEnterprises(staff, enterprises).length, 1);
 const one = draftSet();
 assert.equal(managed.canChangeEnterpriseSets([], [one], staff, enterprises), true);
 assert.equal(managed.canChangeEnterpriseSets([], [one], admin, enterprises), false);
 assert.equal(managed.canChangeEnterpriseSets([], [one, {...one, id:'second'}], staff, enterprises), false);
 assert.equal(managed.canChangeEnterpriseSets([], [{...one, enterpriseId:'e2'}], staff, enterprises), false);
 assert.equal(managed.canChangeEnterpriseSets([], [{...one, projectIds:['p3']}], staff, enterprises), false);
 assert.equal(managed.canChangeEnterpriseSets([one], [], staff, enterprises), false);
});
test('one enterprise set accepts multiple owned projects but rejects foreign samples', () => {
 const source = {...active('shared', condition('amount','>',10)), appliesTo:{projects:['*'],transactionTypes:['*']}};
 const snapshots = managed.snapshotRules([source], ['p1','p2']);
 const set = {...draftSet(),projectIds:['p1','p2'],draft:{rules:snapshots}};
 assert.equal(managed.testDraft(set,[labeledSample,{...labeledSample,id:'two',projectId:'p2'}]).complete,true);
 assert.throws(()=>managed.testDraft(set,[{...labeledSample,projectId:'foreign'}]));
 assert.equal(snapshots[0].appliesTo.projects.includes('*'),false);
 assert.equal(snapshots[0].appliesTo.projects.length,2);
});
test('legacy migration preserves single releases, archives ambiguous project sets and retains unknown projects', () => {
 const enterprise = {id:'e1',name:'One',projectIds:['p1','p2'],deploymentStaffId:'staff'};
 const original = {...draftSet(),projectId:'p1'};delete original.enterpriseId;delete original.projectIds;
 const one=managed.migrateProjectSets([original],[enterprise]);
 assert.equal(one.sets[0].enterpriseId,'e1');assert.equal(one.sets[0].draft.rules.length,1);
 const multiple=managed.migrateProjectSets([original,{...original,id:'old-two',projectId:'p2'},{...original,id:'unknown',projectId:'unknown'}],[enterprise]);
 assert.equal(multiple.sets.length,1);assert.equal(multiple.sets[0].legacySets.length,2);
 assert.equal(multiple.sets[0].activeVersion,undefined);assert.equal(multiple.unassigned.length,1);
 assert.equal(original.projectId,'p1');
});

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const readable = load('src/components/fraudguard-dashboard/ReadableConditions.tsx', { './SecurityDashboard.module.css': { default: {} } });
test('duplicate rule IDs cannot be snapshotted, tested or published as a set',()=>{
 const duplicateRules=[rules[0],structuredClone(rules[0])];
 assert.throws(()=>managed.snapshotRules(duplicateRules,['proj-abc-cod']),/Trùng mã/);
 const set={id:'duplicate-set',enterpriseId:'tenant',projectIds:['proj-abc-cod'],name:'Duplicate',versions:[],draft:{rules:duplicateRules}};
 assert.throws(()=>managed.testDraft(set,[{id:'sample',ref:'sample',...tx({amount:1,channel:'COD'})}]),/trùng mã/);
 set.draft.test={signature:managed.setSignature(duplicateRules),complete:true,mismatched:0};
 assert.equal(managed.canPublishSet(set),false);
});
const businessView = load('src/components/fraudguard-dashboard/EnterpriseRulesView.tsx', {
 './ReadableConditions': readable,
 './i18n/LanguageContext': { useLanguage: () => ({ language: 'vi' }) },
 './SecurityDashboard.module.css': { default: {} }
}).EnterpriseRulesView;
const business = { id: 'e1', name: 'Enterprise', projectIds: ['p1'], deploymentStaffId: 'staff' };
function businessHtml(set) { return renderToStaticMarkup(React.createElement(businessView, { set, enterprise: business, projects: [{ id: 'p1', name: 'Wallet' }] })); }
function handedOverSet() {
 const draft = draftSet(); draft.draft.test = managed.testDraft(draft, [labeledSample]);
 const published = managed.publishSet(draft, 'Reviewer', 'INTERNAL_REVIEW_ONLY');
 return { ...published, activeVersion: 1, handover: { version: 1, by: 'Reviewer', at: '2026-10-15T00:00:00Z' } };
}
test('SME pending view explains handover without a dead details button or draft exposure', () => {
 const set = draftSet(); set.draft.rules[0].name = 'SECRET_DRAFT';
 const html = businessHtml(set);
 assert.match(html, /Đội triển khai đang chuẩn bị/);
 assert.doesNotMatch(html, /SECRET_DRAFT|Xem chi tiết|disabled|conditionGroup/);
});
test('SME sees readable handed-over conditions, never draft definitions or review evidence', () => {
 const set = handedOverSet(); set.draft = { rules: [{ ...set.versions[0].rules[0], name: 'SECRET_DRAFT' }] };
 const html = businessHtml(set);
 assert.match(html, /Xem chi tiết/); assert.match(html, /Số tiền giao dịch/); assert.match(html, /lớn hơn/); assert.match(html, /Đang áp dụng/);
 assert.doesNotMatch(html, /SECRET_DRAFT|INTERNAL_REVIEW_ONLY|conditionGroup|<pre/);
});
test('activation keeps last handover visible but marks it as no longer active until new handover', () => {
 const set = handedOverSet(); set.versions.push({ ...structuredClone(set.versions[0]), version: 2, rules: [{ ...set.versions[0].rules[0], name: 'UNDELIVERED_VERSION' }] });
 const next = managed.activateSet([set], set.id, 2)[0];
 assert.equal(next.handover.version, 1);
 const html = businessHtml(next);
 assert.match(html, /Đang cập nhật/); assert.match(html, /không phải phiên bản đang được kích hoạt/);
 assert.doesNotMatch(html, /UNDELIVERED_VERSION/);
});
test('readable conditions preserve nested AND/OR and strict versus inclusive comparisons', () => {
 const node = group('OR', [condition('amount', '>', 10), group('AND', [condition('amount', '>=', 20), condition('device.is_new', '==', false)])]);
 const html = renderToStaticMarkup(React.createElement(readable.ReadableConditions, { node, vi: true }));
 assert.match(html, /ít nhất một/); assert.match(html, /tất cả điều kiện/);
 assert.match(html, /lớn hơn/); assert.match(html, /từ/); assert.match(html, /Không/);
});


test('initial and switched demo accounts land on their role homepage', () => {
  const { DEFAULT_DEMO_USER, DEMO_USERS, getRoleHomeView } = load('src/data/fraudguard-roles.ts');
  assert.equal(DEFAULT_DEMO_USER.id, 'usr-deployment');
  assert.equal(getRoleHomeView(DEFAULT_DEMO_USER.role), 'rule-sets');
  const expected = {
    'Platform Admin': 'platform-health',
    'Implementation Staff': 'rule-sets',
    'Operator': 'active-cases',
    'Investigator': 'active-cases',
    'SME Admin': 'risk-overview',
    'Viewer': 'risk-overview',
  };
  for (const user of DEMO_USERS) assert.equal(getRoleHomeView(user.role), expected[user.role]);
});

 test('rule and fallback alerts cannot enter investigation', () => {
 for (const scoringSource of ['RULE','RULE_FALLBACK']) {
 const tx = { id: 'tx', scoringSource, riskLevel: 'Abnormal' };
 for (const role of ['Operator','SME Admin','Investigator']) assert.equal(cases.canUpdateCase(tx, {...tx, caseId:'case', caseStatus:'Open'}, {role,name:'Owner'}),false);
 }
 });
 test('operator can investigate an AI alert and submit their own findings', () => {
 const tx = { id:'tx', scoringSource:'AI', riskLevel:'Abnormal' };
 const actor={role:'Operator',name:'Owner'};
 const started={...tx,caseId:'case',caseStatus:'Investigating',assignedInvestigator:'Owner'};
 assert.equal(cases.canUpdateCase(tx,started,actor),true);
 assert.equal(cases.canUpdateCase(started,{...started,investigationNotes:[]},actor),true);
 assert.equal(cases.canUpdateCase(started,{...started,caseStatus:'Reported',investigationReport:{notes:'Evidence',submittedBy:'Owner'}},actor),true);
 assert.equal(cases.canUpdateCase(started,{...started,caseStatus:'Reported',investigationReport:{notes:' ',submittedBy:'Owner'}},actor),false);
 assert.equal(cases.canUpdateCase(started,{...started,caseStatus:'Reported',investigationReport:{notes:'Evidence',submittedBy:'Other'}},{...actor,name:'Other'}),false);
 });

function caseDrawerHarness(source, role = 'Operator') {
 const states=[]; let cursor=0, tree;
 const translations=load('src/components/fraudguard-dashboard/i18n/translations.ts').translations;
 const props={open:true,currentRole:role,currentUserName:'Owner',onClose:()=>{},transaction:{id:'tx',transactionReference:'TX',scoringSource:source,riskLevel:'Abnormal',triggeredRules:[],processedAt:new Date().toISOString(),caseId:'case',caseStatus:'Open'},onUpdateTransaction(next){assert.equal(cases.canUpdateCase(props.transaction,next,{role,name:'Owner'}),true);props.transaction=next;}};
 const component=load('src/components/fraudguard-dashboard/AlertCaseDrawer.tsx',{
 react:{useState(initial){const slot=cursor++;if(!(slot in states))states[slot]=initial;return [states[slot],v=>states[slot]=v];},useEffect(){}},
 './ReadableConditions':readable, './useDialogFocus':{useDialogFocus:()=>null}, './RuleEvaluationDetails':{RuleEvaluationDetails:()=>null}, './RiskLevelBadge':{RiskLevelBadge:()=>null}, './ScoringSourceBadge':{ScoringSourceBadge:()=>null}, './ToastProvider':{useToast:()=>({toast(){}})}, './i18n/LanguageContext':{useLanguage:()=>({language:'en',t:translations.en})}, './SecurityDashboard.module.css':{default:{}}
 }).AlertCaseDrawer;
 function render(){cursor=0;tree=component(props);}
 function nodes(){const result=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n?.props){result.push(n);walk(n.props.children);}}walk(tree);return result;}
 function click(name){const b=nodes().find(n=>n.type==='button'&&n.props.onClick?.name===name);assert.ok(b,name);assert.ok(!b.props.disabled);b.props.onClick();render();}
 render();return {props,nodes,click,render};
}
test('rule and fallback detail UI hides case creation, assignment and self-investigation',()=>{
 for(const source of ['RULE','RULE_FALLBACK']){
 const ui=caseDrawerHarness(source);
 const actions=ui.nodes().filter(n=>n.type==='button').map(n=>n.props.onClick?.name);
 for(const action of ['handleCreateCase','handleAssignInvestigator','handleSelfInvestigate','handleSubmitInvestigationReport'])assert.ok(!actions.includes(action),action);
 }
});
test('operator detail UI supports self-investigation, notes and report submission end to end',()=>{
 const ui=caseDrawerHarness('AI');ui.click('handleSelfInvestigate');
 assert.equal(ui.props.transaction.assignedInvestigator,'Owner');
 const inputs=ui.nodes().filter(n=>n.type==='textarea'||n.type==='input'&&!n.props.type);
 assert.ok(inputs.length>=2);
 for(const input of inputs) input.props.onChange({target:{value:'Evidence reviewed'}});
 ui.render();ui.click('handleAddInvestigatorNote');
 assert.ok(ui.props.transaction.investigationNotes.some(n=>n.text==='Evidence reviewed'));
 ui.click('handleSubmitInvestigationReport');
 assert.equal(ui.props.transaction.caseStatus,'Reported');
 assert.equal(ui.props.transaction.investigationReport.submittedBy,'Owner');
});

test('demo membership enforces enterprise boundary, role restrictions and unique identity',()=>{
 const {canSaveMember,DEMO_USERS}=load('src/data/fraudguard-roles.ts');
 assert.equal(new Set(DEMO_USERS.map(u=>u.role)).size,5);
 assert.ok(!DEMO_USERS.some(u=>['Viewer','Operation','Deployment Staff'].includes(u.role)));
 const admin=DEMO_USERS.find(u=>u.id==='usr-sme-admin');
 const member={...admin,id:'new',name:'New person',email:'new@example.com',role:'Operator'};
 assert.equal(canSaveMember(admin,member,DEMO_USERS),true);
 assert.equal(canSaveMember({...admin,role:'Operator'},member,DEMO_USERS),false);
 assert.equal(canSaveMember(admin,{...member,enterpriseId:'tenant-techpay'},DEMO_USERS),false);
 assert.equal(canSaveMember(admin,{...member,role:'Platform Admin'},DEMO_USERS),false);
 assert.equal(canSaveMember(admin,{...member,id:admin.id},DEMO_USERS),false);
 assert.equal(canSaveMember(admin,{...member,email:admin.email},DEMO_USERS),false);
 assert.equal(canSaveMember(admin,{...member,email:'bad'},DEMO_USERS),false);
});

test('unconfirmed onboarding permits drafts but blocks publishing, activation and handover',()=>{
 const owner={id:'e1',name:'Business',projectIds:['p1'],deploymentStaffId:'staff',specification:{requirements:'',fields:'',conditions:'',sampleJson:'',updatedAt:'now'}};
 const actor={id:'staff',role:'Implementation Staff'};const draft=draftSet();
 assert.equal(managed.canChangeEnterpriseSets([], [draft], actor, [owner]),true);
 const published={...draft,versions:[{version:1,rules:draft.draft.rules}]};
 assert.equal(managed.canChangeEnterpriseSets([draft],[published],actor,[owner]),false);
 assert.equal(managed.canChangeEnterpriseSets([published],[{...published,activeVersion:1}],actor,[owner]),false);
 assert.equal(managed.canChangeEnterpriseSets([published],[{...published,handover:{version:1,by:'staff',at:'now'}}],actor,[owner]),false);
 assert.equal(managed.canChangeEnterpriseSets([draft],[published],actor,[{...owner,specification:{...owner.specification,confirmedAt:'now'}}]),true);
 assert.equal(managed.canChangeEnterpriseSets([], [draft], {id:'other',role:'Implementation Staff'}, [owner]),false);
});

const importPipeline = load('src/lib/transaction-import.ts', { './rule-set': ruleSet, './ingestion-validation': load('src/lib/ingestion-validation.ts') });
test('file ingestion previews normal and rule alerts without creating investigation cases',()=>{
 const rules=[active('import-rule',condition('amount','>',10))];
 const rows=importPipeline.previewTransactionImport('transaction_reference,transaction_type,amount,user_hash\nA,payment,20,00123\nB,payment,5,00456','samples.csv','p1','Wallet',rules,[]);
 assert.equal(rows[0].transaction.riskLevel,'Abnormal');assert.ok(rows[0].transaction.alertId);assert.equal(rows[0].transaction.caseId,undefined);
 assert.equal(rows[0].transaction.entityReference,'00123');assert.equal(rows[1].transaction.riskLevel,'Normal');assert.equal(rows[1].transaction.alertId,undefined);
 assert.equal(rows[0].transaction.scoringSource,'RULE');
});
test('ingestion blocks cross-scope data, missing rule fields, duplicate references and unsupported files',()=>{
 const rules=[active('import-rule',condition('amount','>',10))];
 const row={ref:'A',projectId:'p1',transactionType:'payment',fields:{amount:20}};
 const preview=(data,existing=[])=>importPipeline.previewTransactionImport(JSON.stringify(data),'samples.json','p1','Wallet',rules,existing);
 assert.ok(preview([{...row,projectId:'other'}])[0].error);
 assert.ok(preview([{...row,fields:{}}])[0].error);
 assert.ok(preview([row,row])[1].error);
 const first=preview([row])[0].transaction;
 assert.ok(preview([row],[first])[0].error);
 assert.ok(preview([{...row,transactionType:'unsupported'}])[0].error);
 assert.throws(()=>importPipeline.previewTransactionImport('','data.xlsx','p1','Wallet',rules,[]));
});

test('import dialog requires preview and saves only after explicit confirmation',async()=>{
 const states=[];let cursor=0,tree,saves=0;
 const component=load('src/components/fraudguard-dashboard/DataIngestionModal.tsx',{
 react:{useState(initial){const slot=cursor++;if(!(slot in states))states[slot]=initial;return [states[slot],v=>states[slot]=v];}},
 './useDialogFocus':{useDialogFocus:()=>null},'./i18n/LanguageContext':{useLanguage:()=>({language:'vi'})},'./SecurityDashboard.module.css':{default:{}}
 }).DataIngestionModal;
 const rules=[active('import-rule',condition('amount','>',10))];
 const preview=(text,name,project)=>importPipeline.previewTransactionImport(text,name,project,'Wallet',rules,[]);
 const props={open:true,onClose(){},projects:[{id:'p1',name:'Wallet'}],actions:{preview,save(text,name,project){saves++;const rows=preview(text,name,project);assert.ok(rows.every(r=>!r.error));return rows.length;}}};
 const render=()=>{cursor=0;tree=component(props);};
 const nodes=()=>{const result=[];function walk(n){if(Array.isArray(n))n.forEach(walk);else if(n?.props){result.push(n);walk(n.props.children);}}walk(tree);return result;};
 const button=text=>nodes().find(n=>n.type==='button'&&n.props.children===text);
 render();assert.ok(button('Kiểm tra và xem trước').props.disabled);assert.equal(button('Lưu vào danh sách giao dịch'),undefined);
 const input=nodes().find(n=>n.type==='input'&&n.props.type==='file');
 await input.props.onChange({currentTarget:{files:[{size:100,name:'test.csv',text:async()=>'transaction_reference,transaction_type,amount\nA,payment,20'}],value:'file'}});
 render();assert.equal(saves,0);button('Kiểm tra và xem trước').props.onClick();render();assert.equal(saves,0);
 assert.ok(!button('Lưu vào danh sách giao dịch').props.disabled);button('Lưu vào danh sách giao dịch').props.onClick();render();assert.equal(saves,1);assert.ok(button('Lưu vào danh sách giao dịch').props.disabled);
});
test('file import preserves text identifiers and rejects object metadata',()=>{
 const rules=[active('import-rule',condition('amount','>',10))];
 const result=importPipeline.previewTransactionImport('transaction_reference,transaction_type,amount,user_hash\nA,payment,20,true','test.csv','p1','Wallet',rules,[]);
 assert.equal(result[0].transaction.entityReference,'true');
 const invalid=importPipeline.previewTransactionImport(JSON.stringify([{ref:{bad:true},transactionType:'payment',fields:{amount:20}}]),'test.json','p1','Wallet',rules,[]);
 assert.ok(invalid[0].error);
});

test('enterprise usage separates AI, rules and fallback and respects enterprise scope',()=>{
 const owner={id:'new',name:'New',projectIds:['p1'],deploymentStaffId:'staff'};
 const transactions=[{projectId:'p1',scoringSource:'AI'},{projectId:'p1',scoringSource:'RULE'},{projectId:'p1',scoringSource:'RULE_FALLBACK'},{projectId:'p2',scoringSource:'AI'}];
 const result=enterpriseData.enterpriseUsage(owner,transactions);
 assert.equal(result.total,3);assert.equal(result.ai,1);assert.equal(result.rule,1);assert.equal(result.fallback,1);
 assert.equal(enterpriseData.enterprisePlan(owner),undefined);
 assert.equal(enterpriseData.enterprisePlan({...owner,id:'tenant-greenmart'}),'Free');
 assert.equal(enterpriseData.enterprisePlan({...owner,id:'tenant-greenmart',plan:'Subscription'}),'Subscription');
});
test('platform view uses shared enterprises and shows no Free allowance',()=>{
 const component=load('src/components/fraudguard-dashboard/PlatformHealthView.tsx',{
 '@/data/fraudguard-enterprises':enterpriseData,
 '../../data/fraudguard-platform':load('src/data/fraudguard-platform.ts'),
 './useDialogFocus':{useDialogFocus:()=>null},'./ToastProvider':{useToast:()=>({toast(){}})},
 './i18n/LanguageContext':{useLanguage:()=>({language:'vi',t:load('src/components/fraudguard-dashboard/i18n/translations.ts').translations.vi})},
 './SecurityDashboard.module.css':{default:{}}
 }).PlatformHealthView;
 const html=renderToStaticMarkup(React.createElement(component,{enterprises:[{id:'new-company',name:'Shared Company',plan:'Free',projectIds:['p1'],deploymentStaffId:'staff'}],transactions:[],onPlanChange(){}}));
 assert.match(html,/Shared Company/);assert.match(html,/Không áp dụng/);assert.doesNotMatch(html,/TechPay|12[.,]850|20[.,]000/);
});

test('only platform staff can provision the first enterprise administrator with a unique email',()=>{
 const admin={role:'Platform Admin'}, existing=[{email:'owner@example.com'}];
 assert.ok(roleData.canProvisionEnterpriseAdmin(admin,'Owner','new@example.com',existing));
 assert.equal(roleData.canProvisionEnterpriseAdmin({role:'Implementation Staff'},'Owner','new@example.com',existing),false);
 assert.equal(roleData.canProvisionEnterpriseAdmin(admin,'Owner',' OWNER@example.com ',existing),false);
 assert.equal(roleData.canProvisionEnterpriseAdmin(admin,' ','new@example.com',existing),false);
 assert.equal(roleData.canProvisionEnterpriseAdmin(admin,'Owner','invalid',existing),false);
});
test('active investigation KPI excludes rule alerts, missing cases and closed cases',()=>{
 const base={scoringSource:'AI',riskLevel:'Abnormal',caseId:'case-1',caseStatus:'Investigating'};
 assert.ok(cases.isActiveInvestigation(base));
 for(const change of [{scoringSource:'RULE'},{scoringSource:'RULE_FALLBACK'},{caseId:undefined},{caseStatus:'Resolved'},{riskLevel:'Normal'}]) assert.equal(cases.isActiveInvestigation({...base,...change}),false);
});
