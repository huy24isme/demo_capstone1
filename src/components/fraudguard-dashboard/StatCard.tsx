import styles from "./SecurityDashboard.module.css";

interface StatCardProps {
  label: string;
  value: number | string;
  description: string;
  tone?: "default" | "critical" | "warning";
}

export function StatCard({
  label,
  value,
  description,
  tone = "default",
}: StatCardProps) {
  const toneClass =
    tone === "critical"
      ? styles.statCritical
      : tone === "warning"
        ? styles.statWarning
        : "";

  return (
    <article className={`${styles.statCard} ${toneClass}`}>
      <div className={styles.statLabel}>{label}</div>
      <strong className={styles.statValue}>{value}</strong>
      <span className={styles.statDescription}>{description}</span>
    </article>
  );
}
