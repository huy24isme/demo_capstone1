"use client";

import type { LucideIcon } from "lucide-react";
import {
  Shield,
  Activity,
  AlertTriangle,
  Briefcase,
  Sliders,
  FolderKanban,
  FileText,
  History,
  LogOut,
} from "lucide-react";
import styles from "./SecurityDashboard.module.css";
import type { SecondaryView, UserProfile } from "./types";

interface NavItem {
  label: string;
  id: SecondaryView | "projects" | "reports" | "audit-trail";
  icon: LucideIcon;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "MONITORING",
    items: [
      { id: "risk-overview", label: "Risk Overview", icon: Activity },
      { id: "recent-alerts", label: "Recent Alerts", icon: AlertTriangle },
      { id: "active-cases", label: "Active Cases", icon: Briefcase },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { id: "rule-templates", label: "Rule Templates", icon: Sliders },
      { id: "projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { id: "reports", label: "Reports", icon: FileText },
      { id: "audit-trail", label: "Audit Trail", icon: History },
    ],
  },
];

interface SidebarProps {
  activeItem: string;
  onItemChange: (id: string) => void;
  currentUser?: UserProfile;
}

export function Sidebar({ activeItem, onItemChange, currentUser }: SidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      {/* Brand Logo Header */}
      <div className={styles.sidebarLogo}>
        <div className={styles.logoIcon}>
          <Shield size={20} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>FraudGuard</span>
          <span className={styles.logoSub}>SME Security</span>
        </div>
        <span className={styles.planBadge}>Pro</span>
      </div>

      {/* Nav Menu */}
      <nav className={styles.sidebarNav}>
        {sections.map((section) => (
          <div key={section.title} className={styles.navSection}>
            <div className={styles.sectionLabel}>{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  className={`${styles.secondaryNavButton} ${
                    isActive ? styles.secondaryNavButtonActive : ""
                  }`}
                  onClick={() => onItemChange(item.id)}
                  type="button"
                >
                  <span className={styles.navItemIcon}>
                    <Icon size={16} />
                  </span>
                  <span className={styles.navItemText}>{item.label}</span>
                  {item.badge && (
                    <span className={styles.navItemBadge}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Health & User Profile */}
      <div className={styles.sidebarBottom}>
        <div className={styles.systemStatus}>
          <div className={styles.statusItem}>
            <span className={styles.statusDot} />
            <span>Systems operational</span>
          </div>
          <div className={styles.statusSub}>AI & Rule Engine: Online</div>
        </div>

        <a
          href="/login"
          className={styles.sidebarUserCard}
          title={`Tài khoản: ${currentUser ? currentUser.name : "SME Admin"} (Click để Đăng xuất / Login)`}
        >
          <div
            className={styles.avatar}
            style={currentUser ? { backgroundColor: currentUser.avatarBg } : undefined}
          >
            {currentUser ? currentUser.avatarLetter : "A"}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{currentUser ? currentUser.name : "SME Admin"}</span>
            <span className={styles.userRole}>{currentUser ? currentUser.role : "Security Lead"}</span>
          </div>
          <LogOut size={14} className={styles.logoutIcon} />
        </a>
      </div>
    </aside>
  );
}
