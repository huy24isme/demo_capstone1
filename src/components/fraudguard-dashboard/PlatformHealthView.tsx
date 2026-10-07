"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MicroserviceHealth, SmeTenantItem } from "./types";
import {
  fallbackHourlyTrend,
  initialMicroservices,
  initialSmeTenants,
} from "../../data/fraudguard-platform";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

export function PlatformHealthView() {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [services] = useState<MicroserviceHealth[]>(initialMicroservices);
  const [tenants] = useState<SmeTenantItem[]>(initialSmeTenants);
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePing = (service: MicroserviceHealth) => {
    setIsPinging((prev) => ({ ...prev, [service.id]: true }));
    setTimeout(() => {
      setIsPinging((prev) => ({ ...prev, [service.id]: false }));
      toast(
        "success",
        `[Ping OK] ${service.name} (${service.latencyMs}ms). Status: ${service.status}`,
      );
    }, 450);
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case "Enterprise":
        return styles.planEnterprise;
      case "Growth":
        return styles.planGrowth;
      case "Free Tier":
      default:
        return styles.planFree;
    }
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.platformHealthView.title}</h1>
          <p>{t.platformHealthView.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={styles.button}
            onClick={() => toast("info", t.platformHealthView.toastRefreshed)}
            type="button"
          >
            <RefreshCw size={13} style={{ marginRight: 6 }} />
            {t.platformHealthView.btnRefresh}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.platformHealthView.kpis.uptime}</div>
          <strong className={styles.statValue} style={{ color: "var(--security-green)" }}>
            99.98%
          </strong>
          <span className={styles.statDescription}>
            {t.platformHealthView.kpis.uptimeDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.platformHealthView.kpis.latency}</div>
          <strong className={styles.statValue} style={{ color: "var(--security-blue)" }}>
            42ms
          </strong>
          <span className={styles.statDescription}>
            {t.platformHealthView.kpis.latencyDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.platformHealthView.kpis.fallback}</div>
          <strong className={styles.statValue} style={{ color: "var(--security-orange)" }}>
            1.2%
          </strong>
          <span className={styles.statDescription}>
            {t.platformHealthView.kpis.fallbackDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.platformHealthView.kpis.activeTenants}</div>
          <strong className={styles.statValue}>{tenants.length}</strong>
          <span className={styles.statDescription}>
            {t.platformHealthView.kpis.activeTenantsDesc}
          </span>
        </article>
      </section>

      {/* Failover Mechanism Callout */}
      <div className={styles.fallbackCallout}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Zap size={22} color="var(--security-orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--security-text)", marginBottom: 3 }}>
              {t.platformHealthView.failoverTitle}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--security-text-secondary)", lineHeight: 1.5 }}>
              {t.platformHealthView.failoverDesc}
            </p>
          </div>
        </div>
        <span
          className={styles.badge}
          style={{
            background: "rgba(237, 167, 101, 0.2)",
            color: "var(--security-orange)",
            border: "1px solid var(--security-orange)",
            padding: "6px 12px",
            fontSize: 11,
          }}
        >
          {t.platformHealthView.failoverBadge}
        </span>
      </div>

      {/* Microservices Health Grid */}
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
        {t.platformHealthView.microservicesTitle}
      </h2>
      <div className={styles.servicesGrid}>
        {services.map((svc) => (
          <article key={svc.id} className={styles.serviceCard}>
            <div className={styles.serviceCardHeader}>
              <div>
                <h3 className={styles.serviceTitle}>{svc.name}</h3>
                <span className={styles.serviceType}>{svc.type} · {svc.version}</span>
              </div>
              <span className={`${styles.serviceStatusBadge} ${styles.serviceStatusHealthy}`}>
                <span className={styles.statusPulseHealthy} />
                {svc.status}
              </span>
            </div>

            <div className={styles.serviceMetricGrid}>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>
                  {t.platformHealthView.metrics.latency}
                </span>
                <span className={styles.serviceMetricVal} style={{ color: "var(--security-blue)" }}>
                  {svc.latencyMs} ms
                </span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>
                  {t.platformHealthView.metrics.throughput}
                </span>
                <span className={styles.serviceMetricVal}>{svc.throughput}</span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>
                  {t.platformHealthView.metrics.cpuLoad}
                </span>
                <span className={styles.serviceMetricVal}>{svc.cpuUsage}%</span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>
                  {t.platformHealthView.metrics.memory}
                </span>
                <span className={styles.serviceMetricVal}>{svc.memoryUsage}%</span>
              </div>
            </div>

            <div className={styles.serviceFooter}>
              <span>{t.platformHealthView.metrics.uptime}: {svc.uptime}</span>
              <button
                className={styles.button}
                style={{ fontSize: 11, padding: "3px 8px", minHeight: 26 }}
                onClick={() => handlePing(svc)}
                disabled={isPinging[svc.id]}
                type="button"
              >
                {isPinging[svc.id]
                  ? t.platformHealthView.metrics.pinging
                  : t.platformHealthView.metrics.btnPing}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Fallback & Traffic Hourly Chart */}
      <section className={styles.panel} style={{ marginBottom: 28 }}>
        <div className={styles.panelHeader} style={{ marginBottom: 14 }}>
          <div>
            <h2>{t.platformHealthView.chart.title}</h2>
            <span className={styles.muted}>
              {t.platformHealthView.chart.subtitle}
            </span>
          </div>
          <div className={styles.legend}>
            <span>
              <span className={styles.legendDot} style={{ background: "var(--security-purple)" }} />
              AI Scoring
            </span>
            <span>
              <span className={styles.legendDot} style={{ background: "var(--security-orange)" }} />
              Rule Fallback
            </span>
          </div>
        </div>

        <div className={styles.chartArea} style={{ height: 260 }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fallbackHourlyTrend}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ad8af3" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ad8af3" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eda765" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#eda765" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#35363e" />
                <XAxis dataKey="time" stroke="#777b8b" fontSize={11} />
                <YAxis stroke="#777b8b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--security-panel)",
                    borderColor: "var(--security-border)",
                    borderRadius: 6,
                    color: "var(--security-text)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="aiRequests"
                  name={t.platformHealthView.chart.aiLabel}
                  stroke="#ad8af3"
                  fillOpacity={1}
                  fill="url(#aiGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="fallbackRequests"
                  name={t.platformHealthView.chart.fallbackLabel}
                  stroke="#eda765"
                  fillOpacity={1}
                  fill="url(#fbGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </section>

      {/* SME Tenants Management Table */}
      <section className={styles.panel}>
        <div className={styles.panelHeader} style={{ marginBottom: 16 }}>
          <div>
            <h2>{t.platformHealthView.tenantsTitle}</h2>
            <span className={styles.muted}>
              {t.platformHealthView.tenantsDesc}
            </span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.platformHealthView.tableTenants.name}</th>
                <th>{t.platformHealthView.tableTenants.plan}</th>
                <th>{t.platformHealthView.tableTenants.scoringEngine}</th>
                <th>{t.platformHealthView.tableTenants.quota}</th>
                <th>{t.platformHealthView.tableTenants.activeProjects}</th>
                <th>{t.platformHealthView.tableTenants.status}</th>
                <th>{t.platformHealthView.tableTenants.actions}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((item) => {
                const usagePercent = Math.round((item.quotaUsed / item.quotaLimit) * 100);
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--security-text)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--security-subtle)" }}>
                        {t.platformHealthView.tableTenants.code}: {item.code} · {t.platformHealthView.tableTenants.joined}: {item.joinedDate}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getPlanBadgeClass(item.plan)}`}>
                        {item.plan}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--security-text)" }}>
                        {item.scoringEngine}
                      </span>
                    </td>
                    <td>
                      <div style={{ width: 140 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                          <span>{item.quotaUsed.toLocaleString(dateLocale)}</span>
                          <span style={{ color: usagePercent > 85 ? "var(--security-orange)" : "var(--security-muted)" }}>
                            {usagePercent}%
                          </span>
                        </div>
                        <div className={styles.quotaBarBg}>
                          <div
                            className={styles.quotaBarFill}
                            style={{
                              width: `${usagePercent}%`,
                              backgroundColor: usagePercent > 85 ? "var(--security-orange)" : "var(--security-blue)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>
                        {item.activeProjectsCount} projects
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          item.status === "Active" ? styles.low : styles.high
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.button}
                        onClick={() => toast("info", `${t.platformHealthView.tableTenants.btnInspect}: ${item.name}`)}
                        type="button"
                        style={{ fontSize: 11, padding: "3px 8px", minHeight: 26 }}
                      >
                        {t.platformHealthView.tableTenants.btnInspect}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
