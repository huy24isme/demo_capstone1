"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from "lucide-react";
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
import styles from "./SecurityDashboard.module.css";

export function PlatformHealthView() {
  const { toast } = useToast();
  const [services, setServices] = useState<MicroserviceHealth[]>(initialMicroservices);
  const [tenants] = useState<SmeTenantItem[]>(initialSmeTenants);
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  const handlePing = (service: MicroserviceHealth) => {
    setIsPinging((prev) => ({ ...prev, [service.id]: true }));
    setTimeout(() => {
      setIsPinging((prev) => ({ ...prev, [service.id]: false }));
      toast(
        "success",
        `[Ping OK] ${service.name} phản hồi sau ${service.latencyMs}ms. Status: ${service.status}`,
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
      <div className={styles.breadcrumb}>
        FraudGuard / Platform System / Platform Health & Tenants
      </div>

      <div className={styles.pageHeading}>
        <div>
          <h1>Platform Health & Tenants Monitoring</h1>
          <p>
            Giám sát cụm máy chủ microservices, độ trễ AI inference, cơ chế tự động Fallback và danh sách doanh nghiệp SME.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className={styles.button}
            onClick={() => toast("info", "Đã đồng bộ metrics cụm server mới nhất")}
            type="button"
          >
            <RefreshCw size={13} style={{ marginRight: 6 }} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>SLA Uptime (30d)</div>
          <strong className={styles.statValue} style={{ color: "var(--security-green)" }}>
            99.98%
          </strong>
          <span className={styles.statDescription}>0 downtime sự cố nghiêm trọng</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>AI Inference Latency (P95)</div>
          <strong className={styles.statValue} style={{ color: "var(--security-blue)" }}>
            42ms
          </strong>
          <span className={styles.statDescription}>P99: 68ms · Model v2.4 ONNX</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>RULE_FALLBACK Rate</div>
          <strong className={styles.statValue} style={{ color: "var(--security-orange)" }}>
            1.2%
          </strong>
          <span className={styles.statDescription}>18/1,500 requests fallback hôm nay</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Active SME Tenants</div>
          <strong className={styles.statValue}>{tenants.length}</strong>
          <span className={styles.statDescription}>10 projects đang kết nối API</span>
        </article>
      </section>

      {/* Failover Mechanism Callout */}
      <div className={styles.fallbackCallout}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Zap size={22} color="var(--security-orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--security-text)", marginBottom: 3 }}>
              Cơ chế Dự phòng Không Gián đoạn (RULE_FALLBACK Protocol)
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--security-text-secondary)", lineHeight: 1.5 }}>
              Khi AI Scoring Service vượt ngưỡng timeout 100ms hoặc bảo trì, hệ thống tự động chuyển hướng chấm điểm sang <strong>Dynamic Rule Engine</strong> và gắn cờ <code>RULE_FALLBACK</code> trên transaction để đảm bảo luồng thanh toán của SME <strong>không bao giờ bị gián đoạn</strong>.
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
          High-Availability Active
        </span>
      </div>

      {/* Microservices Health Grid */}
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
        Cụm Dịch vụ Microservices (Core Services)
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
                <span className={styles.serviceMetricLabel}>Độ trễ (Latency)</span>
                <span className={styles.serviceMetricVal} style={{ color: "var(--security-blue)" }}>
                  {svc.latencyMs} ms
                </span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>Throughput</span>
                <span className={styles.serviceMetricVal}>{svc.throughput}</span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>CPU Load</span>
                <span className={styles.serviceMetricVal}>{svc.cpuUsage}%</span>
              </div>
              <div className={styles.serviceMetricItem}>
                <span className={styles.serviceMetricLabel}>Memory</span>
                <span className={styles.serviceMetricVal}>{svc.memoryUsage}%</span>
              </div>
            </div>

            <div className={styles.serviceFooter}>
              <span>Uptime: {svc.uptime}</span>
              <button
                className={styles.button}
                style={{ fontSize: 11, padding: "3px 8px", minHeight: 26 }}
                onClick={() => handlePing(svc)}
                disabled={isPinging[svc.id]}
                type="button"
              >
                {isPinging[svc.id] ? "Pinging…" : "Ping Check"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Fallback & Traffic Hourly Chart */}
      <section className={styles.panel} style={{ marginBottom: 28 }}>
        <div className={styles.panelHeader} style={{ marginBottom: 14 }}>
          <div>
            <h2>Giám sát Lưu lượng Chấm điểm & Tỷ lệ Fallback 24h</h2>
            <span className={styles.muted}>
              Phân bổ số lượng giao dịch chấm điểm bằng AI vs Dynamic Rule Fallback theo khung giờ
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
                name="AI Scoring (Requests)"
                stroke="#ad8af3"
                fillOpacity={1}
                fill="url(#aiGrad)"
              />
              <Area
                type="monotone"
                dataKey="fallbackRequests"
                name="Rule Fallback (Requests)"
                stroke="#eda765"
                fillOpacity={1}
                fill="url(#fbGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SME Tenants Management Table */}
      <section className={styles.panel}>
        <div className={styles.panelHeader} style={{ marginBottom: 16 }}>
          <div>
            <h2>Danh sách Khách hàng Doanh nghiệp (SME Tenants)</h2>
            <span className={styles.muted}>
              Các tổ chức đang đăng ký thuê nền tảng FraudGuard SaaS và mức tiêu thụ hạn ngạch
            </span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tổ chức / Doanh nghiệp</th>
                <th>Gói dịch vụ</th>
                <th>Cơ chế Chấm điểm</th>
                <th>Hạn ngạch tiêu thụ (Tháng)</th>
                <th>Số dự án</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const usagePercent = Math.round((t.quotaUsed / t.quotaLimit) * 100);
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--security-text)" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--security-subtle)" }}>
                        Code: {t.code} · Ngày gia nhập: {t.joinedDate}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getPlanBadgeClass(t.plan)}`}>
                        {t.plan}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--security-text)" }}>
                        {t.scoringEngine}
                      </span>
                    </td>
                    <td>
                      <div style={{ width: 140 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                          <span>{t.quotaUsed.toLocaleString("vi-VN")}</span>
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
                        {t.activeProjectsCount} projects
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          t.status === "Active" ? styles.low : styles.high
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.button}
                        onClick={() => toast("info", `Đang chuyển quyền hỗ trợ Tenant: ${t.name}`)}
                        type="button"
                        style={{ fontSize: 11, padding: "3px 8px", minHeight: 26 }}
                      >
                        Inspect Tenant
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
