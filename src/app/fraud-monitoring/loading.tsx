import styles from '@/components/fraudguard-dashboard/SecurityDashboard.module.css';

export default function Loading() {
  return <main className={styles.routeState} aria-busy="true" aria-label="Đang tải FraudGuard">
    <h1>FraudGuard</h1><p role="status">Đang tải dữ liệu… / Loading data…</p>
    <div className={styles.loadingGrid} aria-hidden="true">{[1, 2, 3, 4].map(id => <div key={id} className={`skeleton ${styles.loadingBlock}`} />)}</div>
    <div aria-hidden="true" className={`skeleton ${styles.loadingTable}`} />
  </main>;
}
