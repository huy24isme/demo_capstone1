import styles from "./SecurityDashboard.module.css";

interface NavItem {
  label: string;
  id: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "MONITORING",
    items: [
      { id: "risk-overview", label: "Risk Overview" },
      { id: "recent-alerts", label: "Recent Alerts" },
      { id: "active-cases", label: "Active Cases" },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { id: "rule-templates", label: "Rule Templates" },
      { id: "projects", label: "Projects" },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { id: "reports", label: "Reports" },
      { id: "audit-trail", label: "Audit Trail" },
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
        <div key={section.title}>
          <div className={styles.sectionLabel}>{section.title}</div>
          {section.items.map((item) => (
            <button
              key={item.id}
              className={`${styles.secondaryNavButton} ${
                activeItem === item.id ? styles.secondaryNavButtonActive : ""
              }`}
              onClick={() => onItemChange(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
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
