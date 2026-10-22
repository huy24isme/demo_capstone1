"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, FileSpreadsheet } from "lucide-react";
import type { UserProfile } from "./types";

import type { Enterprise } from '@/data/fraudguard-enterprises';
import { PermissionMatrixModal } from "./PermissionMatrixModal";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface RoleSwitcherProps {
  users: UserProfile[];
  enterprises: Enterprise[];
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
}

export function RoleSwitcher({ users, currentUser, onSwitchUser, enterprises }: RoleSwitcherProps) {
  const { t, language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "Platform Admin":
        return styles.roleBadgePlatformAdmin;
      case "Implementation Staff":
        return styles.roleBadgeOperation;
      case "SME Admin":
        return styles.roleBadgeSMEAdmin;
      case "Operator":
        return styles.roleBadgeOperation;
      case "Investigator":
        return styles.roleBadgeInvestigator;
      case "Risk Staff":
        return styles.roleBadgeRiskStaff;
      case "Viewer":
        return styles.roleBadgeViewer;
      default:
        return "";
    }
  };

  const handleSelect = (user: UserProfile) => {
    onSwitchUser(user);
    setMenuOpen(false);
  };

  return (
    <>
      <div className={styles.roleSwitcherContainer} ref={containerRef}>
        <button
          className={styles.roleTriggerBtn}
          onClick={() => setMenuOpen((prev) => !prev)}
          type="button"
          title={t.roleSwitcher.triggerTitle
            .replace("{name}", currentUser.name)
            .replace("{role}", currentUser.role)}
          aria-expanded={menuOpen}
        >
          <div
            className={styles.roleUserAvatar}
            style={{ backgroundColor: currentUser.avatarBg }}
          >
            {currentUser.avatarLetter}
          </div>

          <div className={styles.roleUserMeta}>
            <span className={styles.roleUserName}>{currentUser.name}</span>
          </div>

          <span className={`${styles.roleBadge} ${getRoleBadgeClass(currentUser.role)}`}>
            {currentUser.role}
          </span>

          <ChevronDown size={13} style={{ opacity: 0.7 }} />
        </button>

        {menuOpen && (
          <div className={styles.roleDropdownMenu} role="menu">
            <div className={styles.roleMenuHeader}>
              <div className={styles.roleMenuTitle}>
                {t.roleSwitcher.menuTitle}
              </div>
            </div>

            <div className={styles.roleMenuList}>
            {users.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  className={`${styles.roleMenuItem} ${
                    isSelected ? styles.roleMenuItemActive : ""
                  }`}
                  onClick={() => handleSelect(u)}
                  type="button"
                  role="menuitem"
                >
                  <div
                    className={styles.roleUserAvatar}
                    style={{ backgroundColor: u.avatarBg, width: 26, height: 26 }}
                  >
                    {u.avatarLetter}
                  </div>

                  <div className={styles.roleItemContent}>
                    <div className={styles.roleItemHeader}>
                      <span className={styles.roleItemName}>{u.name}</span>
                      <span className={`${styles.roleBadge} ${getRoleBadgeClass(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                    <p className={styles.roleAccountScope}>{u.role === 'Platform Admin' ? (language === 'vi' ? 'Toàn nền tảng' : 'Platform-wide') : enterprises.filter(e => u.role === 'Implementation Staff' ? e.deploymentStaffId === u.id : e.id === u.enterpriseId).map(e => e.name).join(' · ') || (language === 'vi' ? 'Chưa được phân công doanh nghiệp' : 'No enterprise assigned')}</p>
                    <p className={styles.roleItemDesc}>{u.description}</p>
                  </div>

                  {isSelected && (
                    <Check
                      size={14}
                      color="var(--security-blue)"
                      style={{ flexShrink: 0, marginTop: 4 }}
                    />
                  )}
                </button>
              );
            })}
            </div>

            <div className={styles.roleMenuFooter}>
              <button
                className={styles.roleMatrixLinkBtn}
                onClick={() => {
                  setMenuOpen(false);
                  setMatrixOpen(true);
                }}
                type="button"
              >
                <FileSpreadsheet size={13} />
                <span>{t.roleSwitcher.matrixBtn}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <PermissionMatrixModal
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
      />
    </>
  );
}
