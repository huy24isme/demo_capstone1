import type { ReactNode } from "react";
import styles from "./SecurityDashboard.module.css";

interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  description,
  action,
  className = "",
  children,
}: PanelProps) {
  return (
    <article className={`${styles.panel} ${className}`}>
      <header className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          {description ? <p className={styles.muted}>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </article>
  );
}
