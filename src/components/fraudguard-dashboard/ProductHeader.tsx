"use client";

import { Sun, Moon } from "lucide-react";
import type { SecondaryView, UserProfile } from "./types";
import { RoleSwitcher } from "./RoleSwitcher";
import { UserProfileMenu } from "./UserProfileMenu";
import styles from "./SecurityDashboard.module.css";

interface ProductHeaderProps {
  activeViewTitle?: string;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  currentUser?: UserProfile;
  onSwitchUser?: (user: UserProfile) => void;
  onNavigate?: (view: SecondaryView) => void;
}

export function ProductHeader({
  activeViewTitle = "Risk Overview",
  theme = "dark",
  onToggleTheme,
  currentUser,
  onSwitchUser,
  onNavigate,
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

        {/* User Profile & Preferences Dropdown Menu */}
        <UserProfileMenu currentUser={currentUser} onNavigate={onNavigate} />
      </div>
    </header>
  );
}


