"use client";

import { Sun, Moon, Globe } from "lucide-react";
import type { SecondaryView, UserProfile } from "./types";
import { RoleSwitcher } from "./RoleSwitcher";
import { UserProfileMenu } from "./UserProfileMenu";
import { useLanguage } from "./i18n/LanguageContext";
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
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className={styles.productHeader}>
      <div className={styles.headerLeft}>
        <div className={styles.headerBreadcrumb}>
          <span className={styles.breadcrumbMuted}>{t.brandName}</span>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{activeViewTitle}</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Role Switcher (RBAC) */}
        {currentUser && onSwitchUser && (
          <RoleSwitcher currentUser={currentUser} onSwitchUser={onSwitchUser} />
        )}

        {/* Language Toggle Button */}
        <button
          className={styles.languageToggleBtn}
          onClick={toggleLanguage}
          title={t.switchLanguage}
          aria-label={t.switchLanguage}
          type="button"
        >
          <Globe size={15} style={{ color: "var(--security-blue)" }} />
          <span>{t.langLabel}</span>
        </button>

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            className={styles.themeToggleBtn}
            onClick={onToggleTheme}
            title={
              theme === "dark"
                ? language === "vi"
                  ? "Chuyển sang Giao diện Sáng"
                  : "Switch to Light Theme"
                : language === "vi"
                  ? "Chuyển sang Giao diện Tối"
                  : "Switch to Dark Theme"
            }
            aria-label={theme === "dark" ? t.themeLight : t.themeDark}
            type="button"
          >
            {theme === "dark" ? <Sun size={15} color="#eda765" /> : <Moon size={15} color="#7c3aed" />}
            <span>{theme === "dark" ? t.themeLight : t.themeDark}</span>
          </button>
        )}

        {/* User Profile & Preferences Dropdown Menu */}
        <UserProfileMenu currentUser={currentUser} onNavigate={onNavigate} />
      </div>
    </header>
  );
}


