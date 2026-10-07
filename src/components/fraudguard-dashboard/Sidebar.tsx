"use client";

import { useMemo } from "react";
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
  Server,
  ChevronLeft,
  ChevronRight,
  TestTube2,
} from "lucide-react";
import styles from "./SecurityDashboard.module.css";
import type { SecondaryView, UserProfile } from "./types";

import { useLanguage } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";

interface NavItem {
  label: string;
  id: SecondaryView;
  icon: LucideIcon;
  badge?: string | number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getSectionsForRole(role?: string, t?: TranslationKey): NavSection[] {
  const nav = t?.nav;
  if (role === "Platform Admin") {
    return [
      {
        title: nav?.sections.platformSystem || "PLATFORM SYSTEM",
        items: [
          { id: "platform-health", label: nav?.items.platformHealth || "Platform Health & Tenants", icon: Server },
          { id: "onboarding", label: nav?.items.onboarding || "Onboarding & Handover", icon: FolderKanban },
          { id: "audit-trail", label: nav?.items.auditTrail || "Global Audit Trail", icon: History },
        ],
      },
      {
        title: nav?.sections.ruleLifecycle || "RULE LIFECYCLE & SANDBOX",
        items: [
          { id: "rule-testing", label: nav?.items.ruleTesting || "Rule Testing Sandbox", icon: TestTube2 },
          { id: "rule-templates", label: nav?.items.ruleTemplates || "Published Rules", icon: Sliders },
        ],
      },
    ];
  }

  if (role === "Operation") {
    return [
      {
        title: nav?.sections.operationQueue || "OPERATION QUEUE",
        items: [
          { id: "risk-overview", label: nav?.items.riskOverview || "Risk Dashboard", icon: Activity },
          { id: "recent-alerts", label: nav?.items.recentAlerts || "Alert Queue", icon: AlertTriangle },
          { id: "active-cases", label: nav?.items.activeCases || "Case Queue", icon: Briefcase },
        ],
      },
      {
        title: nav?.sections.analyticsAudit || "ANALYTICS & AUDIT",
        items: [
          { id: "reports", label: nav?.items.reports || "Reports & Performance", icon: FileText },
          { id: "audit-trail", label: nav?.items.auditTrail || "Audit Trail", icon: History },
        ],
      },
    ];
  }

  if (role === "Investigator") {
    return [
      {
        title: nav?.sections.investigationPortal || "INVESTIGATION PORTAL",
        items: [
          { id: "active-cases", label: nav?.items.myCases || "My Cases", icon: Briefcase },
          { id: "reports", label: nav?.items.investigationHistory || "Investigation History", icon: FileText },
        ],
      },
    ];
  }

  if (role === "Viewer") {
    return [
      {
        title: nav?.sections.monitoring || "MONITORING (READ-ONLY)",
        items: [
          { id: "risk-overview", label: nav?.items.riskOverview || "Risk Overview", icon: Activity },
          { id: "recent-alerts", label: nav?.items.recentAlerts || "Recent Alerts", icon: AlertTriangle },
          { id: "active-cases", label: nav?.items.activeCases || "Active Cases", icon: Briefcase },
        ],
      },
      {
        title: nav?.sections.analyticsAudit || "ANALYTICS & COMPLIANCE",
        items: [
          { id: "reports", label: nav?.items.reports || "Reports & Metrics", icon: FileText },
          { id: "audit-trail", label: nav?.items.auditTrail || "Audit Trail", icon: History },
        ],
      },
    ];
  }

  // Default: SME Admin
  return [
    {
      title: nav?.sections.monitoring || "MONITORING",
      items: [
        { id: "risk-overview", label: nav?.items.riskOverview || "Executive Overview", icon: Activity },
        { id: "recent-alerts", label: nav?.items.recentAlerts || "Recent Alerts", icon: AlertTriangle },
        { id: "active-cases", label: nav?.items.activeCases || "Active Cases", icon: Briefcase },
      ],
    },
    {
      title: nav?.sections.configuration || "CONFIGURATION",
      items: [
        { id: "rule-templates", label: nav?.items.ruleTemplates || "Rule Templates", icon: Sliders },
        { id: "projects", label: nav?.items.projects || "Projects & Integrations", icon: FolderKanban },
      ],
    },
    {
      title: nav?.sections.analyticsAudit || "ANALYTICS & COMPLIANCE",
      items: [
        { id: "reports", label: nav?.items.reports || "Reports & Performance", icon: FileText },
        { id: "audit-trail", label: nav?.items.auditTrail || "Audit Trail", icon: History },
      ],
    },
  ];
}

interface SidebarProps {
  activeItem: string;
  onItemChange: (id: string) => void;
  currentUser?: UserProfile;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeItem,
  onItemChange,
  currentUser,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t, language } = useLanguage();
  const navSections = useMemo(
    () => getSectionsForRole(currentUser?.role, t),
    [currentUser?.role, t],
  );

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}
      aria-label="Main navigation"
    >
      {/* Brand Logo & Collapse Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarLogo} title="FraudGuard Platform">
          <div className={styles.logoIcon}>
            <Shield size={20} />
          </div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>{t.brandName}</span>
            <span className={styles.logoSub}>
              {currentUser?.role === "Platform Admin"
                ? t.roles.platformAdmin
                : currentUser?.role === "Viewer"
                ? t.roles.viewer
                : currentUser?.role === "Operation"
                ? t.roles.operation
                : currentUser?.role === "Investigator"
                ? t.roles.investigator
                : t.roles.smeAdmin}
            </span>
          </div>
          <span className={styles.planBadge}>
            {currentUser?.role === "Platform Admin"
              ? t.roles.superBadge
              : currentUser?.role === "Viewer"
              ? t.roles.auditBadge
              : currentUser?.role === "Operation"
              ? t.roles.opsBadge
              : currentUser?.role === "Investigator"
              ? t.roles.fieldBadge
              : t.roles.smeBadge}
          </span>
        </div>

        {onToggleCollapse && (
          <button
            className={styles.sidebarCollapseBtn}
            onClick={onToggleCollapse}
            title={
              isCollapsed
                ? language === "vi"
                  ? "Mở rộng sidebar (Ctrl+B)"
                  : "Expand sidebar (Ctrl+B)"
                : language === "vi"
                  ? "Thu gọn sidebar (Ctrl+B)"
                  : "Collapse sidebar (Ctrl+B)"
            }
            aria-label={
              isCollapsed
                ? language === "vi"
                  ? "Mở rộng thanh bên"
                  : "Expand sidebar"
                : language === "vi"
                  ? "Thu gọn thanh bên"
                  : "Collapse sidebar"
            }
            type="button"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className={styles.sidebarNav}>
        {navSections.map((section) => (
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
                  title={item.label}
                  aria-label={item.label}
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
        <div
          className={styles.systemStatus}
          title={language === "vi" ? "AI & Rule Engine: Trực tuyến" : "AI & Rule Engine: Online"}
        >
          <div className={styles.statusItem}>
            <span className={styles.statusDot} />
            <span>{t.nav.systemOperational}</span>
          </div>
          <div className={styles.statusSub}>{t.nav.engineOnline}</div>
        </div>

        <a
          href="/login"
          className={styles.sidebarUserCard}
          title={
            language === "vi"
              ? `Tài khoản: ${currentUser ? currentUser.name : "SME Admin"} (${currentUser ? currentUser.role : "Security Lead"}) - Bấm để Đăng xuất`
              : `Account: ${currentUser ? currentUser.name : "SME Admin"} (${currentUser ? currentUser.role : "Security Lead"}) - Click to Log out`
          }
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
