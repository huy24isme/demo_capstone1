"use client";
import styles from '@/components/fraudguard-dashboard/SecurityDashboard.module.css';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={styles.routeState}>
    <h1>Không thể tải FraudGuard</h1>
    <p role="alert">Có lỗi khi hiển thị trang. Hãy thử lại. / Unable to display this page. Please retry.</p>
    <button className={styles.btnPrimary} onClick={reset}>Thử lại / Retry</button>
  </main>;
}
