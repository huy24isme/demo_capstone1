"use client";

import { Settings, Sun, Moon } from "lucide-react";
import type { UserProfile } from "./types";
import { RoleSwitcher } from "./RoleSwitcher";
import styles from "./SecurityDashboard.module.css";

interface ProductHeaderProps {
  activeViewTitle?: string;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  currentUser?: UserProfile;
  onSwitchUser?: (user: UserProfile) => void;
}

export function ProductHeader({
  activeViewTitle = "Risk Overview",
  theme = "dark",
  onToggleTheme,
  currentUser,
  onSwitchUser,
}: ProductHeaderProps) {
  return (
    <header className={styles.productHeader}>
      <div className={styles.headerLeft}>
        <div className={styles.headerBreadcrumb}>
          <span className={styles.breadcrumbMuted}>FraudGuard</span>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{activeViewTitle}</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Role Switcher (RBAC) */}
        {currentUser && onSwitchUser && (
          <RoleSwitcher currentUser={currentUser} onSwitchUser={onSwitchUser} />
        )}

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


