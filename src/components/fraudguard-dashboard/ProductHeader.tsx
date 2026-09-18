"use client";

import { Settings, Sun, Moon } from "lucide-react";
import styles from "./SecurityDashboard.module.css";

const tabs = ["Overview", "Transactions", "Alerts", "Cases", "Rules"];

interface ProductHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
}

export function ProductHeader({
  activeTab,
  onTabChange,
  theme = "dark",
  onToggleTheme,
}: ProductHeaderProps) {
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

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            className={styles.railButton}
            onClick={onToggleTheme}
            title={theme === "dark" ? "Chuyển sang Light Theme" : "Chuyển sang Dark Theme"}
            aria-label="Toggle Theme"
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 6,
              border: "1px solid var(--security-border)",
              background: "var(--security-control)",
              color: theme === "dark" ? "#eda765" : "#7c3aed",
            }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        )}

        <button
          className={`${styles.railButton} ${styles.settingsButton}`}
          title="Settings"
          aria-label="Settings"
          type="button"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
