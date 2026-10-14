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
import { canUpdateCase } from "@/lib/case-workflow";
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
import { PlatformHealthView } from "./PlatformHealthView";
import { initialProjects } from "../../data/fraudguard-projects";
import { initialAuditLogs } from "../../data/fraudguard-audit-logs";
import { DEMO_USERS, getRolePermissions } from "../../data/fraudguard-roles";
import { ToastProvider } from "./ToastProvider";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
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

function FraudGuardDashboardContent({
  initialTransactions,
  initialRules,
  initialProjects: defaultProjects = initialProjects,
  initialAuditLogs: defaultAuditLogs = initialAuditLogs,
}: FraudGuardDashboardProps) {
  const { t, language } = useLanguage();
  // Data state (mutable for case management)
  const [transactions, setTransactions] = useState(initialTransactions);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [rules, setRules] = useState(initialRules);
  const [projects, setProjects] = useState(defaultProjects);
  const [restored, setRestored] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fraudguard-demo-workspace-v2') || 'null');
      if (saved && Array.isArray(saved.rules) && saved.rules.every((r: RuleTemplate) => r.id && r.conditionGroup?.children && r.appliesTo?.projects)) {
        setRules(saved.rules);
        if (Array.isArray(saved.transactions) && saved.transactions.every((tx: TransactionRisk) => tx.id && tx.processedAt && Array.isArray(tx.triggeredRules))) setTransactions(saved.transactions);
        if (Array.isArray(saved.auditLogs) && saved.auditLogs.every((log: AuditLogEntry) => log.id && log.actor && log.action)) setAuditLogs(saved.auditLogs);
        if (Array.isArray(saved.projects) && saved.projects.every((p: ProjectItem) => p.id && p.quota)) setProjects(saved.projects);
      }
    } catch { setStorageError(true); }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem('fraudguard-demo-workspace-v2', JSON.stringify({ rules, projects, transactions, auditLogs })); }
    catch { setStorageError(true); }
  }, [rules, projects, transactions, auditLogs, restored]);

  // RBAC state (defaults to SME Admin: DEMO_USERS[1])
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[1]);
  const permissions = useMemo(
    () => getRolePermissions(currentUser.role),
    [currentUser.role],
  );

  const handleSwitchUser = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    setDrawerOpen(false);
    setSelectedTransaction(null);
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

  const recordAudit = (action: AuditLogEntry['action'], target: string, details: string) => {
    setAuditLogs(logs => [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor: { name: currentUser.name, email: currentUser.email, role: currentUser.role }, action, target, details, ipAddress: 'Demo' }, ...logs]);
  };
  const changeRules: React.Dispatch<React.SetStateAction<RuleTemplate[]>> = action => {
    if (!permissions.canManageRules) return;
    const next = typeof action === 'function' ? action(rules) : action;
    for (const rule of next) { const old = rules.find(r => r.id === rule.id); if (JSON.stringify(old) !== JSON.stringify(rule)) recordAudit(old ? 'RULE_UPDATED' : 'RULE_CREATED', rule.id, JSON.stringify({ version: rule.version, status: rule.status, draft: !!rule.draft, enabled: rule.enabled })); }
    for (const old of rules) if (!next.some(r => r.id === old.id)) recordAudit('RULE_DELETED', old.id, old.name);
    setRules(next);
  };
  const changeProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>> = action => {
    if (!permissions.canManageProjects) return;
    const next = typeof action === 'function' ? action(projects) : action;
    for (const project of next) if (JSON.stringify(projects.find(p => p.id === project.id)) !== JSON.stringify(project)) recordAudit('PROJECT_UPDATED', project.id, project.name);
    setProjects(next);
  };

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
    field: "processedAt",
    direction: "desc",
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
  });


  // Drawer state
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionRisk | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Date range filtering + search + filters
  const visibleTransactions = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - filters.range * 24 * 60 * 60 * 1000,
    );

    return transactions.filter((transaction) => {
      const processedDate = new Date(transaction.processedAt);
      if (!Number.isFinite(processedDate.getTime()) || processedDate < cutoff || processedDate > now) return false;

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
        (filters.riskLevel === "Abnormal"
          ? transaction.riskLevel === "Abnormal"
          : filters.riskLevel === "Undetermined"
            ? transaction.riskLevel === "Undetermined"
          : filters.riskLevel === "Normal"
            ? transaction.riskLevel === "Normal"
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
  }, [deferredQuery, filters, transactions]);

  // KPIs from filtered data
  const metrics = useMemo(() => {
    const anomalies = visibleTransactions.filter(
      (transaction) => transaction.riskLevel === "Abnormal",
    );

    return {
      analyzed: visibleTransactions.length,
      highRisk: anomalies.length,
      normals: visibleTransactions.filter(transaction => transaction.riskLevel === "Normal").length,
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
  }, [visibleTransactions]);

  // Dynamic project/type options
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(p => map.set(p.id, p.name));
    transactions.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [transactions, projects]);

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
      if (currentUser.role === 'Viewer' || currentUser.role === 'Platform Admin') return;
      const previous = transactions.find(tx => tx.id === updated.id);
      if (!previous || !canUpdateCase(previous, updated, currentUser)) return;
      if (currentUser.role === 'Investigator' && (previous.assignedInvestigator !== currentUser.name || !['Assigned', 'Investigating'].includes(previous.caseStatus || '') || !['Investigating', 'Reported'].includes(updated.caseStatus || ''))) return;
      setAuditLogs(logs => [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor: { name: currentUser.name, email: currentUser.email, role: currentUser.role }, action: 'CASE_STATUS_UPDATED', target: updated.caseId || updated.id, ipAddress: 'Demo', details: JSON.stringify({ before: previous.caseStatus, after: updated.caseStatus, report: updated.investigationReport, decision: updated.caseDecision }) }, ...logs]);
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setSelectedTransaction(updated);
    },
    [currentUser, transactions],
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
            projects={projects}
            rules={rules}
            onAddDemoTransactions={items => {
              if (!permissions.canAccessRuleTesting) return;
              setTransactions(previous => [...items.filter(item => !previous.some(old => old.id === item.id)).map(item => ({ ...item, projectName: projects.find(project => project.id === item.projectId)?.name ?? item.projectName })), ...previous]);
              recordAudit('ALERT_REVIEWED', 'Sandbox demo', 'Added rule-set evaluation results: ' + items.length);
            }}
            onPublishRule={(publishedRule) => {
              changeRules((prev) => [publishedRule, ...prev.filter((r) => r.id !== publishedRule.id)]);
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

          />
        );
      case "rule-templates":
        return (
          <RulesView
            transactions={transactions}
            onRulesChange={changeRules}
            initialRules={rules}
            permissions={permissions}
            onNavigateToTesting={() => setActiveNavItem("rule-testing")}
          />
        );
      case "projects":
        return (
          <ProjectsView
            initialProjects={projects}
            onProjectsChange={changeProjects}
            permissions={permissions}

          />
        );
      case "reports":
        return (
          <ReportsView
            transactions={transactions}

            currentUser={currentUser}
            permissions={permissions}
            onReview={handleReview}
          />
        );
      case "audit-trail":
        return <AuditTrailView initialLogs={auditLogs} />;
      case "platform-health":
        return <PlatformHealthView />;
      case "risk-overview":
      default:
        return (
          <>
            <div className={styles.pageHeading}>
              <div>
                <h1>{t.riskOverview.title}</h1>
                <p>{t.riskOverview.subtitle}</p>
              </div>
            </div>

            <DashboardToolbar
              filters={filters}
              projects={projectOptions}
              transactionTypes={transactionTypes}
              onChange={handleFiltersChange}
              visibleTransactions={visibleTransactions}
            />

            {currentUser.role === "Operation" || currentUser.role === "Investigator" ? (
              <section className={styles.metricsGrid}>
                <StatCard
                  label={t.riskOverview.kpis.pendingAlerts}
                  value={metrics.openAlerts}
                  description={t.riskOverview.kpis.pendingAlertsDesc}
                  tone={metrics.openAlerts > 0 ? "critical" : undefined}
                />
                <StatCard
                  label={t.riskOverview.kpis.activeCases}
                  value={metrics.activeCases}
                  description={t.riskOverview.kpis.activeCasesDesc}
                  tone="warning"
                />
                <StatCard
                  label={t.riskOverview.kpis.anomaly}
                  value={metrics.highRisk}
                  description={t.riskOverview.kpis.anomalyDescExceeded}
                  tone="critical"
                />
                <StatCard
                  label={t.riskOverview.kpis.normal}
                  value={metrics.normals}
                  description={t.riskOverview.kpis.normalDescSafe}
                />
              </section>
            ) : currentUser.role === "Viewer" ? (
              <section className={styles.metricsGrid}>
                <StatCard
                  label={t.riskOverview.kpis.totalAnalyzed}
                  value={metrics.analyzed}
                  description={t.riskOverview.kpis.inLastDays.replace("{range}", String(filters.range))}
                />
                <StatCard
                  label={t.riskOverview.kpis.anomalyRatio}
                  value={
                    metrics.analyzed > 0
                      ? `${Math.round((metrics.highRisk / metrics.analyzed) * 100)}%`
                      : "0%"
                  }
                  description={`${metrics.highRisk} ${t.riskOverview.kpis.anomalyRatioDesc}`}
                  tone="critical"
                />
                <StatCard
                  label={t.riskOverview.kpis.falseAlarmRate}
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
                  description={t.riskOverview.kpis.falseAlarmRateDesc}
                />
                <StatCard
                  label={t.riskOverview.kpis.resolvedAudits}
                  value={
                    visibleTransactions.filter(
                      (t) =>
                        t.caseStatus === "Resolved" ||
                        t.caseStatus === "Confirmed Fraud",
                    ).length
                  }
                  description={t.riskOverview.kpis.resolvedAuditsDesc}
                  tone="warning"
                />
              </section>
            ) : (
              <section className={styles.metricsGrid}>
                <StatCard
                  label={t.riskOverview.kpis.totalAnalyzed}
                  value={metrics.analyzed}
                  description={t.riskOverview.kpis.inLastDays.replace("{range}", String(filters.range))}
                />
                <StatCard
                  label={t.riskOverview.kpis.anomaly}
                  value={metrics.highRisk}
                  description={t.riskOverview.kpis.anomalyDescExceeded}
                  tone="critical"
                />
                <StatCard
                  label={t.riskOverview.kpis.normal}
                  value={metrics.normals}
                  description={t.riskOverview.kpis.normalDescSafe}
                />
                <StatCard
                  label={t.riskOverview.kpis.activeCases}
                  value={metrics.activeCases}
                  description={t.riskOverview.kpis.activeCasesDesc}
                  tone="warning"
                />
              </section>
            )}

            <section className={styles.chartGrid}>
              <Panel
                title={t.riskOverview.charts.trendTitle}
                description={t.riskOverview.charts.trendDesc}
              >
                <TransactionRiskTrend
                  transactions={visibleTransactions}

                />
              </Panel>
              <Panel
                title={t.riskOverview.charts.distTitle}
                description={t.riskOverview.charts.distDesc}
              >
                <RiskDistributionChart
                  transactions={visibleTransactions}

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

            />
          </>
        );
    }
  };

  const currentViewTitle = useMemo(() => {
    if (currentUser.role === "Investigator") {
      if (activeNavItem === "reports") return t.nav.items.investigationHistory;
      if (activeNavItem === "active-cases" || activeNavItem === "my-cases")
        return t.nav.items.myCases;
    }
    const navTitleMap: Record<SecondaryView, string> = {
      "risk-overview": t.nav.items.riskOverview,
      "recent-alerts": t.nav.items.recentAlerts,
      "active-cases": t.nav.items.activeCases,
      "my-cases": t.nav.items.myCases,
      "rule-templates": t.nav.items.ruleTemplates,
      "rule-testing": t.nav.items.ruleTesting,
      onboarding: t.nav.items.onboarding,
      projects: t.nav.items.projects,
      reports: t.nav.items.reports,
      "audit-trail": t.nav.items.auditTrail,
      "platform-health": t.nav.items.platformHealth,
    };
    return navTitleMap[activeNavItem] || t.nav.items.riskOverview;
  }, [currentUser.role, activeNavItem, t]);

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
          />
          <main className={styles.main}>
            <p className={styles.muted} role="status">{language === 'vi' ? 'Môi trường demo: dữ liệu, phân quyền và API key chưa kết nối backend.' : 'Demo: data, permissions and API keys are not connected to a backend.'}{storageError && (language === 'vi' ? ' Không thể lưu thay đổi trên trình duyệt.' : ' Browser storage is unavailable.')}</p>
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

        />
      </div>
    </ToastProvider>
  );
}

export function FraudGuardDashboard(props: FraudGuardDashboardProps) {
  return (
    <LanguageProvider>
      <FraudGuardDashboardContent {...props} />
    </LanguageProvider>
  );
}
