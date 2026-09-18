import type { Dispatch, SetStateAction } from "react";
import type { FraudGuardFilters, TransactionRisk } from "./types";
import { exportTransactionsCSV } from "@/lib/export-csv";
import styles from "./SecurityDashboard.module.css";

interface ToolbarProps {
  filters: FraudGuardFilters;
  projects: Array<{ id: string; name: string }>;
  transactionTypes: string[];
  onChange: Dispatch<SetStateAction<FraudGuardFilters>>;
  visibleTransactions: TransactionRisk[];
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

function hasActiveFilters(filters: FraudGuardFilters): boolean {
  return (
    filters.projectId !== "all" ||
    filters.transactionType !== "all" ||
    filters.riskLevel !== "all" ||
    filters.scoringSource !== "all" ||
    filters.caseStatus !== "all" ||
    filters.query !== ""
  );
}

export function DashboardToolbar({
  filters,
  projects,
  transactionTypes,
  onChange,
  visibleTransactions,
}: ToolbarProps) {
  const patch = (next: Partial<FraudGuardFilters>) =>
    onChange((current) => ({ ...current, ...next }));

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <select
          className={styles.control}
          aria-label="Project"
          value={filters.projectId}
          onChange={(event) => patch({ projectId: event.target.value })}
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          className={styles.control}
          aria-label="Transaction type"
          value={filters.transactionType}
          onChange={(event) =>
            patch({ transactionType: event.target.value })
          }
        >
          <option value="all">All transaction types</option>
          {transactionTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <select
          className={styles.control}
          aria-label="Scoring source"
          value={filters.scoringSource}
          onChange={(event) =>
            patch({
              scoringSource:
                event.target.value as FraudGuardFilters["scoringSource"],
            })
          }
        >
          <option value="all">All scoring sources</option>
          <option value="AI">AI</option>
          <option value="RULE">Rule Engine</option>
          <option value="RULE_FALLBACK">Rule fallback</option>
        </select>

        {hasActiveFilters(filters) && (
          <button
            className={styles.clearFilters}
            onClick={() => onChange(initialFilters)}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={styles.toolbarGroup}>
        <select
          className={styles.control}
          aria-label="Time range"
          value={filters.range}
          onChange={(event) =>
            patch({ range: Number(event.target.value) as 7 | 30 | 90 })
          }
        >
          <option value={7}>Past 7 days</option>
          <option value={30}>Past 30 days</option>
          <option value={90}>Past 90 days</option>
        </select>

        <button
          className={styles.button}
          onClick={() => exportTransactionsCSV(visibleTransactions)}
          disabled={visibleTransactions.length === 0}
          type="button"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
