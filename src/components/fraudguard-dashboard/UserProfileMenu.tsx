"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  Key,
  FileText,
  LogOut,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import type { SecondaryView, UserProfile } from "./types";
import { PermissionMatrixModal } from "./PermissionMatrixModal";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface UserProfileMenuProps {
  currentUser?: UserProfile;
  onNavigate?: (view: SecondaryView) => void;
}

export function UserProfileMenu({ currentUser, onNavigate }: UserProfileMenuProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [audioAlert, setAudioAlert] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<"off" | "15s" | "30s">("30s");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
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

  // Audio test cue using Web Audio API
  const toggleAudio = () => {
    const nextVal = !audioAlert;
    setAudioAlert(nextVal);
    if (nextVal && typeof window !== "undefined") {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch {
        // AudioContext blocked or unsupported
      }
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    router.push("/login");
  };

  const roleBadgeClass = () => {
    switch (currentUser?.role) {
      case "Platform Admin":
        return styles.roleBadgePlatformAdmin;
      case "SME Admin":
        return styles.roleBadgeSMEAdmin;
      case "Operation":
        return styles.roleBadgeOperation;
      case "Investigator":
        return styles.roleBadgeInvestigator;
      case "Viewer":
        return styles.roleBadgeViewer;
      default:
        return "";
    }
  };

  return (
    <>
      <div className={styles.userMenuContainer} ref={containerRef}>
        {/* Trigger Button */}
        <button
          className={styles.userMenuTrigger}
          onClick={() => setMenuOpen((prev) => !prev)}
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          title={t.userMenu.title}
        >
          <div
            className={styles.userMenuAvatar}
            style={{ backgroundColor: currentUser?.avatarBg || "#7c3aed" }}
          >
            {currentUser?.avatarLetter || "U"}
            <span
              className={styles.avatarOnlineDot}
              title={t.userMenu.online}
            />
          </div>

          <ChevronDown
            size={13}
            className={`${styles.userMenuChevron} ${menuOpen ? styles.userMenuChevronRotated : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className={styles.userDropdownMenu} role="menu">
            {/* Header: User Profile Info */}
            <div className={styles.userDropdownHeader}>
              <div
                className={styles.userDropdownAvatarLarge}
                style={{ backgroundColor: currentUser?.avatarBg || "#7c3aed" }}
              >
                {currentUser?.avatarLetter || "U"}
              </div>

              <div className={styles.userDropdownMeta}>
                <div className={styles.userDropdownName}>
                  {currentUser?.name || "User"}
                </div>
                <div className={styles.userDropdownEmail}>
                  {currentUser?.email || "user@fraudguard.io"}
                </div>
                <div className={styles.userDropdownRoleRow}>
                  <span className={`${styles.roleBadge} ${roleBadgeClass()}`}>
                    {currentUser?.role || "User"}
                  </span>
                  <span className={styles.userStatusPill}>
                    <span className={styles.statusDotGreen} /> {t.userMenu.online}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Console Preferences */}
            <div className={styles.userDropdownSection}>
              <div className={styles.userDropdownSectionTitle}>
                {t.userMenu.title}
              </div>

              {/* Audio Alert Toggle */}
              <div className={styles.userPreferenceItem}>
                <div className={styles.userPrefIcon}>
                  {audioAlert ? (
                    <Volume2 size={15} color="#78c9ac" />
                  ) : (
                    <VolumeX size={15} color="var(--security-muted)" />
                  )}
                </div>
                <div className={styles.userPrefContent}>
                  <div className={styles.userPrefLabel}>
                    {t.userMenu.audioAlert}
                  </div>
                  <div className={styles.userPrefSub}>
                    {t.userMenu.audioAlertSub}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.userToggleSwitch} ${audioAlert ? styles.userToggleSwitchActive : ""}`}
                  onClick={toggleAudio}
                  aria-label={t.userMenu.audioToggleAria}
                >
                  <span className={styles.userToggleKnob} />
                </button>
              </div>

              {/* Auto Refresh Selector */}
              <div className={styles.userPreferenceItem}>
                <div className={styles.userPrefIcon}>
                  <RefreshCw size={15} color="var(--security-blue)" />
                </div>
                <div className={styles.userPrefContent}>
                  <div className={styles.userPrefLabel}>
                    {t.userMenu.autoRefresh}
                  </div>
                  <div className={styles.userPrefSub}>
                    {t.userMenu.autoRefreshSub}
                  </div>
                </div>
                <div className={styles.refreshIntervalGroup}>
                  {(["off", "15s", "30s"] as const).map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      className={`${styles.refreshIntervalBtn} ${refreshInterval === interval ? styles.refreshIntervalBtnActive : ""}`}
                      onClick={() => setRefreshInterval(interval)}
                    >
                      {interval === "off" ? t.userMenu.refreshOff : interval}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone Info */}
              <div className={styles.userPreferenceItem}>
                <div className={styles.userPrefIcon}>
                  <Clock size={15} color="var(--security-purple)" />
                </div>
                <div className={styles.userPrefContent}>
                  <div className={styles.userPrefLabel}>
                    {t.userMenu.timezone}
                  </div>
                  <div className={styles.userPrefSub}>
                    {t.userMenu.timezoneSub}
                  </div>
                </div>
                <span className={styles.timezoneBadge}>GMT+7</span>
              </div>
            </div>

            {/* Section 2: Quick Links */}
            <div className={styles.userDropdownSection}>
              <div className={styles.userDropdownSectionTitle}>
                {t.userMenu.shortcuts}
              </div>

              {onNavigate &&
                (currentUser?.role === "SME Admin" ||
                  currentUser?.role === "Platform Admin") && (
                  <button
                    type="button"
                    className={styles.userDropdownLinkBtn}
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigate("projects");
                    }}
                  >
                    <Key size={14} />
                    <span>{t.userMenu.apiKeys}</span>
                  </button>
                )}

              <button
                type="button"
                className={styles.userDropdownLinkBtn}
                onClick={() => {
                  setMenuOpen(false);
                  setMatrixOpen(true);
                }}
              >
                <ShieldCheck size={14} />
                <span>{t.userMenu.rbac}</span>
              </button>

              {onNavigate && (
                <button
                  type="button"
                  className={styles.userDropdownLinkBtn}
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate("audit-trail");
                  }}
                >
                  <FileText size={14} />
                  <span>{t.userMenu.auditTrail}</span>
                </button>
              )}
            </div>

            {/* Section 3: Logout */}
            <div className={styles.userDropdownFooter}>
              <button
                type="button"
                className={styles.userLogoutBtn}
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>{t.userMenu.logout}</span>
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
