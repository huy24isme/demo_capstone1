"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Shield, FileSpreadsheet } from "lucide-react";
import type { UserProfile } from "./types";
import { DEMO_USERS } from "../../data/fraudguard-roles";
import { PermissionMatrixModal } from "./PermissionMatrixModal";
import styles from "./SecurityDashboard.module.css";

interface RoleSwitcherProps {
  currentUser: UserProfile;
  onSwitchUser: (user: UserProfile) => void;
}

export function RoleSwitcher({ currentUser, onSwitchUser }: RoleSwitcherProps) {
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
      case "SME Admin":
        return styles.roleBadgeSMEAdmin;
      case "Risk Staff":
        return styles.roleBadgeRiskStaff;
      case "Viewer":
        return styles.roleBadgeViewer;
      case "Platform Admin":
        return styles.roleBadgePlatformAdmin;
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
          title={`Đang đăng nhập: ${currentUser.name} (${currentUser.role}) — Click để đổi vai trò`}
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
              <div className={styles.roleMenuTitle}>Chọn vai trò người dùng (RBAC)</div>
            </div>

            {DEMO_USERS.map((u) => {
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
                    <p className={styles.roleItemDesc}>{u.description}</p>
                  </div>

                  {isSelected && (
                    <Check size={14} color="var(--security-blue)" style={{ flexShrink: 0, marginTop: 4 }} />
                  )}
                </button>
              );
            })}

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
                <span>Xem bảng phân quyền (Matrix)</span>
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
