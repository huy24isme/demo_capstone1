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
import { demoEnterprises, visibleEnterprises, canDeploy, type Enterprise } from '@/data/fraudguard-enterprises';
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
import { RuleSetsView } from './RuleSetsView';
import { activeSetRules, migrateProjectSets, canChangeEnterpriseSets, type LegacyRuleSet, type ManagedRuleSet } from '@/lib/rule-set-lifecycle';
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
  const [enterprises, setEnterprises] = useState<Enterprise[]>(demoEnterprises);
  const [legacyUnassigned, setLegacyUnassigned] = useState<LegacyRuleSet[]>([]);
  const [deploymentEnterpriseId, setDeploymentEnterpriseId] = useState('');
  const [ruleSets, setRuleSets] = useState<ManagedRuleSet[]>([]);
  const [projects, setProjects] = useState(defaultProjects);
  const [restored, setRestored] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const current = localStorage.getItem('fraudguard-demo-workspace-v3');
      const saved = JSON.parse(current || localStorage.getItem('fraudguard-demo-workspace-v2') || 'null');
      if (saved && Array.isArray(saved.rules) && saved.rules.every((r: RuleTemplate) => r.id && r.conditionGroup?.children && r.appliesTo?.projects)) {
        setRules(saved.rules);
        if (current && Array.isArray(saved.enterprises)) setEnterprises(saved.enterprises);
        if (Array.isArray(saved.ruleSets)) {
          if (current) { setRuleSets(saved.ruleSets); setLegacyUnassigned(saved.legacyUnassigned ?? []); }
          else { const migrated = migrateProjectSets(saved.ruleSets, demoEnterprises); setRuleSets(migrated.sets); setLegacyUnassigned(migrated.unassigned); }
        }
        if (Array.isArray(saved.transactions) && saved.transactions.every((tx: TransactionRisk) => tx.id && tx.processedAt && Array.isArray(tx.triggeredRules))) setTransactions(saved.transactions);
        if (Array.isArray(saved.auditLogs) && saved.auditLogs.every((log: AuditLogEntry) => log.id && log.actor && log.action)) setAuditLogs(saved.auditLogs);
        if (Array.isArray(saved.projects) && saved.projects.every((p: ProjectItem) => p.id && p.quota)) setProjects([...saved.projects, ...defaultProjects.filter(p => !saved.projects.some((old: ProjectItem) => old.id === p.id))]);
      }
    } catch { setStorageError(true); }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { localStorage.setItem('fraudguard-demo-workspace-v3', JSON.stringify({ rules, ruleSets, enterprises, legacyUnassigned, projects, transactions, auditLogs })); }
    catch { setStorageError(true); }
  }, [rules, ruleSets, enterprises, legacyUnassigned, projects, transactions, auditLogs, restored]);

  // RBAC state (defaults to SME Admin: DEMO_USERS[1])
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[1]);
  const permissions = useMemo(
    () => getRolePermissions(currentUser.role),
    [currentUser.role],
  );

  const accessibleEnterprises = visibleEnterprises(currentUser, enterprises);
  const deploymentEnterprise = accessibleEnterprises.find(e => e.id === deploymentEnterpriseId) ?? accessibleEnterprises[0];
  const assignedProjectIds = accessibleEnterprises.flatMap(e => e.projectIds);
  const enterpriseTransactions = useMemo(() => { const ids = enterprises.filter(e => e.id === currentUser.enterpriseId).flatMap(e => e.projectIds); return transactions.filter(tx => ids.includes(tx.projectId)); }, [transactions, enterprises, currentUser.enterpriseId]);
  const scopedRules = rules.filter(r => !r.enterpriseId || r.enterpriseId === deploymentEnterprise?.id).filter(r => r.appliesTo.projects.includes('*') || r.appliesTo.projects.some(id => deploymentEnterprise?.projectIds.includes(id)));
  const handleSwitchUser = useCallback((user: UserProfile) => {
    setCurrentUser(user);
    setDeploymentEnterpriseId('');
    setDrawerOpen(false);
    setSelectedTransaction(null);
    if (user.role === "Platform Admin") {
      setActiveNavItem("platform-health");
    } else if (user.role === "Deployment Staff") {
      setActiveNavItem("rule-sets");
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
    if (!deploymentEnterprise || !canDeploy(currentUser, deploymentEnterprise)) return;
    const next = typeof action === 'function' ? action(scopedRules) : action;
    let merged = [...rules];
    for (const rule of next) {
      const old = scopedRules.find(r => r.id === rule.id);
      if (JSON.stringify(old) === JSON.stringify(rule)) continue;
      const scoped = structuredClone(rule);
      scoped.enterpriseId = deploymentEnterprise.id;
      const bind = (item: RuleTemplate | NonNullable<RuleTemplate['draft']>) => { item.appliesTo.projects = item.appliesTo.projects.includes('*') ? [...deploymentEnterprise.projectIds] : item.appliesTo.projects.filter(p => deploymentEnterprise.projectIds.includes(p)); };
      bind(scoped); if (scoped.draft) bind(scoped.draft);
      if (!scoped.appliesTo.projects.length || scoped.draft && !scoped.draft.appliesTo.projects.length) return;
      // Shared templates are copied into enterprise scope, never overwritten for other staff.
      if (old && !old.enterpriseId) scoped.id = crypto.randomUUID();
      merged = [...merged.filter(r => r.id !== scoped.id), scoped];
      recordAudit(old ? 'RULE_UPDATED' : 'RULE_CREATED', deploymentEnterprise.name, scoped.name);
    }
    for (const old of scopedRules) if (old.enterpriseId === deploymentEnterprise.id && !next.some(r => r.id === old.id)) { merged = merged.filter(r => r.id !== old.id); recordAudit('RULE_DELETED', deploymentEnterprise.name, old.name); }
    setRules(merged);
  };
  const changeProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>> = action => {
    if (!permissions.canManageProjects) return;
    const scopedProjects = projects.filter(p => assignedProjectIds.includes(p.id));
    const requested = typeof action === 'function' ? action(scopedProjects) : action;
    if (requested.some(p => projects.some(old => old.id === p.id) && !assignedProjectIds.includes(p.id))) return;
    const created = requested.filter(p => !projects.some(old => old.id === p.id));
    if (created.length) { if (!deploymentEnterprise || !(canDeploy(currentUser, deploymentEnterprise) || currentUser.role === 'SME Admin' && deploymentEnterprise.id === currentUser.enterpriseId)) return; setEnterprises(prev => prev.map(e => e.id === deploymentEnterprise.id ? { ...e, projectIds: [...e.projectIds, ...created.map(p => p.id)] } : e)); }
    const next = [...projects.filter(p => !assignedProjectIds.includes(p.id)), ...requested];
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

    return enterpriseTransactions.filter((transaction) => {
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
  }, [deferredQuery, filters, enterpriseTransactions]);

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
    projects.filter(p => assignedProjectIds.includes(p.id)).forEach(p => map.set(p.id, p.name));
    enterpriseTransactions.forEach((t) => map.set(t.projectId, t.projectName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [enterpriseTransactions, projects, enterprises, currentUser]);

  const transactionTypes = useMemo(() => {
    return [...new Set(enterpriseTransactions.map((t) => t.transactionType))];
  }, [enterpriseTransactions]);

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
      if (currentUser.role === 'Viewer' || currentUser.role === 'Platform Admin' || currentUser.role === 'Deployment Staff') return;
      const previous = transactions.find(tx => tx.id === updated.id);
      if (!previous || !enterprises.some(e => e.id === currentUser.enterpriseId && e.projectIds.includes(previous.projectId)) || !canUpdateCase(previous, updated, currentUser)) return;
      if (currentUser.role === 'Investigator' && (previous.assignedInvestigator !== currentUser.name || !['Assigned', 'Investigating'].includes(previous.caseStatus || '') || !['Investigating', 'Reported'].includes(updated.caseStatus || ''))) return;
      setAuditLogs(logs => [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor: { name: currentUser.name, email: currentUser.email, role: currentUser.role }, action: 'CASE_STATUS_UPDATED', target: updated.caseId || updated.id, ipAddress: 'Demo', details: JSON.stringify({ before: previous.caseStatus, after: updated.caseStatus, report: updated.investigationReport, decision: updated.caseDecision }) }, ...logs]);
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setSelectedTransaction(updated);
    },
    [currentUser, transactions, enterprises],
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
    if (['rule-testing', 'rule-templates', 'onboarding'].includes(activeNavItem) && currentUser.role !== 'Deployment Staff') return <p>{language === 'vi' ? 'Chỉ nhân viên triển khai được sử dụng chức năng này.' : 'Deployment staff only.'}</p>;
    if (activeNavItem === 'platform-health' && currentUser.role !== 'Platform Admin') return <p>Platform Admin only.</p>;
    if (['risk-overview', 'recent-alerts', 'active-cases', 'my-cases', 'reports'].includes(activeNavItem) && ['Deployment Staff', 'Platform Admin'].includes(currentUser.role)) return <p>{language === 'vi' ? 'Vai trò này không truy cập nghiệp vụ điều tra của doanh nghiệp.' : 'Enterprise operations are not available to this role.'}</p>;
    switch (activeNavItem) {
      case "onboarding":
        return accessibleEnterprises.some(e => e.id === 'tenant-abc') ? <OnboardingView onActivateWorkspace={() => setActiveNavItem("projects")} /> : <p>{language === 'vi' ? 'Timeline minh họa hiện chỉ có ABC Fashion. Dùng trang Tập rule để triển khai doanh nghiệp được phân công.' : 'The preview timeline is ABC-only. Use Enterprise rule sets for your assigned enterprises.'}</p>;
      case "rule-sets":
        return <RuleSetsView key={currentUser.id} sets={ruleSets} rules={rules} projects={projects} enterprises={enterprises} currentUser={currentUser} reviewer={currentUser.name} onOpenLibrary={id => { setDeploymentEnterpriseId(id); setActiveNavItem('rule-templates'); }} onAssign={(enterpriseId, staffId) => { if (currentUser.role !== 'Platform Admin' || !DEMO_USERS.some(u => u.id === staffId && u.role === 'Deployment Staff')) return; setEnterprises(prev => prev.map(e => e.id === enterpriseId ? { ...e, deploymentStaffId: staffId } : e)); recordAudit('PROJECT_UPDATED', enterpriseId, 'Phân công triển khai: ' + staffId); }} onChange={(next, event) => { if (!canChangeEnterpriseSets(ruleSets, next, currentUser, enterprises)) return; setRuleSets(next); recordAudit('RULE_UPDATED', 'Enterprise rule sets', event); }} />;

      case "rule-testing":
        return (
          <RuleTestingView
            enterprises={accessibleEnterprises}
            activeRules={activeSetRules(ruleSets.filter(s => accessibleEnterprises.some(e => e.id === s.enterpriseId)))}
            setContext={Object.fromEntries(ruleSets.filter(s => s.activeVersion && accessibleEnterprises.some(e => e.id === s.enterpriseId)).flatMap(s => s.projectIds.map(projectId => [projectId, { id: s.id, name: s.name, version: s.activeVersion! }])))}
            projects={projects}
            rules={scopedRules}
            onAddDemoTransactions={items => {
              if (!permissions.canAccessRuleTesting || items.some(item => !assignedProjectIds.includes(item.projectId))) return;
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
            transactions={enterpriseTransactions}
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
        return (<><label className={styles.drawerLabel}>{language === 'vi' ? 'Doanh nghiệp triển khai' : 'Enterprise'}<select className={styles.control} value={deploymentEnterprise?.id ?? ''} onChange={e => setDeploymentEnterpriseId(e.target.value)}>{accessibleEnterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label><p className={styles.muted}>{language === 'vi' ? 'Sửa mẫu dùng chung sẽ tạo bản sao riêng cho doanh nghiệp đang chọn. Các tập đã lưu không tự thay đổi; cập nhật bản sao và kiểm thử lại trong trang Tập rule.' : 'Editing shared templates creates an enterprise copy. Saved rule sets require an explicit refresh and retest.'}</p>
          <RulesView key={deploymentEnterprise?.id}
            transactions={[]}
            onRulesChange={changeRules}
            initialRules={scopedRules}
            permissions={permissions}
            onNavigateToTesting={() => setActiveNavItem("rule-testing")}
          /></>
        );
      case "projects":
        return (<><label className={styles.drawerLabel}>{language === 'vi' ? 'Doanh nghiệp' : 'Enterprise'}<select className={styles.control} value={deploymentEnterprise?.id ?? ''} onChange={e => setDeploymentEnterpriseId(e.target.value)}>{accessibleEnterprises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          <ProjectsView
            initialProjects={projects.filter(p => deploymentEnterprise?.projectIds.includes(p.id))}
            onProjectsChange={action => { const selectedProjects = projects.filter(p => deploymentEnterprise?.projectIds.includes(p.id)); const next = typeof action === 'function' ? action(selectedProjects) : action; changeProjects([...projects.filter(p => assignedProjectIds.includes(p.id) && !deploymentEnterprise?.projectIds.includes(p.id)), ...next]); }}
            permissions={permissions}

          /></>
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
        return <AuditTrailView initialLogs={currentUser.role === 'Platform Admin' ? auditLogs : auditLogs.filter(log => log.actor.email === currentUser.email || accessibleEnterprises.some(e => log.target === e.id || log.target === e.name))} />;
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
      "rule-sets": currentUser.role === 'SME Admin' ? (language === 'vi' ? 'Quy tắc phát hiện' : 'Detection rules') : t.nav.items.ruleSets,
      onboarding: t.nav.items.onboarding,
      projects: t.nav.items.projects,
      reports: t.nav.items.reports,
      "audit-trail": t.nav.items.auditTrail,
      "platform-health": t.nav.items.platformHealth,
    };
    return navTitleMap[activeNavItem] || t.nav.items.riskOverview;
  }, [currentUser.role, activeNavItem, t, language]);

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
            {legacyUnassigned.length > 0 && currentUser.role === 'Platform Admin' && <details className={styles.panel}><summary>{language === 'vi' ? 'Tập rule cũ chưa xác định doanh nghiệp' : 'Unassigned legacy sets'} ({legacyUnassigned.length})</summary><pre className={styles.sandboxJson}>{JSON.stringify(legacyUnassigned, null, 2)}</pre></details>}{renderView()}
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
