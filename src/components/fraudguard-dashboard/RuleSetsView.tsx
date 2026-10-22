"use client";
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Search, Layers, Plus, CheckCircle2 } from 'lucide-react';
import type { ProjectItem, RuleTemplate, UserProfile } from './types';
import { type ManagedRuleSet, snapshotRules, testDraft, canPublishSet, publishSet, activateSet } from '@/lib/rule-set-lifecycle';
import { RuleSetTestingView } from './RuleSetTestingView';
import { canDeploy, visibleEnterprises, type Enterprise } from '@/data/fraudguard-enterprises';
import { DEMO_USERS } from '@/data/fraudguard-roles';
import { parseRuleSetSamples } from '@/lib/rule-set';
import { candidateRule } from '@/lib/rule-lifecycle';
import { useLanguage } from './i18n/LanguageContext';
import styles from './SecurityDashboard.module.css';
import { EnterpriseRulesView } from './EnterpriseRulesView';
import { ReadableConditions, transactionLabel } from './ReadableConditions';
interface Props { initialEnterpriseId?: string; sets: ManagedRuleSet[]; rules: RuleTemplate[]; projects: ProjectItem[]; enterprises: Enterprise[]; currentUser: UserProfile; reviewer: string; onChange: (sets: ManagedRuleSet[], event: string) => void; onOpenLibrary: (enterpriseId: string) => void; onAssign: (enterpriseId: string, staffId: string) => void }
export function RuleSetsView({ initialEnterpriseId, sets, rules, projects, enterprises, currentUser, reviewer, onChange, onOpenLibrary, onAssign }: Props) {
  const { language } = useLanguage(); const vi = language === 'vi';
  const [selected, setSelected] = useState(sets.find(s => s.enterpriseId === initialEnterpriseId)?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [enterpriseId, setEnterpriseId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const allowed = visibleEnterprises(currentUser, enterprises);
  const isInternal = ['Platform Admin', 'Implementation Staff'].includes(currentUser.role);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [approved, setApproved] = useState(false);
  const selectedSet = sets.find(s => s.id === selected);
  const enterprise = allowed.find(e => e.id === selectedSet?.enterpriseId);
  const specificationReady = !enterprise?.specification || !!enterprise.specification.confirmedAt;
  const canManage = !!enterprise && canDeploy(currentUser, enterprise);
  const visible = enterprise && isInternal ? selectedSet : undefined;
  const enterpriseName = (id: string) => enterprises.find(e => e.id === id)?.name ?? id;
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;
  const ruleDetails = (rule: RuleTemplate) => <details key={rule.id} className={styles.releaseRule}>
    <summary><span><strong>{rule.name}</strong><span className={styles.ruleCaption}>{rule.appliesTo.transactionTypes.map(type => transactionLabel(type, vi)).join(' · ')}</span></span><span className={styles.ruleTag}>{rule.version}</span></summary>
    <div className={styles.releaseRuleBody}>
      <div className={styles.releaseScope}><span>{vi ? 'Dự án áp dụng' : 'Projects'}</span>{rule.appliesTo.projects.map(id => <span key={id} className={styles.ruleTag}>{id === '*' ? (vi ? 'Tất cả dự án trong tập' : 'All projects in this set') : projectName(id)}</span>)}</div>
      <ReadableConditions node={rule.conditionGroup} vi={vi} />
      <details className={styles.releaseTechnical}><summary>{vi ? 'Cấu hình kỹ thuật (JSON)' : 'Technical configuration (JSON)'}</summary><pre>{JSON.stringify(rule.conditionGroup, null, 2)}</pre></details>
    </div>
  </details>;
  const stageOf = (set?: ManagedRuleSet) => !set ? 'setup' : set.draft ? 'draft' : set.activeVersion && set.handover?.version === set.activeVersion ? 'handed' : set.activeVersion ? 'handover' : set.versions.length ? 'activation' : 'setup';
  const stageLabels: Record<string, string> = vi ? { setup: 'Chưa thiết lập', draft: 'Đang soạn nháp', handed: 'Đã bàn giao', handover: 'Chờ bàn giao', activation: 'Chờ kích hoạt' } : { setup: 'Not configured', draft: 'Draft in progress', handed: 'Handed over', handover: 'Awaiting handover', activation: 'Awaiting activation' };
  const rows = allowed.filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()) && (statusFilter === 'all' || stageOf(sets.find(s => s.enterpriseId === e.id)) === statusFilter));
  const handedCount = allowed.filter(e => { const set = sets.find(s => s.enterpriseId === e.id); return !!set?.activeVersion && set.handover?.version === set.activeVersion; }).length;
  function update(next: ManagedRuleSet, event: string) { if (!canManage) return; onChange(sets.map(s => s.id === next.id ? next : s), event); setNote(''); setApproved(false); setError(''); }
  function saveMembers(ids: string[]) {
    if (!visible?.draft) return;
    try { update({ ...visible, draft: { rules: snapshotRules(rules.filter(r => ids.includes(r.id)), visible.projectIds) } }, 'Cập nhật bản nháp ' + visible.name); } catch(e) { setError((e as Error).message); }
  }
  const eligible = visible ? rules.filter(r => { const c = candidateRule(r); return (!r.enterpriseId || r.enterpriseId === visible.enterpriseId) && (c.appliesTo.projects.includes('*') || c.appliesTo.projects.some(id => visible.projectIds.includes(id))); }) : [];
  let onboardingSamples;
  try { if (enterprise?.specification?.confirmedAt) onboardingSamples = parseRuleSetSamples(enterprise.specification.sampleJson); } catch { /* Invalid saved samples remain unavailable. */ }
  const test = visible?.draft?.test;
  const blockers: string[] = [];
  if (!specificationReady) blockers.push(vi ? 'Xác nhận đặc tả doanh nghiệp trước khi phát hành hoặc bàn giao.' : 'Confirm the enterprise specification before publishing or handing over.');
  if (visible?.draft) {
    if (!visible.draft.rules.length) blockers.push(vi ? 'Tập chưa có rule. Chọn ít nhất một rule trước khi kiểm thử.' : 'Select at least one rule before testing.');
    if (!test) blockers.push(vi ? 'Chưa có kiểm thử hợp lệ cho bản nháp hiện tại. Bấm Chạy kiểm thử sau khi sửa dữ liệu hoặc thành phần tập.' : 'Run a test after editing the dataset or draft members.');
    if (test) {
      const covered = new Set(test.results.flatMap(result => result.rules.filter(rule => rule.outcome !== 'Error').map(rule => rule.id)));
      test.results.forEach((result, index) => {
        const sample = test.samples[index];
        const ref = sample?.ref ?? String(index + 1);
        if (result.status === 'NotEvaluated') blockers.push(vi ? ref + ': không có rule áp dụng. Kiểm tra project và loại giao dịch.' : ref + ': no applicable rules. Check project and transaction type.');
        result.rules.filter(rule => rule.outcome === 'Error').forEach(rule => blockers.push(ref + ' · ' + rule.name + ': ' + (rule.error?.replace('Missing fields:', vi ? 'Thiếu trường:' : 'Missing fields:') ?? (vi ? 'Không đánh giá được.' : 'Evaluation failed.'))));
        if (sample?.expected && sample.expected !== result.result) blockers.push(vi ? ref + ': kết quả ' + result.result + ' khác kỳ vọng ' + sample.expected + '. Đối chiếu lại đặc tả.' : ref + ': result ' + result.result + ' differs from expected ' + sample.expected + '.');
      });
      visible.draft.rules.filter(rule => !covered.has(rule.id)).forEach(rule => blockers.push(vi ? rule.name + ': chưa được đánh giá thành công. Cần mẫu đầy đủ cho loại giao dịch ' + rule.appliesTo.transactionTypes.join(', ') + '.' : rule.name + ': not successfully evaluated. Supply complete samples for ' + rule.appliesTo.transactionTypes.join(', ') + '.'));
    }
  }
  if (!isInternal) return <EnterpriseRulesView enterprise={allowed[0]} set={sets.find(s => s.enterpriseId === allowed[0]?.id)} projects={projects} />;
  const workflowStep = visible?.handover?.version && visible.handover.version === visible.activeVersion && !visible.draft ? 6 : visible?.draft ? (canPublishSet(visible) ? 2 : visible.draft.rules.length ? 1 : 0) : visible?.activeVersion ? 5 : visible?.versions.length ? 4 : 0;
  return <div className={`${styles.ruleWorkspace} ${styles.internalRuleSets}`}>
    <div className={styles.pageHeading}><div><h1>{visible ? enterpriseName(visible.enterpriseId) : (vi ? 'Tập rule doanh nghiệp' : 'Enterprise rule sets')}</h1><p>{visible ? visible.name : currentUser.role === 'Platform Admin' ? (vi ? 'Theo dõi tiến độ triển khai và phân công người phụ trách từng doanh nghiệp.' : 'Track deployment progress and assign enterprise owners.') : (vi ? 'Cấu hình, kiểm thử và bàn giao tập quy tắc cho doanh nghiệp được phân công.' : 'Configure, test and hand over rule sets for your assigned enterprises.')}</p></div><span className={styles.setAccessLabel}>{currentUser.role === 'Platform Admin' ? (vi ? 'Quản trị & giám sát' : 'Administration & oversight') : (vi ? 'Không gian triển khai' : 'Deployment workspace')}</span></div>
    {!visible && <dl className={styles.setSummary}>
      <div><dt><Building2 size={16} />{vi ? 'Doanh nghiệp' : 'Enterprises'}</dt><dd>{allowed.length}<small>{vi ? 'trong phạm vi quản lý' : 'in your scope'}</small></dd></div>
      <div><dt><Layers size={16} />{vi ? 'Bản nháp đang xử lý' : 'Drafts in progress'}</dt><dd>{allowed.filter(e => sets.some(s => s.enterpriseId === e.id && s.draft)).length}<small>{vi ? 'cần kiểm thử và review' : 'to test and review'}</small></dd></div>
      <div><dt><CheckCircle2 size={16} />{vi ? 'Phiên bản đã bàn giao' : 'Handed-over releases'}</dt><dd>{handedCount}<small>{vi ? 'khớp phiên bản đang hoạt động' : 'matching the active version'}</small></dd></div>
    </dl>}
    {creating && <form className={styles.panel} onSubmit={e => { e.preventDefault(); const owner = allowed.find(x => x.id === enterpriseId); if (!owner || !canDeploy(currentUser, owner) || !name.trim() || !owner.projectIds.length) return; if (sets.some(s => s.enterpriseId === enterpriseId)) { setError(vi ? 'Doanh nghiệp đã có tập rule. Hãy mở tập hiện có.' : 'This enterprise already has a rule set.'); return; } const next: ManagedRuleSet = { id: crypto.randomUUID(), name: name.trim(), enterpriseId, projectIds: [...owner.projectIds], draft: { rules: [] }, versions: [] }; onChange([...sets, next], 'Thiết lập tập rule ' + owner.name); setSelected(next.id); setCreating(false); setNote(''); setApproved(false); }}><h2>{enterpriseName(enterpriseId)}</h2><label className={styles.drawerLabel}>{vi ? 'Tên tập rule' : 'Rule set name'}<input required maxLength={100} className={styles.control} value={name} onChange={e => setName(e.target.value)} /></label><div className={styles.sandboxActions}><button className={styles.button} type="submit">{vi ? 'Lưu bản nháp tập rule' : 'Save rule set draft'}</button><button className={styles.button} type="button" onClick={() => setCreating(false)}>{vi ? 'Hủy' : 'Cancel'}</button></div></form>}
    {error && <p className={styles.sandboxError} role="alert">{error}</p>}
    {!visible && <section className={`${styles.panel} ${styles.tablePanel}`}>
      <div className={styles.setListHeader}><div><h2>{vi ? 'Danh sách doanh nghiệp' : 'Enterprise directory'}</h2><span className={styles.ruleCaption}>{vi ? 'Mỗi doanh nghiệp một tập quy tắc, quản lý theo phiên bản.' : 'One versioned rule set for each enterprise.'}</span></div><span className={styles.ruleTag}>{rows.length} / {allowed.length}</span></div>
      <div className={styles.setFilters}><label className={styles.setSearch}><Search size={16} aria-hidden="true" /><input type="search" aria-label={vi ? 'Tìm doanh nghiệp' : 'Find enterprise'} className={styles.control} value={search} onChange={e => setSearch(e.target.value)} placeholder={vi ? 'Tìm theo tên doanh nghiệp…' : 'Search enterprises…'} /></label><select aria-label={vi ? 'Lọc trạng thái triển khai' : 'Filter deployment status'} className={styles.control} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{vi ? 'Tất cả trạng thái' : 'All statuses'}</option>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{(search || statusFilter !== 'all') && <button className={styles.button} onClick={() => { setSearch(''); setStatusFilter('all'); }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</button>}</div>
      <div className={styles.tableScroll}><table className={`${styles.table} ${styles.setDirectory}`}><thead><tr>{(vi ? ['Doanh nghiệp / Tập quy tắc', 'Phụ trách triển khai', 'Đang hoạt động', 'Tiến độ triển khai', 'Thao tác'] : ['Enterprise / Rule set', 'Deployment owner', 'Active release', 'Deployment progress', 'Action']).map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>
      {rows.map(owner => {
        const set = sets.find(s => s.enterpriseId === owner.id);
        const handed = !!set?.activeVersion && set.handover?.version === set.activeVersion;
        const stage = stageOf(set);
        const status = stageLabels[stage];
        return <tr key={owner.id}>
          <td><div className={styles.setEnterprise}><span className={styles.setEnterpriseIcon}><Building2 size={18} /></span><div><strong>{owner.name}</strong><span className={styles.ruleCaption}>{set?.name ?? (vi ? 'Chưa có tập quy tắc' : 'No rule set yet')}</span></div></div><div className={styles.setProjects}>{owner.projectIds.map(id => <span key={id} className={styles.ruleTag}>{projectName(id)}</span>)}{!owner.projectIds.length && <span className={styles.muted}>{vi ? 'Chưa có dự án' : 'No projects'}</span>}</div></td>
          <td>{currentUser.role === 'Platform Admin' ? <select aria-label={(vi ? 'Phân công ' : 'Assign ') + owner.name} className={styles.control} value={owner.deploymentStaffId} onChange={e => onAssign(owner.id, e.target.value)}>{DEMO_USERS.filter(u => u.role === 'Implementation Staff').map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select> : DEMO_USERS.find(u => u.id === owner.deploymentStaffId)?.name ?? owner.deploymentStaffId}</td>
          <td>{set?.activeVersion ? <><span className={styles.setVersion}>v{set.activeVersion}.0</span><span className={styles.ruleCaption}>{set.versions.find(v => v.version === set.activeVersion)?.rules.length ?? 0} {vi ? 'quy tắc' : 'rules'}</span></> : <span className={styles.muted}>{vi ? 'Chưa kích hoạt' : 'Not active'}</span>}</td>
          <td><span className={styles.setStatus} data-stage={stage}><i aria-hidden="true" />{status}</span><span className={styles.ruleCaption}>{set?.draft && handed ? (vi ? 'Bản hiện tại vẫn đã bàn giao' : 'Current release remains handed over') : stage === 'draft' ? (vi ? 'Chuẩn bị phiên bản tiếp theo' : 'Preparing the next release') : stage === 'handover' ? (vi ? 'Sẵn sàng gửi doanh nghiệp' : 'Ready for enterprise handover') : stage === 'activation' ? (vi ? 'Đã phát hành, chưa áp dụng' : 'Published, not yet applied') : ''}</span></td>
          <td>{set ? <button className={`${styles.button} ${styles.setOpenButton}`} aria-label={(vi ? 'Xem chi tiết ' : 'View details for ') + owner.name} onClick={() => { setSelected(set.id); setCreating(false); setNote(''); setApproved(false); setError(''); }}>{vi ? 'Xem chi tiết' : 'View details'}<ArrowRight size={15} /></button> : canDeploy(currentUser, owner) ? <><button className={styles.button} disabled={!owner.projectIds.length} onClick={() => { setEnterpriseId(owner.id); setName(owner.name + ' Rules'); setCreating(true); setSelected(''); }}><Plus size={15} />{vi ? 'Thiết lập' : 'Set up'}</button>{!owner.projectIds.length && <div className={styles.muted}>{vi ? 'Thêm dự án để bắt đầu' : 'Add a project to begin'}</div>}</> : <span className={styles.muted}>{vi ? 'Chưa có tập để xem' : 'No set to view'}</span>}</td>
        </tr>;
      })}
      {!rows.length && <tr><td colSpan={5} className={styles.emptyState}>{vi ? 'Không có doanh nghiệp phù hợp với bộ lọc.' : 'No enterprises match these filters.'}</td></tr>}
    </tbody></table></div><div className={styles.ruleFootnote}>{vi ? `Hiển thị ${rows.length} trên ${allowed.length} doanh nghiệp` : `Showing ${rows.length} of ${allowed.length} enterprises`}</div></section>}
    {visible && <div className={styles.sandboxStack}>
      <button className={`${styles.button} ${styles.ruleBack}`} onClick={() => { setSelected(''); setError(''); }}><ArrowLeft size={16} />{vi ? 'Quay lại danh sách doanh nghiệp' : 'Back to enterprises'}</button>
      <ol className={styles.ruleWorkflow} aria-label={vi ? 'Tiến độ triển khai' : 'Deployment progress'}>{(vi ? ['Cấu hình', 'Kiểm thử', 'Review', 'Phát hành', 'Kích hoạt', 'Bàn giao'] : ['Configure', 'Test', 'Review', 'Publish', 'Activate', 'Handover']).map((step, index) => <li key={step} data-complete={index < workflowStep} aria-current={index === workflowStep ? 'step' : undefined}><span>{index < workflowStep ? '✓' : index + 1}</span>{step}</li>)}</ol>
      <dl className={styles.setSummary}>
        <div><dt>{vi ? 'Phiên bản hoạt động' : 'Active release'}</dt><dd>{visible.activeVersion ? `v${visible.activeVersion}.0` : '—'}<small>{visible.activeVersion ? (vi ? 'đang được áp dụng' : 'currently applied') : (vi ? 'chưa kích hoạt' : 'not activated')}</small></dd></div>
        <div><dt>{vi ? 'Bản nháp' : 'Draft'}</dt><dd>{visible.draft ? visible.draft.rules.length : '—'}<small>{visible.draft ? (vi ? 'quy tắc được chọn' : 'selected rules') : (vi ? 'chưa có thay đổi mới' : 'no pending changes')}</small></dd></div>
        <div><dt>{vi ? 'Bàn giao cho doanh nghiệp' : 'Enterprise handover'}</dt><dd>{visible.handover ? `v${visible.handover.version}.0` : '—'}<small>{visible.handover ? (vi ? 'phiên bản đã bàn giao' : 'delivered release') : (vi ? 'chưa bàn giao' : 'not handed over')}</small></dd></div>
      </dl>
      <section className={styles.panel}><div className={styles.panelHeader}><h2>{visible.name} · {enterpriseName(visible.enterpriseId)}</h2>{canManage && !visible.draft && <button className={styles.button} onClick={() => { const last = visible.versions[visible.versions.length - 1]; update({ ...visible, projectIds: [...enterprise!.projectIds], draft: { rules: structuredClone(last?.rules ?? []) } }, 'Tạo phiên bản nháp ' + visible.name); }}>{vi ? 'Tạo phiên bản nháp mới' : 'Create new draft version'}</button>}</div><p className={styles.muted}>{vi ? 'Bản nháp không thay đổi phiên bản đang hoạt động. Sau kiểm thử và review, phát hành rồi kích hoạt phiên bản trước khi bàn giao.' : 'Drafts do not change the active release. After testing and review, publish and activate the release before handover.'}</p><div className={styles.ruleScope}><span>{vi ? 'Phạm vi' : 'Scope'}</span>{visible.projectIds.map(id => <span className={styles.ruleTag} key={id}>{projectName(id)}</span>)}</div></section>
      {!canManage && visible.draft && isInternal && <section className={styles.panel}><h2>{vi ? 'Bản nháp (chỉ xem)' : 'Draft (read-only)'}</h2><div className={styles.releaseRuleList}>{visible.draft.rules.map(ruleDetails)}</div>{!visible.draft.rules.length && <p className={styles.muted}>{vi ? 'Chưa có quy tắc trong bản nháp.' : 'No rules in this draft yet.'}</p>}</section>}
      {visible.legacySets?.length ? <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>{vi ? 'Cấu hình cũ theo dự án' : 'Archived project configurations'}</h2><span className={styles.ruleCaption}>{vi ? 'Các bản lưu trước khi chuyển sang một tập quy tắc cho mỗi doanh nghiệp.' : 'Saved configurations from before the move to one rule set per enterprise.'}</span></div><span className={styles.ruleTag}>{visible.legacySets.length} {vi ? 'bản lưu' : 'archives'}</span></div>
        <p className={styles.legacyNotice}>{vi ? 'Chọn một bản lưu để xem quy tắc. Khôi phục chỉ tạo bản nháp; cần kiểm thử và review trước khi phát hành.' : 'Select an archive to inspect its rules. Restoring creates a draft that requires testing and review before publication.'}</p>
        <div className={styles.releaseList}>{visible.legacySets.map(old => {
          const sourceVersion = old.versions.find(v => v.version === old.activeVersion) ?? old.versions.at(-1);
          const sourceRules = old.draft?.rules ?? sourceVersion?.rules ?? [];
          return <details key={old.id} className={styles.releaseCard}>
            <summary><span className={styles.legacyIcon}><Layers size={18} aria-hidden="true" /></span><span className={styles.releaseTitle}><strong>{old.name}</strong><span className={styles.ruleCaption}>{projectName(old.projectId)}</span></span><span className={styles.ruleTag}>{sourceRules.length} {vi ? 'quy tắc' : 'rules'}</span></summary>
            <div className={styles.releaseBody}>
              <dl className={styles.releaseMetadata}><div><dt>{vi ? 'Dự án gốc' : 'Original project'}</dt><dd>{projectName(old.projectId)}</dd></div><div><dt>{vi ? 'Nguồn khôi phục' : 'Restore source'}</dt><dd>{old.draft ? (vi ? 'Bản nháp đã lưu' : 'Saved draft') : sourceVersion ? `v${sourceVersion.version}.0` : (vi ? 'Chưa có cấu hình' : 'No configuration')}</dd></div><div><dt>{vi ? 'Lịch sử lưu trữ' : 'Archived history'}</dt><dd>{old.versions.length} {vi ? 'phiên bản đã phát hành' : 'published versions'}</dd></div></dl>
              <h3>{vi ? 'Quy tắc sẽ được khôi phục' : 'Rules to restore'}</h3>
              {sourceRules.length ? <div className={styles.releaseRuleList}>{sourceRules.map(ruleDetails)}</div> : <p className={styles.muted}>{vi ? 'Bản lưu này chưa có quy tắc.' : 'This archive has no rules.'}</p>}
              <details className={styles.releaseTechnical}><summary>{vi ? 'Toàn bộ dữ liệu lưu trữ (JSON)' : 'Full archived data (JSON)'}</summary><pre>{JSON.stringify(old, null, 2)}</pre></details>
              {canManage && <div className={styles.releaseActions}><span className={styles.ruleCaption}>{visible.draft ? (vi ? 'Thao tác này thay thế nội dung bản nháp hiện tại và cần kiểm thử lại.' : 'This replaces the current draft and requires a new test.') : (vi ? 'Phiên bản đang hoạt động được giữ nguyên.' : 'The active release remains unchanged.')}</span><button className={styles.button} onClick={() => update({ ...visible, draft: { rules: structuredClone(sourceRules) } }, 'Khôi phục cấu hình cũ vào bản nháp ' + visible.name)}>{vi ? 'Khôi phục vào bản nháp' : 'Restore to draft'}</button></div>}
            </div>
          </details>;
        })}</div>
      </section> : null}
      {canManage && visible.activeVersion && visible.handover?.version !== visible.activeVersion && <section className={styles.panel}><p>{vi ? 'Bàn giao phiên bản đang kích hoạt cho SME Portal trong demo. Không tạo tài khoản hoặc cấp quyền backend thật.' : 'Hand over the active version to the demo SME portal. No real backend access is provisioned.'}</p><button className={styles.button} disabled={!specificationReady} onClick={() => update({ ...visible, handover: { version: visible.activeVersion!, by: reviewer, at: new Date().toISOString() } }, 'Bàn giao tập rule ' + visible.name)}>{vi ? 'Xác nhận bàn giao demo' : 'Confirm demo handover'}</button></section>}
      {canManage && visible.draft && <>
        <section className={styles.panel}><div className={styles.panelHeader}><h2>{vi ? 'Thành phần bản nháp' : 'Draft members'} · v{Math.max(0, ...visible.versions.map(v => v.version)) + 1}.0</h2><button className={styles.button} onClick={() => onOpenLibrary(visible.enterpriseId)}>{vi ? 'Mở thư viện để tạo / sửa rule' : 'Open rule library'}</button></div>
          <p className={styles.muted}>{vi ? 'Chọn rule để lưu bản sao điều kiện vào tập. [draft] là bản nháp từ thư viện; phiên bản tập rule quản lý bản sao này. Thay đổi thư viện không tự sửa tập đã lưu.' : 'Selection snapshots rule definitions. [draft] identifies a library draft. Library changes do not alter saved sets.'}</p>
          <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>{vi ? 'Chọn' : 'Include'}</th><th>Rule</th><th>{vi ? 'Loại giao dịch' : 'Transaction types'}</th><th>{vi ? 'Bản sao trong tập' : 'Set snapshot'}</th></tr></thead><tbody>{eligible.map(rule => { const member = visible.draft!.rules.find(r => r.id === rule.id); return <tr key={rule.id}><td><input type="checkbox" aria-label={rule.name} checked={!!member} onChange={e => { const existing = visible.draft!.rules; const next = e.target.checked ? [...existing, ...snapshotRules([rule], visible.projectIds)] : existing.filter(r => r.id !== rule.id); update({ ...visible, draft: { rules: next } }, 'Sửa thành phần tập ' + visible.name); }} /></td><td>{rule.name}</td><td>{candidateRule(rule).appliesTo.transactionTypes.join(', ')}</td><td>{member?.version ?? '–'}</td></tr>; })}</tbody></table></div>
          {visible.draft.rules.some(r => !eligible.some(e => e.id === r.id)) && <p className={styles.muted}>{vi ? 'Có bản sao rule không còn trong thư viện / phạm vi hiện tại. Cập nhật từ thư viện để loại bỏ các bản sao đó.' : 'Some snapshots are no longer in the library or scope. Refresh to remove them.'}</p>}
          <button className={styles.button} onClick={() => saveMembers(visible.draft!.rules.map(r => r.id))}>{vi ? 'Cập nhật bản sao từ thư viện (cần kiểm thử lại)' : 'Refresh snapshots from library (retest required)'}</button>
        </section>
        <RuleSetTestingView key={visible.id + JSON.stringify(visible.draft.rules)} rules={visible.draft.rules} projects={projects.filter(p => visible.projectIds.includes(p.id))} allowedProjectIds={visible.projectIds} enterpriseLabel={enterpriseName(visible.enterpriseId)} initialSamples={visible.draft.test?.samples ?? onboardingSamples} draftMode onTestInvalidated={() => { if (visible.draft?.test) update({ ...visible, draft: { rules: visible.draft.rules } }, 'Thay đổi dữ liệu kiểm thử ' + visible.name); }} onTestCompleted={samples => { try { const test = testDraft(visible, samples); update({ ...visible, draft: { ...visible.draft!, test } }, 'Kiểm thử tập ' + visible.name); } catch(e) { setError((e as Error).message); } }} />
        <section className={styles.panel}><h2>{vi ? 'Review và phát hành' : 'Review and publish'}</h2>
          {visible.draft.test ? <p role="status">{visible.draft.test.samples.length} {vi ? 'mẫu' : 'samples'} · {visible.draft.test.labeled} {vi ? 'có nhãn' : 'labeled'} · {visible.draft.test.mismatched} {vi ? 'lệch kỳ vọng' : 'mismatches'} · {visible.draft.test.complete ? (vi ? 'Đánh giá đầy đủ; tất cả rule đã được chạy' : 'Complete; all rules exercised') : (vi ? 'Chưa đủ: kiểm tra lỗi, phạm vi mẫu và độ bao phủ rule' : 'Incomplete: check errors, scope and rule coverage')}</p> : <p>{vi ? 'Chưa có kết quả kiểm thử bản nháp này.' : 'This draft has not been tested.'}</p>}
          {blockers.length > 0 && <div role="status" className={styles.sandboxAdvanced}><strong>{vi ? 'Các việc cần xử lý trước khi phát hành' : 'Resolve before publication'}</strong><ul>{blockers.map((reason, index) => <li key={index}>{reason}</li>)}</ul><p className={styles.muted}>{vi ? 'Sửa dữ liệu hoặc phạm vi rule, chạy lại kiểm thử, sau đó review và xác nhận. Giao dịch bất thường và mẫu chưa gán nhãn không tự làm khóa phát hành.' : 'Correct data or rule scope, rerun, then review and confirm. Abnormal results and unlabeled samples do not block publication by themselves.'}</p></div>}
          <p className={styles.muted}>{vi ? 'Mọi mẫu phải đánh giá đầy đủ và không lệch nhãn đã cung cấp; tất cả rule trong tập phải được kiểm thử. Mẫu không có nhãn cần người review đối chiếu đặc tả. Phát hành không tự kích hoạt.' : 'All samples must complete without labeled mismatches; every member must be exercised. Unlabeled samples require manual specification review. Publishing does not activate the release.'}</p>
          <label className={styles.drawerLabel}>{vi ? 'Nhận xét review / cơ sở đối chiếu đặc tả' : 'Review notes / specification evidence'}<textarea className={`${styles.control} ${styles.sandboxJson}`} value={note} onChange={e => { setNote(e.target.value); setApproved(false); }} /></label>
          <label className={styles.sandboxActions}><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />{vi ? 'Tôi đã kiểm tra kết quả theo đặc tả và chấp thuận phiên bản này.' : 'I reviewed the results against the specification and approve this version.'}</label>
          <button className={`${styles.drawerPrimaryBtn} ${styles.sandboxAction}`} disabled={!specificationReady || !canPublishSet(visible) || !note.trim() || !approved} onClick={() => { try { update(publishSet(visible, reviewer, note), 'Phát hành tập ' + visible.name); } catch(e) { setError((e as Error).message); } }}>{vi ? 'Phát hành phiên bản tập rule' : 'Publish rule set version'}</button>
        </section>
      </>}
      <section className={styles.panel}>
        <div className={styles.panelHeader}><div><h2>{vi ? 'Các phiên bản đã phát hành' : 'Published versions'}</h2><span className={styles.ruleCaption}>{vi ? 'Xem nội dung quy tắc và kết quả review của từng lần phát hành.' : 'Inspect the rules and review evidence for each release.'}</span></div><span className={styles.ruleTag}>{visible.versions.length} {vi ? 'phiên bản' : 'versions'}</span></div>
        {!visible.versions.length && <p className={styles.muted}>{vi ? 'Chưa có phiên bản đã phát hành.' : 'No published versions.'}</p>}
        <div className={styles.releaseList}>{visible.versions.slice().reverse().map(v => <details key={v.version} className={styles.releaseCard} open={visible.activeVersion === v.version || undefined}>
          <summary><span className={styles.releaseTitle}><strong>v{v.version}.0</strong><span className={styles.ruleCaption}>{v.rules.length} {vi ? 'quy tắc' : 'rules'} · {new Date(v.publishedAt).toLocaleString(vi ? 'vi-VN' : 'en-US')}</span></span><span className={styles.setStatus} data-stage={visible.activeVersion === v.version ? 'handed' : 'setup'}>{visible.activeVersion === v.version ? (vi ? 'Đang hoạt động' : 'Active') : (vi ? 'Đã phát hành' : 'Published')}</span></summary>
          <div className={styles.releaseBody}>
            <dl className={styles.releaseMetadata}><div><dt>{vi ? 'Người review' : 'Reviewer'}</dt><dd>{v.reviewer}</dd></div><div><dt>{vi ? 'Dữ liệu kiểm thử' : 'Test dataset'}</dt><dd>{v.test.samples.length} {vi ? 'mẫu' : 'samples'} · {v.test.labeled} {vi ? 'có nhãn' : 'labeled'}</dd></div><div><dt>{vi ? 'Đối chiếu kỳ vọng' : 'Expected results'}</dt><dd>{v.test.labeled ? `${v.test.mismatched} ${vi ? 'mẫu lệch kỳ vọng' : 'mismatches'}` : (vi ? 'Review thủ công theo đặc tả' : 'Manual specification review')}</dd></div></dl>
            <div className={styles.releaseReview}><span>{vi ? 'Nhận xét review' : 'Review notes'}</span><p>{v.reviewNote}</p></div>
            <h3>{vi ? 'Quy tắc trong phiên bản' : 'Rules in this release'} <span className={styles.muted}>({v.rules.length})</span></h3>
            <div className={styles.releaseRuleList}>{v.rules.map(ruleDetails)}</div>
            {canManage && <div className={styles.releaseActions}><span className={styles.ruleCaption}>{visible.activeVersion === v.version ? (vi ? 'Doanh nghiệp đang sử dụng phiên bản này.' : 'This release is currently active.') : (vi ? 'Kích hoạt sẽ thay thế phiên bản đang áp dụng.' : 'Activation replaces the currently active release.')}</span><button className={styles.button} disabled={!specificationReady || visible.activeVersion === v.version} onClick={() => onChange(activateSet(sets, visible.id, v.version), `Kích hoạt ${visible.name} v${v.version}.0`)}>{vi ? 'Kích hoạt cho doanh nghiệp' : 'Activate for enterprise'}</button></div>}
          </div>
        </details>)}</div>
      </section>
    </div>}
  </div>;
}
