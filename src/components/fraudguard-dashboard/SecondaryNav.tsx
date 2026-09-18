import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Sliders,
  FolderKanban,
  FileText,
  History,
} from "lucide-react";
import styles from "./SecurityDashboard.module.css";

interface NavItem {
  label: string;
  id: string;
  icon: LucideIcon;
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

interface SecondaryNavProps {
  activeItem: string;
  onItemChange: (id: string) => void;
}

export function SecondaryNav({ activeItem, onItemChange }: SecondaryNavProps) {
  return (
    <aside className={styles.secondaryNav} aria-label="Secondary navigation">
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
                  <Icon size={15} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}

      <div className={styles.systemStatus}>
        <div>
          <span className={styles.statusDot} />
          All systems operational
        </div>
        <div>AI Service: Online</div>
        <div>Queue: Healthy</div>
      </div>
    </aside>
  );
}
