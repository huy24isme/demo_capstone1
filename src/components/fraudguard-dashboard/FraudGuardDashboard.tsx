"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type {
  FraudGuardFilters,
  PaginationState,
  RuleTemplate,
  SecondaryView,
  SortState,
  TableTab,
  TransactionRisk,
  ProjectItem,
  AuditLogEntry,
  UserProfile,
} from "./types";
import { Sidebar } from "./Sidebar";
import { ProductHeader } from "./ProductHeader";
import { DashboardToolbar } from "./DashboardToolbar";
import { StatCard } from "./StatCard";
import { Panel } from "./Panel";
import { TransactionRiskTable } from "./TransactionRiskTable";
import { TransactionRiskTrend } from "./TransactionRiskTrend";
import { RiskDistributionChart } from "./RiskDistributionChart";
import { AlertCaseDrawer } from "./AlertCaseDrawer";
import { AlertsView } from "./AlertsView";
import { CasesView } from "./CasesView";
import { RulesView } from "./RulesView";
import { ProjectsView } from "./ProjectsView";
import { ReportsView } from "./ReportsView";
import { AuditTrailView } from "./AuditTrailView";
import { RoleNoticeBanner } from "./RoleNoticeBanner";
import { PlatformHealthView } from "./PlatformHealthView";
import { initialProjects } from "../../data/fraudguard-projects";
import { initialAuditLogs } from "../../data/fraudguard-audit-logs";
import { DEMO_USERS, getRolePermissions } from "../../data/fraudguard-roles";
import { ToastProvider } from "./ToastProvider";
import { OnboardingView } from "./OnboardingView";
import { RuleTestingView } from "./RuleTestingView";
import styles from "./SecurityDashboard.module.css";

interface FraudGuardDashboardProps {
  initialTransactions: TransactionRisk[];
  initialRules: RuleTemplate[];
  initialProjects?: ProjectItem[];
  initialAuditLogs?: AuditLogEntry[];
}

const initialFilters: FraudGuardFilters = {
  query: "",
  projectId: "all",
  transactionType: "all",
  riskLevel: "all",
  scoringSource: "all",
  caseStatus: "all",
  range: 30,
};

const VIEW_TITLES: Record<SecondaryView, string> = {
  "risk-overview": "Risk Overview",
  "recent-alerts": "Recent Alerts",
  "active-cases": "Case Queue",
  "my-cases": "My Cases (Hồ sơ được giao)",
  "rule-templates": "Rule Templates",
  "rule-testing": "Rule Testing Sandbox",
  onboarding: "Enterprise Onboarding & Handover",
  projects: "Projects & Integrations",
  reports: "Reports & Performance",
  "audit-trail": "Security Audit Trail",
  "platform-health": "Platform Health & Tenants",
};

