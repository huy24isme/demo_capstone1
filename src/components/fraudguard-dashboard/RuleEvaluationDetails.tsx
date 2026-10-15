"use client";
import type { RuleSetEvaluation } from './types';
import { useLanguage } from './i18n/LanguageContext';
import { RiskLevelBadge } from './RiskLevelBadge';
import styles from './SecurityDashboard.module.css';
export function RuleEvaluationDetails({ evaluation }: { evaluation: RuleSetEvaluation }) {
  const { language } = useLanguage(); const vi = language === 'vi';
  return <section>
    {evaluation.ruleSet && <p><strong>{evaluation.ruleSet.name} · v{evaluation.ruleSet.version}.0</strong></p>}
    <p><RiskLevelBadge riskLevel={evaluation.result} /> · {evaluation.matched}/{evaluation.evaluated} {vi ? 'rule đã đánh giá khớp' : 'evaluated rules matched'}</p>
    <p>{evaluation.evaluated}/{evaluation.applicable} {vi ? 'rule áp dụng đã đánh giá' : 'applicable rules evaluated'} · {evaluation.failed} {vi ? 'lỗi' : 'errors'} · {evaluation.status === 'Complete' ? (vi ? 'Hoàn tất' : 'Complete') : evaluation.status === 'Incomplete' ? (vi ? 'Chưa hoàn tất' : 'Incomplete') : (vi ? 'Không có rule áp dụng' : 'No applicable rules')}</p>
    <p className={styles.muted}>{vi ? 'Kết quả phát hiện không phải kết luận gian lận. Doanh nghiệp xem xét và quyết định.' : 'Detection is not a fraud verdict. The enterprise reviews and decides.'}</p>
    <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>{vi ? 'Rule / Phiên bản' : 'Rule / Version'}</th><th>{vi ? 'Kết quả' : 'Outcome'}</th><th>{vi ? 'Điều kiện tại thời điểm chạy' : 'Condition snapshot'}</th></tr></thead><tbody>
      {evaluation.rules.map(rule => <tr key={rule.id}><td>{rule.name} · {rule.version}</td><td>{rule.outcome === 'Matched' ? (vi ? 'Khớp' : 'Matched') : rule.outcome === 'NotMatched' ? (vi ? 'Không khớp' : 'Not matched') : (vi ? 'Không đánh giá được' : 'Evaluation error')}{rule.error && <p role="note">{rule.error}</p>}</td><td><details className={styles.sandboxAdvanced}><summary>{vi ? 'Xem điều kiện' : 'View conditions'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(rule.conditionGroup, null, 2)}</pre></details></td></tr>)}
    </tbody></table></div>
    <details><summary>{vi ? 'Dữ liệu sử dụng khi đánh giá' : 'Evaluation input'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(evaluation.fields, null, 2)}</pre></details>
  </section>;
}
