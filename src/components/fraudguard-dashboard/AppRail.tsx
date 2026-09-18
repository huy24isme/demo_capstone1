import { Shield, BarChart3, AlertTriangle, Briefcase, Sliders, FileText, Settings } from "lucide-react";
import styles from "./SecurityDashboard.module.css";

const navItems = [
  { id: "dashboard", icon: BarChart3, label: "Risk Overview" },
  { id: "alerts", icon: AlertTriangle, label: "Recent Alerts" },
  { id: "cases", icon: Briefcase, label: "Active Cases" },
  { id: "rules", icon: Sliders, label: "Rule Templates" },
  { id: "reports", icon: FileText, label: "Reports" },
  { id: "settings", icon: Settings, label: "Settings" },
];

interface AppRailProps {
  activeItem: string;
  onNavigate: (id: string) => void;
}

export function AppRail({ activeItem, onNavigate }: AppRailProps) {
  return (
    <nav className={styles.rail} aria-label="Main navigation">
      <div className={styles.railLogo} title="FraudGuard">
        <Shield size={22} />
      </div>

      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.railButton} ${activeItem === item.id ? styles.railButtonActive : ""}`}
          title={item.label}
          aria-label={item.label}
          onClick={() => onNavigate(item.id)}
          type="button"
        >
          <item.icon size={18} />
        </button>
      ))}

      <div className={styles.railBottom}>
        <a href="/login" className={styles.avatar} title="Tài khoản (Click để Đăng xuất / Login)">
          A
        </a>
      </div>
    </nav>
  );
}
