"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import type {
  FraudGuardFilters,
  PaginationState,
  RiskLevel,
  SortDirection,
  SortField,
  SortState,
  TableTab,
  TransactionRisk,
} from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ScoringSourceBadge } from "./ScoringSourceBadge";
import styles from "./SecurityDashboard.module.css";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

interface TransactionRiskTableProps {
  transactions: TransactionRisk[];
  filters: FraudGuardFilters;
  onFiltersChange: Dispatch<SetStateAction<FraudGuardFilters>>;
  activeTab: TableTab;
  onTabChange: (tab: TableTab) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  onReview: (transaction: TransactionRisk) => void;
}

const RISK_ORDER: Record<RiskLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function sortTransactions(
  transactions: TransactionRisk[],
  sort: SortState,
): TransactionRisk[] {
  const sorted = [...transactions];
  const dir = sort.direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sort.field) {
      case "riskLevel":
        return (RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]) * dir;
      case "riskScore":
        return (a.riskScore - b.riskScore) * dir;
      case "processedAt":
        return (
          (new Date(a.processedAt).getTime() -
            new Date(b.processedAt).getTime()) *
          dir
        );
      case "projectName":
        return a.projectName.localeCompare(b.projectName) * dir;
      case "transactionType":
        return a.transactionType.localeCompare(b.transactionType) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}

function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: SortState;
  onSort: (sort: SortState) => void;
}) {
  const isActive = sort.field === field;
  const nextDir: SortDirection =
    isActive && sort.direction === "asc" ? "desc" : "asc";

  return (
    <th
      className={styles.sortable}
      onClick={() => onSort({ field, direction: nextDir })}
      aria-sort={
        isActive
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      {label}
      {isActive && (
        <span className={styles.sortIndicator}>
          {sort.direction === "asc" ? "▲" : "▼"}
        </span>
      )}
    </th>
  );
}

export function TransactionRiskTable({
  transactions,
  filters,
  onFiltersChange,
  activeTab,
  onTabChange,
  sort,
  onSortChange,
  pagination,
  onPaginationChange,
  onReview,
}: TransactionRiskTableProps) {
  const patch = (next: Partial<FraudGuardFilters>) =>
    onFiltersChange((current) => ({ ...current, ...next }));

  // Filter by tab
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "alerts":
        return transactions.filter((t) => t.alertId);
      case "cases":
        return transactions.filter((t) => t.caseId);
      default:
        return transactions;
    }
  }, [transactions, activeTab]);

  // Sort
  const sorted = useMemo(
    () => sortTransactions(tabFiltered, sort),
    [tabFiltered, sort],
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pagination.pageSize));
  const safePage = Math.min(pagination.page, totalPages);
  const startIdx = (safePage - 1) * pagination.pageSize;
  const pageData = sorted.slice(startIdx, startIdx + pagination.pageSize);

  const tabs: { id: TableTab; label: string; count: number }[] = [
    { id: "all", label: "All transactions", count: transactions.length },
    {
      id: "alerts",
      label: "Alerts only",
      count: transactions.filter((t) => t.alertId).length,
    },
    {
      id: "cases",
      label: "Cases",
      count: transactions.filter((t) => t.caseId).length,
    },
  ];

  return (
    <section className={`${styles.panel} ${styles.tablePanel}`}>
      <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
        <div>
          <h2>Scored transactions</h2>
          <p className={styles.muted}>
            Kết quả do Risk Score Gateway chuẩn hóa trên thang 0–100
          </p>
        </div>
        <span className={styles.muted}>{sorted.length} transactions</span>
      </div>

      <div className={styles.tableControls}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Transaction view"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.tabActive : ""
              }`}
              onClick={() => {
                onTabChange(tab.id);
                onPaginationChange({ ...pagination, page: 1 });
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
              type="button"
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search transactions"
            placeholder="Search transaction, entity, or project…"
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
          />

          <select
            className={styles.control}
            aria-label="Risk level"
            value={filters.riskLevel}
            onChange={(event) =>
              patch({
                riskLevel: event.target
                  .value as FraudGuardFilters["riskLevel"],
              })
            }
          >
            <option value="all">All risk levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader
                label="Risk"
                field="riskLevel"
                sort={sort}
                onSort={onSortChange}
              />
              <th>Transaction</th>
              <SortHeader
                label="Project / Type"
                field="projectName"
                sort={sort}
                onSort={onSortChange}
              />
              <SortHeader
                label="Score"
                field="riskScore"
                sort={sort}
                onSort={onSortChange}
              />
              <th>Scoring source</th>
              <SortHeader
                label="Processed at"
                field="processedAt"
                sort={sort}
                onSort={onSortChange}
              />
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td className={styles.emptyState} colSpan={7}>
                  Không có kết quả phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              pageData.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <RiskLevelBadge riskLevel={transaction.riskLevel} />
                  </td>
                  <td>
                    <span className={styles.findingName}>
                      {transaction.transactionReference}
                    </span>
                    <span className={styles.findingMeta}>
                      Entity: {transaction.entityReference}
                    </span>
                  </td>
                  <td>
                    {transaction.projectName}
                    <span className={styles.findingMeta}>
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td>{transaction.riskScore}/100</td>
                  <td>
                    <ScoringSourceBadge source={transaction.scoringSource} />
                  </td>
                  <td>{formatDate(transaction.processedAt)}</td>
                  <td>
                    <button
                      className={styles.button}
                      onClick={() => onReview(transaction)}
                      type="button"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          Showing {sorted.length === 0 ? 0 : startIdx + 1}–
          {Math.min(startIdx + pagination.pageSize, sorted.length)} of{" "}
          {sorted.length}
        </div>
        <div className={styles.paginationControls}>
          <select
            className={styles.control}
            aria-label="Page size"
            value={pagination.pageSize}
            onChange={(e) =>
              onPaginationChange({
                page: 1,
                pageSize: Number(e.target.value),
              })
            }
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <button
            className={styles.paginationBtn}
            onClick={() =>
              onPaginationChange({ ...pagination, page: safePage - 1 })
            }
            disabled={safePage <= 1}
            aria-label="Previous page"
            type="button"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`${styles.paginationBtn} ${
                p === safePage ? styles.paginationBtnActive : ""
              }`}
              onClick={() => onPaginationChange({ ...pagination, page: p })}
              type="button"
            >
              {p}
            </button>
          ))}
          <button
            className={styles.paginationBtn}
            onClick={() =>
              onPaginationChange({ ...pagination, page: safePage + 1 })
            }
            disabled={safePage >= totalPages}
            aria-label="Next page"
            type="button"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
