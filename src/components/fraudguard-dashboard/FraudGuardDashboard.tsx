"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type {
  FraudGuardFilters,
  PaginationState,
  RuleTemplate,
  SecondaryView,
  SortState,
  TableTab,
  TransactionRisk,
} from "./types";
import { AppRail } from "./AppRail";
import { ProductHeader } from "./ProductHeader";
import { SecondaryNav } from "./SecondaryNav";
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
import { ToastProvider } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface FraudGuardDashboardProps {
  initialTransactions: TransactionRisk[];
  initialRules: RuleTemplate[];
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

export function FraudGuardDashboard({
  initialTransactions,
  initialRules,
}: FraudGuardDashboardProps) {
  // Data state (mutable for case management)
  const [transactions, setTransactions] = useState(initialTransactions);

  // Filter state
  const [filters, setFilters] = useState(initialFilters);
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  // Navigation state
  const [activeProductTab, setActiveProductTab] = useState("Overview");
  const [activeNavItem, setActiveNavItem] = useState<SecondaryView>("risk-overview");
  const [activeRailItem, setActiveRailItem] = useState("dashboard");

  // Global Theme state (dark / light)
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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

      return (
        (!deferredQuery || searchTarget.includes(deferredQuery)) &&
        (filters.projectId === "all" ||
          transaction.projectId === filters.projectId) &&
        (filters.transactionType === "all" ||
          transaction.transactionType === filters.transactionType) &&
        (filters.riskLevel === "all" ||
          transaction.riskLevel === filters.riskLevel) &&
        (filters.scoringSource === "all" ||
          transaction.scoringSource === filters.scoringSource) &&
        (filters.caseStatus === "all" ||
          transaction.caseStatus === filters.caseStatus)
      );
    });
  }, [deferredQuery, filters, transactions]);

  // KPIs from filtered data
  const metrics = useMemo(() => {
    return {
      analyzed: visibleTransactions.length,
      highRisk: visibleTransactions.filter(
        (t) => t.riskLevel === "High" || t.riskLevel === "Critical",
      ).length,
      openAlerts: visibleTransactions.filter(
        (t) => t.alertId && !t.caseId,
      ).length,
      activeCases: visibleTransactions.filter(
        (t) => t.caseStatus === "Open" || t.caseStatus === "Reviewing",
      ).length,
    };
  }, [visibleTransactions]);

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

  // Sync nav items with product tabs
  const handleProductTabChange = useCallback((tab: string) => {
    setActiveProductTab(tab);
    if (tab === "Overview") setActiveNavItem("risk-overview");
    else if (tab === "Alerts") setActiveNavItem("recent-alerts");
    else if (tab === "Cases") setActiveNavItem("active-cases");
    else if (tab === "Rules") setActiveNavItem("rule-templates");
  }, []);

  const handleNavItemChange = useCallback((id: string) => {
    setActiveNavItem(id as SecondaryView);
    if (id === "risk-overview") setActiveProductTab("Overview");
    else if (id === "recent-alerts") setActiveProductTab("Alerts");
    else if (id === "active-cases") setActiveProductTab("Cases");
    else if (id === "rule-templates") setActiveProductTab("Rules");
  }, []);

  /* ── Render active view ── */
  const renderView = () => {
    switch (activeNavItem) {
      case "recent-alerts":
        return (
          <AlertsView
            transactions={transactions}
            onReview={handleReview}
          />
        );
      case "active-cases":
        return (
          <CasesView
            transactions={transactions}
            onUpdateTransaction={handleUpdateTransaction}
            onReview={handleReview}
          />
        );
      case "rule-templates":
        return <RulesView initialRules={initialRules} />;
      case "risk-overview":
      default:
        return (
          <>
            <div className={styles.breadcrumb}>
              FraudGuard / Monitoring / Risk overview
            </div>

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

            <section className={styles.metricsGrid}>
              <StatCard
                label="Transactions analyzed"
                value={metrics.analyzed}
                description={`Trong ${filters.range} ngày gần nhất`}
              />
              <StatCard
                label="High-risk transactions"
                value={metrics.highRisk}
                description="High hoặc Critical"
                tone="critical"
              />
              <StatCard
                label="Open alerts"
                value={metrics.openAlerts}
                description="Chưa chuyển thành case"
              />
              <StatCard
                label="Active cases"
                value={metrics.activeCases}
                description="Open hoặc Reviewing"
                tone="warning"
              />
            </section>

            <section className={styles.chartGrid}>
              <Panel
                title="Risk trend"
                description="Transaction theo mức rủi ro qua thời gian"
              >
                <TransactionRiskTrend />
              </Panel>
              <Panel
                title="Risk distribution"
                description="Phân bố theo risk level"
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

  return (
    <ToastProvider>
      <div className={styles.root} data-theme={theme}>
        <AppRail activeItem={activeRailItem} onNavigate={setActiveRailItem} />
        <div className={styles.workspace}>
          <ProductHeader
            activeTab={activeProductTab}
            onTabChange={handleProductTabChange}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <div className={styles.bodyLayout}>
            <SecondaryNav
              activeItem={activeNavItem}
              onItemChange={handleNavItemChange}
            />
            <main className={styles.main}>{renderView()}</main>
          </div>
        </div>

        <AlertCaseDrawer
          transaction={selectedTransaction}
          open={drawerOpen}
          onClose={handleCloseDrawer}
          onUpdateTransaction={handleUpdateTransaction}
        />
      </div>
    </ToastProvider>
  );
}