export function FraudGuardDashboard({
  initialTransactions,
  initialRules,
  initialProjects: defaultProjects = initialProjects,
  initialAuditLogs: defaultAuditLogs = initialAuditLogs,
}: FraudGuardDashboardProps) {
  // Data state (mutable for case management)
  const [transactions, setTransactions] = useState(initialTransactions);
  const [rules, setRules] = useState(initialRules);

  // RBAC state (defaults to SME Admin: DEMO_USERS[1])
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[1]);
  const permissions = useMemo(
    () => getRolePermissions(currentUser.role),
    [currentUser.role],
  );

  const handleSwitchUser = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === "Platform Admin") {
      setActiveNavItem("platform-health");
    } else if (user.role === "Investigator") {
      setActiveNavItem("active-cases");
    } else if (user.role === "Operation") {
      setActiveNavItem("active-cases");
    } else if (user.role === "Viewer") {
      setActiveNavItem("risk-overview");
    } else if (user.role === "SME Admin") {
      setActiveNavItem("risk-overview");
    }
  }, []);

  // Filter state
  const [filters, setFilters] = useState(initialFilters);
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  // Navigation state
  const [activeNavItem, setActiveNavItem] = useState<SecondaryView>("risk-overview");

  // Collapsible Sidebar state (persisted to localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fg_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("fg_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleSidebar]);

  // Global Theme state (dark / light)
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  // Table state
  const [activeTab, setActiveTab] = useState<TableTab>("all");
  const [sort, setSort] = useState<SortState>({
    field: "riskScore",
    direction: "desc",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });

  // Dynamic Tenant Risk Threshold (τ_k) for Binary Anomaly (TAR-TAD-R Module M8)
  const [tenantThreshold, setTenantThreshold] = useState<number>(75);

  // Drawer state
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRisk | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Date range filtering + search + filters
  const visibleTransactions = useMemo(() => {
    const now = new Date("2026-09-17T16:00:00Z");
    const cutoff = new Date(
      now.getTime() - filters.range * 24 * 60 * 60 * 1000,
    );

    return transactions.filter((transaction) => {
      const processedDate = new Date(transaction.processedAt);
      if (processedDate < cutoff) return false;

      const searchTarget = [
        transaction.transactionReference,
        transaction.entityReference,
        transaction.projectName,
        transaction.transactionType,
      ]
        .join(" ")
        .toLowerCase();

      const matchesRisk =
        filters.riskLevel === "all" ||
        (filters.riskLevel === "Anomaly"
          ? transaction.riskScore >= tenantThreshold
          : filters.riskLevel === "Normal"
            ? transaction.riskScore < tenantThreshold
            : transaction.riskLevel === filters.riskLevel);

      return (
        (!deferredQuery || searchTarget.includes(deferredQuery)) &&
        (filters.projectId === "all" ||
          transaction.projectId === filters.projectId) &&
        (filters.transactionType === "all" ||
          transaction.transactionType === filters.transactionType) &&
        matchesRisk &&
        (filters.scoringSource === "all" ||
          transaction.scoringSource === filters.scoringSource) &&
        (filters.caseStatus === "all" ||
          transaction.caseStatus === filters.caseStatus)
      );
    });
  }, [deferredQuery, filters, transactions, tenantThreshold]);

  // KPIs from filtered data
  const metrics = useMemo(() => {
    const anomalies = visibleTransactions.filter(
      (transaction) => transaction.riskScore >= tenantThreshold,
    );

    return {
      analyzed: visibleTransactions.length,
      highRisk: anomalies.length,
      normals: visibleTransactions.length - anomalies.length,
      openAlerts: visibleTransactions.filter(
        (transaction) => transaction.alertId && !transaction.caseId,
      ).length,
      activeCases: visibleTransactions.filter(
        (transaction) =>
          transaction.caseStatus === "Open" ||
          transaction.caseStatus === "Assigned" ||
          transaction.caseStatus === "Investigating" ||
          transaction.caseStatus === "Reported",
      ).length,
    };
  }, [visibleTransactions, tenantThreshold]);

  // Dynamic project/type options
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions]);

  const transactionTypes = useMemo(() => {
    return [...new Set(transactions.map((t) => t.transactionType))];
  }, [transactions]);

  // Drawer handlers
  const handleReview = useCallback((transaction: TransactionRisk) => {
    setSelectedTransaction(transaction);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleUpdateTransaction = useCallback(
    (updated: TransactionRisk) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setSelectedTransaction(updated);
    },
    [],
  );

  // Reset pagination when filters change
  const handleFiltersChange: typeof setFilters = useCallback(
    (action) => {
      setFilters(action);
      setPagination((prev) => ({ ...prev, page: 1 }));
    },
    [],
  );

  const handleNavItemChange = useCallback((id: string) => {
    setActiveNavItem(id as SecondaryView);
  }, []);

  /* ── Render active view ── */
  const renderView = () => {
    switch (activeNavItem) {
      case "onboarding":
        return <OnboardingView onActivateWorkspace={() => setActiveNavItem("projects")} />;
      case "rule-testing":
        return (
          <RuleTestingView
            rules={rules}
            onPublishRule={(publishedRule) => {
              setRules((prev) => [publishedRule, ...prev.filter((r) => r.id !== publishedRule.id)]);
            }}
          />
        );
      case "recent-alerts":
        return (
          <AlertsView
            transactions={transactions}
            onReview={handleReview}
          />
        );
      case "active-cases":
      case "my-cases":
        return (
          <CasesView
            transactions={transactions}
            onUpdateTransaction={handleUpdateTransaction}
            onReview={handleReview}
            permissions={permissions}
            currentRole={currentUser.role}
            currentUserName={currentUser.name}
            threshold={tenantThreshold}
          />
        );
      case "rule-templates":
        return (
          <RulesView
            initialRules={rules}
            permissions={permissions}
            onNavigateToTesting={() => setActiveNavItem("rule-testing")}
          />
        );
      case "projects":
        return (
          <ProjectsView
            initialProjects={defaultProjects}
            permissions={permissions}
            threshold={tenantThreshold}
            onThresholdChange={setTenantThreshold}
          />
        );
      case "reports":
        return (
          <ReportsView
            transactions={transactions}
            threshold={tenantThreshold}
            currentUser={currentUser}
            permissions={permissions}
            onReview={handleReview}
          />
        );
      case "audit-trail":
        return <AuditTrailView initialLogs={defaultAuditLogs} />;
      case "platform-health":
        return <PlatformHealthView />;
      case "risk-overview":
      default:
        return (
          <>
            <div className={styles.pageHeading}>
              <div>
                <h1>Transaction risk overview</h1>
                <p>
                  Theo dõi risk score, cảnh báo và case cần nhân sự kiểm tra.
                </p>
              </div>
            </div>

            <DashboardToolbar
              filters={filters}
              projects={projects}
              transactionTypes={transactionTypes}
              onChange={handleFiltersChange}
              visibleTransactions={visibleTransactions}
            />

            {currentUser.role === "Operation" || currentUser.role === "Investigator" ? (
              <section className={styles.metricsGrid}>
                <StatCard
                  label="Pending alerts"
                  value={metrics.openAlerts}
                  description="Cảnh báo cần thẩm định ngay"
                  tone={metrics.openAlerts > 0 ? "critical" : undefined}
                />
                <StatCard
                  label="Active cases"
                  value={metrics.activeCases}
                  description="Hồ sơ đang xử lý trong luồng"
                  tone="warning"
                />
                <StatCard
                  label="Bất thường (Anomaly)"
                  value={metrics.highRisk}
                  description={`Score ≥ ${tenantThreshold} (Đỏ)`}
                  tone="critical"
                />
                <StatCard
                  label="Giao dịch an toàn (Normal)"
                  value={metrics.normals}
                  description={`Score < ${tenantThreshold} (Xanh)`}
                />
              </section>
            ) : currentUser.role === "Viewer" ? (
              <section className={styles.metricsGrid}>
                <StatCard
                  label="Total analyzed"
                  value={metrics.analyzed}
                  description={`Trong ${filters.range} ngày gần nhất`}
                />
                <StatCard
                  label="Anomaly ratio"
                  value={
                    metrics.analyzed > 0
                      ? `${Math.round((metrics.highRisk / metrics.analyzed) * 100)}%`
                      : "0%"
                  }
                  description={`${metrics.highRisk} giao dịch bất thường`}
                  tone="critical"
                />
                <StatCard
                  label="False alarm rate"
                  value={
                    visibleTransactions.filter((t) => t.caseStatus).length > 0
                      ? `${Math.round(
                          (visibleTransactions.filter((t) => t.caseStatus === "False Alarm")
                            .length /
                            visibleTransactions.filter((t) => t.caseStatus).length) *
                            100,
                        )}%`
                      : "0%"
                  }
                  description="Tỷ lệ báo động nhầm sau điều tra"
                />
                <StatCard
                  label="Resolved audits"
                  value={
                    visibleTransactions.filter(
                      (t) =>
                        t.caseStatus === "Resolved" ||
                        t.caseStatus === "Confirmed Fraud",
                    ).length
                  }
                  description="Hồ sơ đã có kết luận"
                  tone="warning"
                />
              </section>
            ) : (
              <section className={styles.metricsGrid}>
                <StatCard
                  label="Transactions analyzed"
                  value={metrics.analyzed}
                  description={`Trong ${filters.range} ngày gần nhất`}
                />
                <StatCard
                  label="Bất thường (Anomaly)"
                  value={metrics.highRisk}
                  description={`Score ≥ ${tenantThreshold} (Vượt ngưỡng)`}
                  tone="critical"
                />
                <StatCard
                  label="Bình thường (Normal)"
                  value={metrics.normals}
                  description={`Score < ${tenantThreshold} (An toàn)`}
                />
                <StatCard
                  label="Active cases"
                  value={metrics.activeCases}
                  description="Đang xử lý trong luồng"
                  tone="warning"
                />
              </section>
            )}

            <section className={styles.chartGrid}>
              <Panel
                title="Risk trend"
                description={`Xu hướng Bất thường (Đỏ) vs Bình thường (Xanh) theo thời gian`}
              >
                <TransactionRiskTrend
                  transactions={visibleTransactions}
                  threshold={tenantThreshold}
                />
              </Panel>
              <Panel
                title="Risk distribution"
                description={`Tỷ lệ phân bố theo ngưỡng nhị phân (τ = ${tenantThreshold})`}
              >
                <RiskDistributionChart
                  transactions={visibleTransactions}
                  threshold={tenantThreshold}
                />
              </Panel>
            </section>

            <TransactionRiskTable
              transactions={visibleTransactions}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              sort={sort}
              onSortChange={setSort}
              pagination={pagination}
              onPaginationChange={setPagination}
              onReview={handleReview}
              threshold={tenantThreshold}
            />
          </>
        );
    }
  };

  const currentViewTitle = useMemo(() => {
    if (currentUser.role === "Investigator") {
      if (activeNavItem === "reports") return "Investigation History (Lịch sử thụ lý)";
      if (activeNavItem === "active-cases" || activeNavItem === "my-cases")
        return "My Cases (Hồ sơ được giao)";
    }
    return VIEW_TITLES[activeNavItem] || "Risk Overview";
  }, [currentUser.role, activeNavItem]);

  return (
    <ToastProvider>
      <div className={styles.root} data-theme={theme}>
        <Sidebar
          activeItem={activeNavItem}
          onItemChange={handleNavItemChange}
          currentUser={currentUser}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <div className={styles.workspace}>
          <ProductHeader
            activeViewTitle={currentViewTitle}
            theme={theme}
            onToggleTheme={toggleTheme}
            currentUser={currentUser}
            onSwitchUser={handleSwitchUser}
            onNavigate={setActiveNavItem}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
          />
          <main className={styles.main}>
            <RoleNoticeBanner
              currentUser={currentUser}
              activeNavItem={activeNavItem}
            />
            {renderView()}
          </main>
        </div>

        <AlertCaseDrawer
          transaction={selectedTransaction}
          open={drawerOpen}
          onClose={handleCloseDrawer}
          onUpdateTransaction={handleUpdateTransaction}
          permissions={permissions}
          currentRole={currentUser.role}
          currentUserName={currentUser.name}
          threshold={tenantThreshold}
        />
      </div>
    </ToastProvider>
  );
}
