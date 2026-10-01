"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import type { FraudGuardFilters, TransactionRisk } from "./types";
import { exportTransactionsCSV, downloadCSVTemplate } from "@/lib/export-csv";
import { DataIngestionModal } from "./DataIngestionModal";
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
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);

  const patch = (next: Partial<FraudGuardFilters>) =>
    onChange((current) => ({ ...current, ...next }));

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <select
            className={styles.control}
            aria-label="Project"
            value={filters.projectId}
            onChange={(event) => patch({ projectId: event.target.value })}
          >
            <option value="all">Tất cả dự án</option>
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
            <option value="all">Tất cả loại giao dịch</option>
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
            <option value="all">Tất cả nguồn chấm điểm</option>
            <option value="AI">AI Scoring (Paid)</option>
            <option value="RULE">Rule Engine (Free)</option>
            <option value="RULE_FALLBACK">Rule Fallback</option>
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
          {/* Download CSV Template (Review 1 Feedback 1) */}
          <button
            className={styles.button}
            onClick={downloadCSVTemplate}
            title="Tải tệp CSV mẫu chuẩn theo đặc tả hệ thống"
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={13} style={{ color: "var(--security-green)" }} />
            Tải CSV Template
          </button>

          {/* Data Ingestion Spec & Upload Modal */}
          <button
            className={styles.button}
            onClick={() => setIngestionModalOpen(true)}
            title="Xem đặc tả lược đồ dữ liệu và kiểm tra file đầu vào"
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <FileSpreadsheet size={13} style={{ color: "var(--security-blue)" }} />
            Data Ingestion Spec
          </button>

          <select
            className={styles.control}
            aria-label="Time range"
            value={filters.range}
            onChange={(event) =>
              patch({ range: Number(event.target.value) as 7 | 30 | 90 })
            }
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
          </select>

          <button
            className={styles.button}
            onClick={() => exportTransactionsCSV(visibleTransactions)}
            type="button"
          >
            Xuất dữ liệu ({visibleTransactions.length})
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
