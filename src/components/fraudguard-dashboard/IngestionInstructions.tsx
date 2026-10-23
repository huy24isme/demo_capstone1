"use client";
import { useState } from 'react';
import type { DataField } from '@/lib/ingestion-validation';
import { useLanguage } from './i18n/LanguageContext';
import styles from './SecurityDashboard.module.css';

export function IngestionInstructions({ projectId, schema = [] }: { projectId: string; schema?: DataField[] }) {
  const { language } = useLanguage(); const vi = language === 'vi';
  const [channel, setChannel] = useState<'rest' | 'webhook'>('rest');
  const [message, setMessage] = useState('');
  const payload = { ref: 'TX-001', projectId, transactionType: 'payment', fields: Object.fromEntries(schema.map(field => [field.name, field.type === 'number' ? 0 : field.type === 'boolean' ? false : '<' + field.name + '>'])) };
  const request = `POST <API_BASE_URL>/${channel === 'rest' ? 'transactions' : 'webhooks/transactions'}\nContent-Type: application/json\nX-API-Key: <API_KEY>\n\n${JSON.stringify(payload, null, 2)}`;
  return <section className={styles.panel}>
    <h2>{vi ? 'Gửi giao dịch vào FraudGuard' : 'Send transactions to FraudGuard'}</h2>
    <p>{vi ? 'Hệ thống doanh nghiệp chủ động gửi dữ liệu. Chọn cách gửi để xem cấu trúc yêu cầu dành cho người phụ trách tích hợp.' : 'Your enterprise system sends the data. Choose a method to view the request structure for your integration team.'}</p>
    <label className={styles.drawerLabel}>{vi ? 'Cách gửi' : 'Method'}<select className={styles.control} value={channel} onChange={e => { setChannel(e.target.value as typeof channel); setMessage(''); }}><option value="rest">REST API</option><option value="webhook">Webhook</option></select></label>
    <p>{vi ? (channel === 'rest' ? 'Gửi giao dịch khi hệ thống doanh nghiệp gọi API.' : 'Gửi sự kiện giao dịch khi phát sinh tại hệ thống doanh nghiệp. Đây là dữ liệu đi vào FraudGuard, khác với địa chỉ nhận cảnh báo bên dưới.') : (channel === 'rest' ? 'Send transactions through API requests from your system.' : 'Send transaction events from your system. This is inbound data, separate from the alert destination below.')}</p>
    <details className={styles.workflowDetails}><summary>{vi ? 'Mẫu yêu cầu tích hợp' : 'Integration request template'}</summary><p>{vi ? 'Thay địa chỉ dịch vụ và khóa truy cập do đội tích hợp cung cấp. Giá trị trong mẫu chỉ minh họa cấu trúc; dùng dữ liệu theo đặc tả đã thống nhất.' : 'Replace the service address and access key supplied by your integration team. Example values illustrate the structure; use data agreed in your specification.'}</p><pre>{request}</pre><button className={styles.button} onClick={async () => { try { await navigator.clipboard.writeText(request); setMessage(vi ? 'Đã sao chép mẫu yêu cầu.' : 'Request template copied.'); } catch { setMessage(vi ? 'Không sao chép được. Bạn có thể chọn và sao chép nội dung mẫu.' : 'Unable to copy. Select and copy the template text.'); } }}>{vi ? 'Sao chép mẫu yêu cầu' : 'Copy request template'}</button>{message && <p role="status">{message}</p>}</details>
  </section>;
}
