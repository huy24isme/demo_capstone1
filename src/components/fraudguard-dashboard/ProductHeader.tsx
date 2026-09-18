import { Settings } from "lucide-react";
import styles from "./SecurityDashboard.module.css";

const tabs = ["Overview", "Transactions", "Alerts", "Cases", "Rules"];

interface ProductHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ProductHeader({ activeTab, onTabChange }: ProductHeaderProps) {
  return (
    <header className={styles.productHeader}>
      <span className={styles.productName}>FraudGuard</span>

      <nav className={styles.topNav} aria-label="Product navigation">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.topNavButton} ${
              activeTab === tab ? styles.topNavButtonActive : ""
            }`}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      <button
        className={`${styles.railButton} ${styles.settingsButton}`}
        title="Settings"
        aria-label="Settings"
        type="button"
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
