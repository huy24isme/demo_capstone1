import type { ConditionGroupNode, RuleConditionNode } from './types';
import styles from './SecurityDashboard.module.css';

const fields: Record<string, [string, string]> = {
  amount: ['Số tiền giao dịch', 'Transaction amount'], currency: ['Đơn vị tiền tệ', 'Currency'], channel: ['Kênh giao dịch', 'Transaction channel'],
  'device.is_new': ['Thiết bị mới', 'New device'], 'device.is_blacklisted': ['Thiết bị thuộc danh sách cảnh báo', 'Device on watchlist'],
  'velocity.failed_tx.24h': ['Số giao dịch thất bại trong 24 giờ', 'Failed transactions in 24 hours'],
  'velocity.tx_count.1h': ['Số giao dịch trong 1 giờ', 'Transactions in 1 hour'], 'velocity.tx_count.24h': ['Số giao dịch trong 24 giờ', 'Transactions in 24 hours'],
  'velocity.password_reset.1h': ['Số lần đặt lại mật khẩu trong 1 giờ', 'Password resets in 1 hour'], 'velocity.unique_ips.1h': ['Số địa chỉ mạng khác nhau trong 1 giờ', 'Distinct network addresses in 1 hour'],
  'identity.address_reuse_count': ['Số lần sử dụng lại địa chỉ', 'Address reuse count'],
  'geo.distance_km': ['Khoảng cách giữa hai giao dịch (km)', 'Distance between transactions (km)'], 'geo.is_cross_border': ['Giao dịch xuyên biên giới', 'Cross-border transaction'],
  time_since_last_tx_min: ['Thời gian từ giao dịch trước (phút)', 'Minutes since previous transaction'], time_since_deposit_min: ['Thời gian từ lần nạp tiền (phút)', 'Minutes since deposit'],
  'entity.age_days': ['Tuổi tài khoản (ngày)', 'Account age (days)'], 'entity.avg_amount': ['Số tiền giao dịch trung bình', 'Average transaction amount'],
  'entity.dormant_days': ['Số ngày tài khoản không hoạt động', 'Inactive account days'], 'time.hour': ['Giờ giao dịch', 'Transaction hour'], 'time.is_weekend': ['Giao dịch vào cuối tuần', 'Weekend transaction'],
};
const operators: Record<string, [string, string]> = { '>': ['lớn hơn', 'greater than'], '>=': ['từ', 'at least'], '<': ['nhỏ hơn', 'less than'], '<=': ['không quá', 'at most'], '==': ['là', 'is'], '!=': ['khác', 'is not'], in: ['thuộc một trong các giá trị', 'is one of'], not_in: ['không thuộc các giá trị', 'is not one of'], between: ['nằm trong khoảng', 'is between'] };
export function fieldLabel(field: string, vi: boolean) { return fields[field]?.[vi ? 0 : 1] ?? field; }
export function transactionLabel(value: string, vi: boolean) {
  const labels: Record<string, string> = { '*': 'Tất cả loại giao dịch', payment: 'Thanh toán', transfer: 'Chuyển tiền', withdrawal: 'Rút tiền', refund: 'Hoàn tiền', deposit: 'Nạp tiền', subscription: 'Thanh toán định kỳ' };
  return vi ? labels[value] ?? value : value === '*' ? 'All transaction types' : value;
}
export function ReadableConditions({ node, vi }: { node: ConditionGroupNode | RuleConditionNode; vi: boolean }) {
  if (node.type === 'condition') {
    const value = typeof node.value === 'boolean' ? (node.value ? (vi ? 'Có' : 'Yes') : (vi ? 'Không' : 'No')) : typeof node.value === 'number' ? node.value.toLocaleString(vi ? 'vi-VN' : 'en-US') : node.value;
    return <span>{fieldLabel(node.field, vi)} <strong>{operators[node.operator]?.[vi ? 0 : 1] ?? node.operator} {String(value)}</strong></span>;
  }
  return <div className={styles.readableConditions}><p>{node.logic === 'AND' ? (vi ? 'Đồng thời thỏa mãn tất cả điều kiện:' : 'All conditions must be met:') : (vi ? 'Thỏa mãn ít nhất một điều kiện:' : 'At least one condition must be met:')}</p><ul>{node.children.map(child => <li key={child.id}><ReadableConditions node={child} vi={vi} /></li>)}</ul></div>;
}
