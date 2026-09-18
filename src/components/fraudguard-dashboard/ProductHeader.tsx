"use client";

import { Settings, Sun, Moon } from "lucide-react";
import styles from "./SecurityDashboard.module.css";

const tabs = ["Overview", "Alerts", "Cases", "Rules"];

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
      <div className={styles.headerLeft}>
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
      </div>

      <div className={styles.headerRight}>
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            className={styles.themeToggleBtn}
            onClick={onToggleTheme}
            title={theme === "dark" ? "Chuyển sang Light Theme" : "Chuyển sang Dark Theme"}
            aria-label="Toggle Theme"
            type="button"
          >
            {theme === "dark" ? <Sun size={15} color="#eda765" /> : <Moon size={15} color="#7c3aed" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        )}

        <button
          className={styles.control}
          title="Settings"
          aria-label="Settings"
          type="button"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, padding: 0 }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}

