"use client";

import { Sun, Moon, Globe, Menu, X } from "lucide-react";
import { useState } from 'react';
import type { Enterprise } from '@/data/fraudguard-enterprises';
import { getSectionsForRole } from './Sidebar';
import { useDialogFocus } from './useDialogFocus';
import type { SecondaryView, UserProfile } from "./types";
import { RoleSwitcher } from "./RoleSwitcher";
import { UserProfileMenu } from "./UserProfileMenu";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface ProductHeaderProps {
  users: UserProfile[];
  enterprises: Enterprise[];
  activeViewTitle?: string;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  currentUser?: UserProfile;
  onSwitchUser?: (user: UserProfile) => void;
  onNavigate?: (view: SecondaryView) => void;
}

export function ProductHeader({
  users,
  enterprises,
  activeViewTitle = "Risk Overview",
  theme = "dark",
  onToggleTheme,
  currentUser,
  onSwitchUser,
  onNavigate,
}: ProductHeaderProps) {
  const { language, toggleLanguage, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDialogFocus(menuOpen, () => setMenuOpen(false));

  return (
    <>
    <header className={styles.productHeader}>
      <div className={styles.headerLeft}>
        <button className={`${styles.button} ${styles.mobileMenuButton}`} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={language === 'vi' ? 'Mở menu điều hướng' : 'Open navigation'}><Menu size={18} /></button>
        <div className={styles.headerBreadcrumb}>
          <span className={styles.breadcrumbMuted}>{t.brandName}</span>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{activeViewTitle}</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Role Switcher (RBAC) */}
        {currentUser && onSwitchUser && (
          <RoleSwitcher users={users} currentUser={currentUser} onSwitchUser={onSwitchUser} enterprises={enterprises} />
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
      {menuOpen && <div className={styles.mobileNavigationOverlay} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <div id="mobile-navigation" ref={menuRef} role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Điều hướng' : 'Navigation'} tabIndex={-1} className={styles.mobileNavigation}>
          <div className={styles.panelHeader}><strong>FraudGuard</strong><button className={styles.button} onClick={() => setMenuOpen(false)} aria-label={language === 'vi' ? 'Đóng menu' : 'Close menu'}><X size={18} /></button></div>
          <nav>{getSectionsForRole(currentUser?.role, t).map(section => <section key={section.title}><p className={styles.sectionLabel}>{section.title}</p>{section.items.map(item => <button key={item.id} className={styles.secondaryNavButton} aria-current={activeViewTitle === item.label ? 'page' : undefined} onClick={() => { onNavigate?.(item.id); setMenuOpen(false); }}><item.icon size={18} />{item.label}</button>)}</section>)}</nav>
        </div>
      </div>}
    </>
  );
}


