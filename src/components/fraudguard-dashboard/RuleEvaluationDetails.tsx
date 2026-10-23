"use client";
import type { RuleSetEvaluation } from './types';
import { useLanguage } from './i18n/LanguageContext';
import { RiskLevelBadge } from './RiskLevelBadge';
import styles from './SecurityDashboard.module.css';
import { ReadableConditions, fieldLabel } from './ReadableConditions';
export function RuleEvaluationDetails({ evaluation, technical = true }: { evaluation: RuleSetEvaluation; technical?: boolean }) {
  const { language } = useLanguage(); const vi = language === 'vi';
  if (!technical) return <section className={styles.ruleWorkspace}>
    <div><h3>{vi ? 'Kết quả kiểm tra quy tắc' : 'Rule check results'}</h3><p><RiskLevelBadge riskLevel={evaluation.result} /> · {evaluation.matched} {vi ? 'quy tắc phát hiện dấu hiệu bất thường' : 'rules detected unusual activity'}</p>
      <p className={styles.ruleCaption}>{vi ? `Đã kiểm tra ${evaluation.evaluated} trong ${evaluation.applicable} quy tắc áp dụng cho giao dịch này.` : `Checked ${evaluation.evaluated} of ${evaluation.applicable} rules applicable to this transaction.`}</p>
      {evaluation.status !== 'Complete' && <p className={styles.ruleNotice}>{evaluation.status === 'NotEvaluated' ? (vi ? 'Chưa có quy tắc áp dụng cho giao dịch này. Cần đội triển khai kiểm tra cấu hình.' : 'No rules apply to this transaction. Ask the deployment team to check the configuration.') : (vi ? 'Một số quy tắc chưa kiểm tra được do dữ liệu thiếu hoặc không hợp lệ. Kết quả hiện tại chưa đầy đủ.' : 'Some rules could not be checked because data is missing or invalid. The result is incomplete.')}</p>}
      <p className={styles.ruleCaption}>{vi ? 'Dấu hiệu bất thường cần được xác minh. Doanh nghiệp quyết định cách xử lý giao dịch.' : 'Unusual activity needs verification. Your business decides how to handle the transaction.'}</p>
    </div>
    <div>{evaluation.rules.map((rule, index) => <details key={`${rule.id}:${index}`} className={styles.businessRule}><summary><span><strong>{rule.name}</strong><span className={styles.ruleCaption}>{rule.outcome === 'Matched' ? (vi ? 'Phát hiện bất thường' : 'Unusual activity detected') : rule.outcome === 'NotMatched' ? (vi ? 'Không phát hiện bất thường' : 'No unusual activity detected') : (vi ? 'Chưa kiểm tra được' : 'Unable to check')}</span></span><span className={styles.ruleOpenLabel}>{vi ? 'Chi tiết' : 'Details'}</span></summary><div className={styles.businessRuleBody}><ReadableConditions node={rule.conditionGroup} vi={vi} />{rule.outcome === 'Error' && <p className={styles.ruleNotice}>{vi ? 'Cần kiểm tra lại dữ liệu đầu vào cho điều kiện này. Liên hệ đội triển khai để được hỗ trợ.' : 'The input data for this condition needs checking. Contact the deployment team for help.'}</p>}</div></details>)}</div>
    <details className={styles.businessRule}><summary>{vi ? 'Thông tin giao dịch đã kiểm tra' : 'Transaction information checked'}</summary><dl className={styles.evaluationFields}>{Object.entries(evaluation.fields).map(([field, value]) => <div key={field}><dt>{fieldLabel(field, vi)}</dt><dd>{typeof value === 'boolean' ? (value ? (vi ? 'Có' : 'Yes') : (vi ? 'Không' : 'No')) : typeof value === 'number' ? value.toLocaleString(vi ? 'vi-VN' : 'en-US') : String(value)}</dd></div>)}</dl></details>
  </section>;
  return <section>
    {evaluation.ruleSet && <p><strong>{evaluation.ruleSet.name} · v{evaluation.ruleSet.version}.0</strong></p>}
    <p><RiskLevelBadge riskLevel={evaluation.result} /> · {evaluation.matched}/{evaluation.evaluated} {vi ? 'rule đã đánh giá khớp' : 'evaluated rules matched'}</p>
    <p>{evaluation.evaluated}/{evaluation.applicable} {vi ? 'rule áp dụng đã đánh giá' : 'applicable rules evaluated'} · {evaluation.failed} {vi ? 'lỗi' : 'errors'} · {evaluation.status === 'Complete' ? (vi ? 'Hoàn tất' : 'Complete') : evaluation.status === 'Incomplete' ? (vi ? 'Chưa hoàn tất' : 'Incomplete') : (vi ? 'Không có rule áp dụng' : 'No applicable rules')}</p>
    <p className={styles.muted}>{vi ? 'Kết quả phát hiện không phải kết luận gian lận. Doanh nghiệp xem xét và quyết định.' : 'Detection is not a fraud verdict. The enterprise reviews and decides.'}</p>
    <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>{vi ? 'Rule / Phiên bản' : 'Rule / Version'}</th><th>{vi ? 'Kết quả' : 'Outcome'}</th><th>{vi ? 'Điều kiện tại thời điểm chạy' : 'Condition snapshot'}</th></tr></thead><tbody>
      {evaluation.rules.map((rule, index) => <tr key={`${rule.id}:${index}`}><td>{rule.name} · {rule.version}</td><td>{rule.outcome === 'Matched' ? (vi ? 'Khớp' : 'Matched') : rule.outcome === 'NotMatched' ? (vi ? 'Không khớp' : 'Not matched') : (vi ? 'Không đánh giá được' : 'Evaluation error')}{rule.error && <p role="note">{rule.error}</p>}</td><td><details className={styles.sandboxAdvanced}><summary>{vi ? 'Xem điều kiện' : 'View conditions'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(rule.conditionGroup, null, 2)}</pre></details></td></tr>)}
    </tbody></table></div>
    <details><summary>{vi ? 'Dữ liệu sử dụng khi đánh giá' : 'Evaluation input'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(evaluation.fields, null, 2)}</pre></details>
  </section>;
}
