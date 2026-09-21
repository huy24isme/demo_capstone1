"use client";

import { useMemo, useState } from "react";
import {
  History,
  Shield,
  Filter,
  Search,
  User,
  Clock,
  Terminal,
} from "lucide-react";
import type { AuditAction, AuditLogEntry } from "./types";
import styles from "./SecurityDashboard.module.css";

interface AuditTrailViewProps {
  initialLogs: AuditLogEntry[];
}

function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${timeStr} · ${dateStr}`;
}

const ACTION_LABELS: Record<
  AuditAction,
  { label: string; className: string }
> = {
  CASE_STATUS_UPDATED: {
    label: "Case Status Updated",
    className: styles.auditActionUpdate,
  },
  RULE_CREATED: {
    label: "Rule Created",
    className: styles.auditActionCreate,
  },
  RULE_TOGGLED: {
    label: "Rule Toggled",
    className: styles.auditActionSecurity,
  },
  RULE_DELETED: {
    label: "Rule Deleted",
    className: styles.auditActionDelete,
  },
  API_KEY_GENERATED: {
    label: "API Key Generated",
    className: styles.auditActionSecurity,
  },
  WEBHOOK_UPDATED: {
    label: "Webhook Updated",
    className: styles.auditActionUpdate,
  },
  ALERT_REVIEWED: {
    label: "Alert Reviewed",
    className: styles.auditActionCreate,
  },
  EXPORT_GENERATED: {
    label: "Export Generated",
    className: styles.auditActionUpdate,
  },
};

export function AuditTrailView({ initialLogs }: AuditTrailViewProps) {
  const [logs] = useState<AuditLogEntry[]>(initialLogs);
  const [query, setQuery] = useState("");
  const [actionCategory, setActionCategory] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Filter logs
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (actionCategory === "cases" && log.action !== "CASE_STATUS_UPDATED") {
        return false;
      }
      if (
        actionCategory === "rules" &&
        !["RULE_CREATED", "RULE_TOGGLED", "RULE_DELETED"].includes(log.action)
      ) {
        return false;
      }
      if (
        actionCategory === "security" &&
        !["API_KEY_GENERATED", "WEBHOOK_UPDATED"].includes(log.action)
      ) {
        return false;
      }

      // Query search
      if (!query.trim()) return true;
      const target = [
        log.actor.name,
        log.actor.email,
        log.target,
        log.details,
        log.ipAddress,
        log.action,
      ]
        .join(" ")
        .toLowerCase();

      return target.includes(query.toLowerCase());
    });
  }, [logs, actionCategory, query]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageLogs = filtered.slice(startIdx, startIdx + pageSize);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      cases: logs.filter((l) => l.action === "CASE_STATUS_UPDATED").length,
      rules: logs.filter((l) =>
        ["RULE_CREATED", "RULE_TOGGLED", "RULE_DELETED"].includes(l.action),
      ).length,
      security: logs.filter((l) =>
        ["API_KEY_GENERATED", "WEBHOOK_UPDATED"].includes(l.action),
      ).length,
    };
  }, [logs]);

  return (
    <>
      <div className={styles.breadcrumb}>
        FraudGuard / Analytics / Security Audit Trail
      </div>

      <div className={styles.pageHeading}>
        <div>
          <h1>Security Audit Trail</h1>
          <p>
            Nhật ký kiểm toán ghi nhận mọi thay đổi cấu hình, cập nhật case điều tra và thao tác nhạy cảm.
          </p>
        </div>
      </div>

      {/* Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Total Audit Logs</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>Được lưu trữ bất biến</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Case Status Changes</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-blue)" }}
          >
            {stats.cases}
          </strong>
          <span className={styles.statDescription}>Thao tác của Risk Staff</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Rule & Policy Updates</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-purple)" }}
          >
            {stats.rules}
          </strong>
          <span className={styles.statDescription}>Tạo, sửa hoặc xóa rules</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>API & Secret Key Events</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-orange)" }}
          >
            {stats.security}
          </strong>
          <span className={styles.statDescription}>Sinh key và đổi Webhook</span>
        </article>
      </section>

      {/* Toolbar Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Tìm theo nhân sự, ID đối tượng, IP..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className={styles.control}
            aria-label="Loại hành động"
            value={actionCategory}
            onChange={(e) => {
              setActionCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả hành động</option>
            <option value="cases">Case Updates</option>
            <option value="rules">Rule Engine Changes</option>
            <option value="security">API Keys & Webhooks</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <section className={`${styles.panel} ${styles.tablePanel}`}>
        <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
          <div>
            <h2>Audit Log Records</h2>
            <p className={styles.muted}>
              Bản ghi thời gian thực hỗ trợ tuân thủ quy định và thanh tra an ninh
            </p>
          </div>
          <span className={styles.muted}>{filtered.length} sự kiện</span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details / Reason</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {pageLogs.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>
                    Không tìm thấy bản ghi kiểm toán phù hợp.
                  </td>
                </tr>
              ) : (
                pageLogs.map((log) => {
                  const meta =
                    ACTION_LABELS[log.action] || {
                      label: log.action,
                      className: styles.auditActionUpdate,
                    };
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, color: "var(--security-muted)" }}>
                        {formatAuditTime(log.timestamp)}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            className={styles.avatar}
                            style={{
                              width: 26,
                              height: 26,
                              fontSize: 10,
                              background:
                                log.actor.role === "SME Admin"
                                  ? "var(--security-purple)"
                                  : "var(--security-blue)",
                            }}
                          >
                            {log.actor.name.charAt(0)}
                          </div>
                          <div>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--security-text)",
                              }}
                            >
                              {log.actor.name}
                            </span>
                            <span
                              style={{
                                display: "block",
                                fontSize: 10,
                                color: "var(--security-muted)",
                              }}
                            >
                              {log.actor.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.auditActionBadge} ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className={styles.ruleTag}>{log.target}</span>
                      </td>
                      <td
                        style={{
                          maxWidth: 380,
                          whiteSpace: "normal",
                          lineHeight: 1.4,
                          fontSize: 11,
                          color: "var(--security-text-secondary)",
                        }}
                      >
                        {log.details}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {log.ipAddress}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Showing {filtered.length === 0 ? 0 : startIdx + 1}–
            {Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label="Trang trước"
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
                onClick={() => setPage(p)}
                type="button"
              >
                {p}
              </button>
            ))}
            <button
              className={styles.paginationBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              aria-label="Trang sau"
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
