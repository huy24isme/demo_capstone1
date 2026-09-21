"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  Key,
  FileText,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Check,
  Sliders,
} from "lucide-react";
import type { SecondaryView, UserProfile } from "./types";
import { PermissionMatrixModal } from "./PermissionMatrixModal";
import styles from "./SecurityDashboard.module.css";

interface UserProfileMenuProps {
  currentUser?: UserProfile;
  onNavigate?: (view: SecondaryView) => void;
}

export function UserProfileMenu({ currentUser, onNavigate }: UserProfileMenuProps) {
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
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
          title={`Tài khoản: ${currentUser?.name || "Người dùng"} (${currentUser?.role || "User"}) — Tùy chọn & Đăng xuất`}
        >
          <div
            className={styles.userMenuAvatar}
            style={{ backgroundColor: currentUser?.avatarBg || "#7c3aed" }}
          >
            {currentUser?.avatarLetter || "U"}
            <span className={styles.avatarOnlineDot} title="Trực tuyến" />
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
                <div className={styles.userDropdownName}>{currentUser?.name || "Người dùng"}</div>
                <div className={styles.userDropdownEmail}>{currentUser?.email || "user@fraudguard.io"}</div>
                <div className={styles.userDropdownRoleRow}>
                  <span className={`${styles.roleBadge} ${roleBadgeClass()}`}>
                    {currentUser?.role || "User"}
                  </span>
                  <span className={styles.userStatusPill}>
                    <span className={styles.statusDotGreen} /> Online
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Console Preferences (Cài đặt hiển thị & cảnh báo) */}
            <div className={styles.userDropdownSection}>
              <div className={styles.userDropdownSectionTitle}>Tùy chọn hiển thị & Cảnh báo</div>

              {/* Audio Alert Toggle */}
              <div className={styles.userPreferenceItem}>
                <div className={styles.userPrefIcon}>
                  {audioAlert ? <Volume2 size={15} color="#78c9ac" /> : <VolumeX size={15} color="var(--security-muted)" />}
                </div>
                <div className={styles.userPrefContent}>
                  <div className={styles.userPrefLabel}>Âm thanh cảnh báo gian lận</div>
                  <div className={styles.userPrefSub}>Báo chuông khi có giao dịch Critical</div>
                </div>
                <button
                  type="button"
                  className={`${styles.userToggleSwitch} ${audioAlert ? styles.userToggleSwitchActive : ""}`}
                  onClick={toggleAudio}
                  aria-label="Bật/Tắt âm thanh cảnh báo"
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
                  <div className={styles.userPrefLabel}>Tự động làm mới dữ liệu</div>
                  <div className={styles.userPrefSub}>Tần suất polling giao dịch mới</div>
                </div>
                <div className={styles.refreshIntervalGroup}>
                  {(["off", "15s", "30s"] as const).map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      className={`${styles.refreshIntervalBtn} ${refreshInterval === interval ? styles.refreshIntervalBtnActive : ""}`}
                      onClick={() => setRefreshInterval(interval)}
                    >
                      {interval === "off" ? "Tắt" : interval}
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
                  <div className={styles.userPrefLabel}>Múi giờ hệ thống</div>
                  <div className={styles.userPrefSub}>UTC+07:00 (Hà Nội, BKK)</div>
                </div>
                <span className={styles.timezoneBadge}>GMT+7</span>
              </div>
            </div>

            {/* Section 2: Quick Links */}
            <div className={styles.userDropdownSection}>
              <div className={styles.userDropdownSectionTitle}>Lối tắt quản trị</div>

              {onNavigate && currentUser?.role !== "Viewer" && currentUser?.role !== "Risk Staff" && (
                <button
                  type="button"
                  className={styles.userDropdownLinkBtn}
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate("projects");
                  }}
                >
                  <Key size={14} />
                  <span>Quản lý API Keys & Webhook</span>
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
                <span>Xem ma trận phân quyền (RBAC)</span>
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
                  <span>Nhật ký bảo mật (Audit Trail)</span>
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
                <span>Đăng xuất khỏi phiên làm việc</span>
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
