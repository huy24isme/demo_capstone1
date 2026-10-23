"use client";
import { useState } from 'react';
import type { ManagedRuleSet } from '@/lib/rule-set-lifecycle';
import type { Enterprise } from '@/data/fraudguard-enterprises';
import type { ProjectItem } from './types';
import { ReadableConditions, transactionLabel } from './ReadableConditions';
import { useLanguage } from './i18n/LanguageContext';
import styles from './SecurityDashboard.module.css';

export function EnterpriseRulesView({ set, enterprise, projects }: { set?: ManagedRuleSet; enterprise?: Enterprise; projects: ProjectItem[] }) {
  const { language } = useLanguage(); const vi = language === 'vi';
  const [query, setQuery] = useState('');
  const release = set?.handover ? set.versions.find(v => v.version === set.handover!.version) : undefined;
  const duplicateRules = !!release && new Set(release.rules.map(rule => rule.id)).size !== release.rules.length;
  const active = !!release && release.version === set?.activeVersion;
  const projectName = (id: string) => projects.find(p => p.id === id)?.name ?? id;
  const rules = release?.rules.map((rule, sourceIndex) => ({ rule, sourceIndex })).filter(({ rule: r }) => `${r.name} ${r.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  return <div className={styles.ruleWorkspace}>
    <div className={styles.pageHeading}><div><h1>{vi ? 'Quy tắc phát hiện' : 'Detection rules'}</h1><p>{vi ? 'Hiểu vì sao một giao dịch được đánh dấu bất thường.' : 'Understand why a transaction is flagged as unusual.'}</p></div></div>
    {!enterprise ? <section className={`${styles.panel} ${styles.ruleEmpty}`}><h2>{vi ? 'Chưa có doanh nghiệp được liên kết' : 'No business linked'}</h2><p>{vi ? 'Liên hệ người quản trị tài khoản để kiểm tra quyền truy cập của bạn.' : 'Contact your account administrator to check your access.'}</p></section> : <>
      <section className={`${styles.panel} ${styles.protectionOverview}`}>
        <div className={styles.ruleSectionHeader}><div><span className={styles.ruleCaption}>{vi ? 'Doanh nghiệp' : 'Business'}</span><h2>{enterprise.name}</h2></div><span className={`${styles.badge} ${active ? styles.low : styles.high}`}>{active ? (vi ? 'Đang áp dụng' : 'In use') : release ? (vi ? 'Đang cập nhật' : 'Update in progress') : (vi ? 'Đang chuẩn bị' : 'Being prepared')}</span></div>
        {release ? <><p>{vi ? 'Các quy tắc dưới đây đã được bàn giao cho doanh nghiệp. Giao dịch thỏa mãn ít nhất một quy tắc áp dụng sẽ được đánh dấu bất thường để bạn xem xét.' : 'These rules have been handed over to your business. A transaction matching at least one applicable rule is flagged for review.'}</p>
          <dl className={styles.ruleFacts}><div><dt>{vi ? 'Quy tắc đã bàn giao' : 'Handed-over rules'}</dt><dd>{release.rules.length}</dd></div><div><dt>{vi ? 'Ngày bàn giao' : 'Handover date'}</dt><dd>{new Date(set!.handover!.at).toLocaleDateString(vi ? 'vi-VN' : 'en-US')}</dd></div><div><dt>{vi ? 'Phiên bản' : 'Version'}</dt><dd>v{release.version}.0</dd></div></dl>
          {!active && <p className={styles.ruleNotice}>{vi ? 'Đội triển khai đang cập nhật cấu hình. Bạn đang xem bản đã bàn giao gần nhất; bản này không phải phiên bản đang được kích hoạt.' : 'The deployment team is updating the configuration. You are viewing the last handover, which is not the currently activated version.'}</p>}
        </> : <div className={styles.rulePending}><h3>{vi ? 'Đội triển khai đang chuẩn bị quy tắc cho bạn' : 'Your rules are being prepared'}</h3><p>{vi ? 'Danh sách quy tắc sẽ xuất hiện tại đây sau khi được kiểm thử và bàn giao. Bạn chưa cần thực hiện thao tác nào trên trang này.' : 'The rules will appear here after testing and handover. No action is needed from you on this page yet.'}</p></div>}
        <div className={styles.ruleScope}><span>{vi ? 'Dự án áp dụng' : 'Projects'}</span>{enterprise.projectIds.length ? enterprise.projectIds.map(id => <span className={styles.ruleTag} key={id}>{projectName(id)}</span>) : <span>{vi ? 'Đang được thiết lập' : 'Being configured'}</span>}</div>
      </section>
      {release && <section className={`${styles.panel} ${styles.tablePanel}`}>
        {duplicateRules && <p role="status" className={styles.ruleNotice}>{vi ? 'Cấu hình đã bàn giao có mục quy tắc bị trùng. Vui lòng liên hệ nhân viên triển khai kiểm tra và bàn giao phiên bản điều chỉnh.' : 'The handed-over configuration contains duplicate rule entries. Contact implementation staff for a corrected release.'}</p>}
        <div className={styles.ruleToolbar}><div><h2>{vi ? 'Danh sách quy tắc' : 'Rule list'}</h2><p>{vi ? 'Mở từng quy tắc để xem điều kiện phát hiện và phạm vi áp dụng.' : 'Open a rule to view its detection conditions and scope.'}</p></div><label className={styles.ruleSearch}>{vi ? 'Tìm quy tắc' : 'Find a rule'}<input type="search" className={styles.control} value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? 'Tên hoặc nội dung quy tắc' : 'Rule name or description'} /></label></div>
        <div className={styles.ruleList}>{rules.map(({ rule, sourceIndex }) => <details className={styles.businessRule} key={`${release.version}:${sourceIndex}:${rule.id}`}><summary><span><strong>{rule.name}</strong><span className={styles.ruleCaption}>{rule.appliesTo.transactionTypes.map(type => transactionLabel(type, vi)).join(' · ')}</span></span><span className={styles.ruleOpenLabel}>{vi ? 'Xem chi tiết' : 'View details'}</span></summary><div className={styles.businessRuleBody}>{rule.description && <p>{rule.description}</p>}<h3>{vi ? 'Khi nào giao dịch được đánh dấu?' : 'When is a transaction flagged?'}</h3><ReadableConditions node={rule.conditionGroup} vi={vi} /><p><strong>{vi ? 'Áp dụng cho: ' : 'Applies to: '}</strong>{rule.appliesTo.projects.map(projectName).join(', ')}</p><p className={styles.ruleCaption}>{vi ? 'Kết quả này hỗ trợ bạn xác minh. Quyết định xử lý giao dịch thuộc về doanh nghiệp.' : 'This result supports your review. Your business decides how to handle the transaction.'}</p></div></details>)}</div>
        {!rules.length && <div className={styles.ruleEmpty}><h3>{vi ? 'Không có quy tắc phù hợp' : 'No matching rules'}</h3><p>{vi ? 'Thử tên khác hoặc xóa nội dung tìm kiếm.' : 'Try another name or clear your search.'}</p>{query && <button className={styles.button} onClick={() => setQuery('')}>{vi ? 'Xóa tìm kiếm' : 'Clear search'}</button>}</div>}
        <div className={styles.ruleFootnote}>{vi ? `${rules.length} / ${release.rules.length} quy tắc · Chỉ xem. Đội triển khai phụ trách thay đổi cấu hình.` : `${rules.length} / ${release.rules.length} rules · Read-only. The deployment team manages configuration changes.`}</div>
      </section>}
    </>}
  </div>;
}
