"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import type { FraudGuardFilters, TransactionRisk } from "./types";
import { exportTransactionsCSV, downloadCSVTemplate } from "@/lib/export-csv";
import { DataIngestionModal } from "./DataIngestionModal";
import { useLanguage } from "./i18n/LanguageContext";
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
  const { t } = useLanguage();
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);

  const patch = (next: Partial<FraudGuardFilters>) =>
    onChange((current) => ({ ...current, ...next }));

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label={t.table.columns.projectType}
            value={filters.projectId}
            onChange={(event) => patch({ projectId: event.target.value })}
          >
            <option value="all">{t.toolbar.allProjects}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            className={styles.control}
            aria-label={t.toolbar.allTypes}
            value={filters.transactionType}
            onChange={(event) =>
              patch({ transactionType: event.target.value })
            }
          >
            <option value="all">{t.toolbar.allTypes}</option>
            {transactionTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <select
            className={styles.control}
            aria-label={t.toolbar.allSources}
            value={filters.scoringSource}
            onChange={(event) =>
              patch({
                scoringSource:
                  event.target.value as FraudGuardFilters["scoringSource"],
              })
            }
          >
            <option value="all">{t.toolbar.allSources}</option>
            <option value="AI">{t.toolbar.aiPaid}</option>
            <option value="RULE">{t.toolbar.ruleFree}</option>
            <option value="RULE_FALLBACK">{t.toolbar.ruleFallback}</option>
          </select>

          {hasActiveFilters(filters) && (
            <button
              className={styles.clearFilters}
              onClick={() => onChange(initialFilters)}
              type="button"
            >
              {t.toolbar.clearFilters}
            </button>
          )}
        </div>

        <div className={styles.toolbarGroup}>
          {/* Download CSV Template */}
          <button
            className={styles.button}
            onClick={downloadCSVTemplate}
            title={t.toolbar.downloadCsvTemplateTitle}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={13} style={{ color: "var(--security-green)" }} />
            {t.toolbar.downloadCsvTemplate}
          </button>

          {/* Data Ingestion Spec & Upload Modal */}
          <button
            className={styles.button}
            onClick={() => setIngestionModalOpen(true)}
            title={t.toolbar.dataIngestionSpecTitle}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FileSpreadsheet size={13} style={{ color: "var(--security-blue)" }} />
            {t.toolbar.dataIngestionSpec}
          </button>

          <select
            className={styles.control}
            aria-label={t.toolbar.last30Days}
            value={filters.range}
            onChange={(event) =>
              patch({ range: Number(event.target.value) as 7 | 30 | 90 })
            }
          >
            <option value={7}>{t.toolbar.last7Days}</option>
            <option value={30}>{t.toolbar.last30Days}</option>
            <option value={90}>{t.toolbar.last90Days}</option>
          </select>

          <button
            className={styles.button}
            onClick={() => exportTransactionsCSV(visibleTransactions)}
            type="button"
          >
            {t.toolbar.exportData} ({visibleTransactions.length})
          </button>
        </div>
      </div>

      <DataIngestionModal
        open={ingestionModalOpen}
        onClose={() => setIngestionModalOpen(false)}
      />
    </>
  );
}
