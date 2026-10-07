"use client";

import { useMemo, useState } from "react";
import type { AuditAction, AuditLogEntry } from "./types";
import { useLanguage } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";
import styles from "./SecurityDashboard.module.css";

interface AuditTrailViewProps {
  initialLogs: AuditLogEntry[];
}

function formatAuditTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return `${d.toLocaleTimeString(locale)} · ${d.toLocaleDateString(locale)}`;
}

const ACTION_CLASSES: Record<AuditAction, string> = {
  CASE_STATUS_UPDATED: styles.auditActionUpdate,
  RULE_CREATED: styles.auditActionCreate,
  RULE_TOGGLED: styles.auditActionSecurity,
  RULE_DELETED: styles.auditActionDelete,
  API_KEY_GENERATED: styles.auditActionSecurity,
  WEBHOOK_UPDATED: styles.auditActionUpdate,
  ALERT_REVIEWED: styles.auditActionCreate,
  EXPORT_GENERATED: styles.auditActionUpdate,
};

const ACTION_KEY_MAP: Record<
  AuditAction,
  keyof TranslationKey["auditTrailView"]["actions"]
> = {
  CASE_STATUS_UPDATED: "caseStatusUpdated",
  RULE_CREATED: "ruleCreated",
  RULE_TOGGLED: "ruleToggled",
  RULE_DELETED: "ruleDeleted",
  API_KEY_GENERATED: "apiKeyGenerated",
  WEBHOOK_UPDATED: "webhookUpdated",
  ALERT_REVIEWED: "alertReviewed",
  EXPORT_GENERATED: "exportGenerated",
};

export function AuditTrailView({ initialLogs }: AuditTrailViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
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
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.auditTrailView.title}</h1>
          <p>{t.auditTrailView.subtitle}</p>
        </div>
      </div>

      {/* Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.auditTrailView.kpis.totalLogs}</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>{t.auditTrailView.kpis.totalLogsDesc}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.auditTrailView.kpis.caseChanges}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-blue)" }}
          >
            {stats.cases}
          </strong>
          <span className={styles.statDescription}>{t.auditTrailView.kpis.caseChangesDesc}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.auditTrailView.kpis.ruleUpdates}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-purple)" }}
          >
            {stats.rules}
          </strong>
          <span className={styles.statDescription}>{t.auditTrailView.kpis.ruleUpdatesDesc}</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.auditTrailView.kpis.securityEvents}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-orange)" }}
          >
            {stats.security}
          </strong>
          <span className={styles.statDescription}>{t.auditTrailView.kpis.securityEventsDesc}</span>
        </article>
      </section>

      {/* Toolbar Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder={t.auditTrailView.searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className={styles.control}
            aria-label={t.auditTrailView.filterCategory}
            value={actionCategory}
            onChange={(e) => {
              setActionCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t.auditTrailView.categories.all}</option>
            <option value="cases">{t.auditTrailView.categories.cases}</option>
            <option value="rules">{t.auditTrailView.categories.rules}</option>
            <option value="security">{t.auditTrailView.categories.security}</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <section className={`${styles.panel} ${styles.tablePanel}`}>
        <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
          <div>
            <h2>{t.auditTrailView.title}</h2>
            <p className={styles.muted}>{t.auditTrailView.subtitle}</p>
          </div>
          <span className={styles.muted}>
            {filtered.length} {t.auditTrailView.eventsCount}
          </span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.auditTrailView.table.time}</th>
                <th>{t.auditTrailView.table.actor}</th>
                <th>{t.auditTrailView.table.action}</th>
                <th>{t.auditTrailView.table.target}</th>
                <th>{t.auditTrailView.table.details}</th>
                <th>{t.auditTrailView.table.ip}</th>
              </tr>
            </thead>
            <tbody>
              {pageLogs.length === 0 ? (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>
                    {t.auditTrailView.table.emptyMessage}
                  </td>
                </tr>
              ) : (
                pageLogs.map((log) => {
                  const actionClass = ACTION_CLASSES[log.action] || styles.auditActionUpdate;
                  const actionKey = ACTION_KEY_MAP[log.action];
                  const actionLabel =
                    actionKey && t.auditTrailView.actions
                      ? t.auditTrailView.actions[actionKey]
                      : log.action;
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, color: "var(--security-muted)" }}>
                        {formatAuditTime(log.timestamp, dateLocale)}
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
                          className={`${styles.auditActionBadge} ${actionClass}`}
                        >
                          {actionLabel}
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
            {t.auditTrailView.showing} {filtered.length === 0 ? 0 : startIdx + 1}–
            {Math.min(startIdx + pageSize, filtered.length)} {t.auditTrailView.of} {filtered.length}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-label={t.auditTrailView.prevPage}
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
              aria-label={t.auditTrailView.nextPage}
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
