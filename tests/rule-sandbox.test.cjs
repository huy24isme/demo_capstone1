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
  vm.runInNewContext(output, { exports, require: (name) => name in imports ? imports[name] : require(name) }, { filename });
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
function harness(initialRules = rules, withPublisher = true) {
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
    react, '@/lib/rule-sandbox': engine, '@/lib/rule-lifecycle': lifecycle, './SecurityDashboard.module.css': { default: {} },
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
  render();
  return { action, click, change, nodes, toasts, published };
}

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
  const previous = { id: 'tx', caseId: 'case', caseStatus: 'Investigating', assignedInvestigator: 'Owner', riskLevel: 'Abnormal' };
  const owner = { role: 'Investigator', name: 'Owner' };
  const report = { ...previous, caseStatus: 'Reported', investigationReport: { notes: 'Observed evidence', submittedBy: 'Owner' } };
  assert.equal(cases.canUpdateCase(previous, report, owner), true);
  assert.equal(cases.canUpdateCase(previous, report, { ...owner, name: 'Other' }), false);
  assert.equal(cases.canUpdateCase(previous, { ...report, investigationReport: { notes: ' ', submittedBy: 'Owner' } }, owner), false);
  for (const role of ['Viewer', 'Platform Admin']) assert.equal(cases.canUpdateCase(previous, report, { role, name: 'Owner' }), false);
});
test('final case decisions need a reason; closed cases and normal transactions cannot be mutated', () => {
  const previous = { id: 'tx', caseId: 'case', caseStatus: 'Open', riskLevel: 'Abnormal' };
  const actor = { role: 'Operation', name: 'Lead' };
  const final = { ...previous, caseStatus: 'Confirmed Fraud', caseDecision: { directive: 'Reviewed evidence' } };
  assert.equal(cases.canUpdateCase(previous, final, actor), true);
  assert.equal(cases.canUpdateCase(previous, { ...final, caseDecision: { directive: '' } }, actor), false);
  assert.equal(cases.canUpdateCase(final, { ...final, caseStatus: 'Assigned', assignedInvestigator: 'Owner' }, actor), false);
  assert.equal(cases.canUpdateCase({ id: 'tx', riskLevel: 'Normal' }, previous, actor), false);
});
