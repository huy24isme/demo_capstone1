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
import { useDialogFocus } from './useDialogFocus';

export function PlatformHealthView() {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [services] = useState<MicroserviceHealth[]>(initialMicroservices);
  const [tenants] = useState<SmeTenantItem[]>(initialSmeTenants);
  const [selectedTenant, setSelectedTenant] = useState<SmeTenantItem | null>(null);
  const tenantRef = useDialogFocus(!!selectedTenant, () => setSelectedTenant(null));
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePing = (service: MicroserviceHealth) => toast('info', language === 'vi' ? service.name + ': dữ liệu mẫu, chưa kết nối health-check API.' : service.name + ': sample data; health-check API is not connected.');

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
          <p>{language === 'vi' ? 'Số liệu minh họa; chưa có giám sát hoặc đo độ trễ trực tiếp.' : 'Sample metrics; live monitoring and latency measurements are not connected.'}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={styles.button}
            onClick={() => toast("info", language === 'vi' ? 'Đang hiển thị dữ liệu mẫu; chưa có API để làm mới.' : 'Showing sample data; no refresh API is connected.')}
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
                {language === 'vi' && svc.status === 'Healthy' ? 'Hoạt động tốt' : svc.status}
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
              {t.platformHealthView.chart.aiLabel}
            </span>
            <span>
              <span className={styles.legendDot} style={{ background: "var(--security-orange)" }} />
              {t.platformHealthView.chart.fallbackLabel}
            </span>
          </div>
        </div>

        <div className={styles.chartArea} style={{ height: 260 }}>
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fallbackHourlyTrend}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--security-purple)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--security-purple)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--security-orange)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--security-orange)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--security-border)" />
                <XAxis dataKey="time" stroke="var(--security-muted)" fontSize={11} />
                <YAxis stroke="var(--security-muted)" fontSize={11} />
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
                  stroke="var(--security-purple)"
                  fillOpacity={1}
                  fill="url(#aiGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="fallbackRequests"
                  name={t.platformHealthView.chart.fallbackLabel}
                  stroke="var(--security-orange)"
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
                        {language === 'vi' ? (item.scoringEngine === 'AI Detection + Fallback' ? 'AI và quy tắc dự phòng' : item.scoringEngine === 'Dynamic Rules' ? 'Kiểm tra bằng quy tắc' : item.scoringEngine) : item.scoringEngine}
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
                        {item.activeProjectsCount} {language === 'vi' ? 'dự án' : 'projects'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          item.status === "Active" ? styles.low : styles.high
                        }`}
                      >
                        {language === 'vi' ? (item.status === 'Active' ? 'Đang hoạt động' : item.status === 'Warning' ? 'Cần chú ý' : item.status) : item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.button}
                        onClick={() => setSelectedTenant(item)}
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
      {selectedTenant && <div className={styles.builderOverlay} onClick={e => { if (e.target === e.currentTarget) setSelectedTenant(null); }}>
        <div ref={tenantRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={selectedTenant.name} className={styles.builderModal}>
          <div className={styles.builderHeader}><h2 className={styles.builderTitle}>{selectedTenant.name}</h2><button className={styles.button} onClick={() => setSelectedTenant(null)}>{language === 'vi' ? 'Đóng' : 'Close'}</button></div>
          <div className={styles.builderBody}><p className={styles.muted}>{language === 'vi' ? 'Thông tin minh họa, chưa kết nối hệ thống quản lý doanh nghiệp thực tế.' : 'Sample information; not connected to a live tenant management service.'}</p><dl className={styles.evaluationFields}>
            {[[language === 'vi' ? 'Mã doanh nghiệp' : 'Business code', selectedTenant.code], [language === 'vi' ? 'Gói dịch vụ' : 'Plan', selectedTenant.plan], [language === 'vi' ? 'Trạng thái' : 'Status', selectedTenant.status], [language === 'vi' ? 'Dự án hoạt động' : 'Active projects', selectedTenant.activeProjectsCount], [language === 'vi' ? 'Hạn mức đã dùng' : 'Quota used', `${selectedTenant.quotaUsed.toLocaleString(dateLocale)} / ${selectedTenant.quotaLimit.toLocaleString(dateLocale)}`], [language === 'vi' ? 'Nguồn phát hiện' : 'Detection source', selectedTenant.scoringEngine]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl></div>
        </div>
      </div>}
    </>
  );
}
