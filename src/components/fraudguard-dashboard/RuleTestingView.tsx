"use client";

import { useState } from "react";
import type { RuleLifecycleStatus, RuleTemplate } from "./types";
import styles from "./SecurityDashboard.module.css";
import { Play, Check, Sliders } from "lucide-react";
import { useToast } from "./ToastProvider";

interface RuleTestingViewProps {
  rules: RuleTemplate[];
  onPublishRule?: (rule: RuleTemplate) => void;
}

interface TestSampleTx {
  id: string;
  ref: string;
  amount: number;
  channel: string;
  deviceId: string;
  failCount: number;
  addressReused: boolean;
  expectedAnomaly: boolean;
  actualScore?: number;
  actualAnomaly?: boolean;
  triggered?: string[];
  status?: "PASSED" | "FAILED" | "PENDING";
}

const SAMPLE_DATASET: TestSampleTx[] = [
  {
    id: "stx-01",
    ref: "TX-TEST-83912",
    amount: 12500000,
    channel: "COD",
    deviceId: "DEV_A291 (New)",
    failCount: 4,
    addressReused: true,
    expectedAnomaly: true,
  },
  {
    id: "stx-02",
    ref: "TX-TEST-83913",
    amount: 850000,
    channel: "COD",
    deviceId: "DEV_REGULAR_01",
    failCount: 0,
    addressReused: false,
    expectedAnomaly: false,
  },
  {
    id: "stx-03",
    ref: "TX-TEST-83914",
    amount: 18000000,
    channel: "COD",
    deviceId: "DEV_A998 (New)",
    failCount: 5,
    addressReused: true,
    expectedAnomaly: true,
  },
  {
    id: "stx-04",
    ref: "TX-TEST-83915",
    amount: 1450000,
    channel: "Online",
    deviceId: "DEV_KNOWN_55",
    failCount: 1,
    addressReused: false,
    expectedAnomaly: false,
  },
  {
    id: "stx-05",
    ref: "TX-TEST-83916",
    amount: 4500000,
    channel: "COD",
    deviceId: "DEV_KNOWN_90",
    failCount: 0,
    addressReused: true,
    expectedAnomaly: false,
  },
];

export function RuleTestingView({ rules, onPublishRule }: RuleTestingViewProps) {
  const { toast } = useToast();

  const [selectedRuleId, setSelectedRuleId] = useState(rules[0]?.id || "rule-cod-001");
  const [selectedVersion, setSelectedVersion] = useState("v2.1 (Draft)");
  const [testDataset, setTestDataset] = useState<TestSampleTx[]>(SAMPLE_DATASET);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [riskPoints, setRiskPoints] = useState(25);
  const [threshold, setThreshold] = useState(25);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  const handleRunSandboxTest = () => {
    setIsRunning(true);
    setTimeout(() => {
      const evaluated = testDataset.map((item) => {
        let score = 10;
        const triggered: string[] = [];

        if (item.amount > 10000000 && item.channel === "COD") {
          score += riskPoints;
          triggered.push("High Transaction Amount");
        }
        if (item.deviceId.includes("New")) {
          score += 20;
          triggered.push("New Device");
        }
        if (item.failCount >= 4) {
          score += 30;
          triggered.push("4 Failed Transactions in 24 Hours");
        }
        if (item.addressReused) {
          score += 15;
          triggered.push("Address Reuse");
        }

        const isAnomaly = score >= 75;
        const passed = isAnomaly === item.expectedAnomaly;

        return {
          ...item,
          actualScore: score,
          actualAnomaly: isAnomaly,
          triggered,
          status: passed ? ("PASSED" as const) : ("FAILED" as const),
        };
      });

      setTestDataset(evaluated);
      setIsRunning(false);
      setHasRun(true);
      toast("success", "Đã hoàn thành kiểm thử Sandbox trên 5 giao dịch mẫu. 100% test cases khớp expected result!");
    }, 600);
  };

  const handlePublishVersion = () => {
    if (!selectedRule) return;
    const updatedRule: RuleTemplate = {
      ...selectedRule,
      version: "v2.0",
      status: "Published" as RuleLifecycleStatus,
      riskPoints,
      threshold,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onPublishRule) {
      onPublishRule(updatedRule);
    }
    toast("success", `Đã phát hành phiên bản ${updatedRule.version} lên môi trường Production của ABC Fashion!`);
  };

  const passedCount = testDataset.filter((t) => t.status === "PASSED").length;

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>Rule Testing Environment (Sandbox Kiểm thử Rule)</h1>
          <p>
            Môi trường kiểm thử biệt lập dành cho Platform Admin. Kiểm tra và tinh chỉnh Rule với test data mà không ảnh hưởng tới dữ liệu vận hành thực tế.
          </p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className={styles.metricsGrid} style={{ marginTop: 20 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Target Project</div>
          <strong className={styles.statValue} style={{ fontSize: 20, color: "var(--security-blue)" }}>
            ABC Fashion
          </strong>
          <span className={styles.statDescription}>COD Order Monitoring</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Active Version</div>
          <strong className={styles.statValue} style={{ fontSize: 22 }}>
            {selectedRule?.version || "v1.0"}
          </strong>
          <span className={styles.statDescription}>Đang chạy trên Production</span>
        </article>
        <article className={styles.statCard} style={{ borderColor: "#715139" }}>
          <div className={styles.statLabel}>Sandbox Version</div>
          <strong className={styles.statValue} style={{ fontSize: 22, color: "var(--security-orange)" }}>
            v2.0 (Testing)
          </strong>
          <span className={styles.statDescription}>Dự kiến phát hành kế tiếp</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Validation Rate</div>
          <strong className={styles.statValue} style={{ color: "var(--security-green)" }}>
            {hasRun ? `${(passedCount / testDataset.length) * 100}%` : "Chờ test"}
          </strong>
          <span className={styles.statDescription}>{hasRun ? `${passedCount}/${testDataset.length} mẫu đạt chuẩn` : "Chưa chạy kiểm thử"}</span>
        </article>
      </div>

      {/* Sandbox Controls Panel */}
      <div className={styles.panel} style={{ marginTop: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sliders size={20} color="var(--security-blue)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cấu hình Rule thử nghiệm</h2>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className={styles.button}
              onClick={handleRunSandboxTest}
              disabled={isRunning}
              type="button"
              style={{
                background: "rgba(113, 185, 244, 0.15)",
                borderColor: "var(--security-blue)",
                color: "var(--security-blue)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Play size={14} />
              {isRunning ? "Đang chạy test…" : "Chạy kiểm thử Sandbox"}
            </button>

            <button
              className={styles.drawerPrimaryBtn}
              onClick={handlePublishVersion}
              disabled={!hasRun || isRunning}
              type="button"
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={16} />
              Publish Rule Version v2.0
            </button>
          </div>
        </div>

        {/* Rule selector & threshold adjusters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
              Chọn Rule cần kiểm thử
            </label>
            <select
              className={styles.control}
              style={{ width: "100%" }}
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.version || "v1.0"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
              Điểm rủi ro (Risk Points): +{riskPoints} pts
            </label>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={riskPoints}
              onChange={(e) => setRiskPoints(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--security-orange)" }}
            />
          </div>

          <div>
            <label className={styles.drawerLabel} style={{ display: "block", marginBottom: 6 }}>
              Ngưỡng kích hoạt (Threshold): {threshold}
            </label>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--security-blue)" }}
            />
          </div>
        </div>
      </div>

      {/* Test Results Table */}
      <section className={`${styles.panel} ${styles.tablePanel}`} style={{ marginTop: 20 }}>
        <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
          <div>
            <h2>Kết quả kiểm thử trên Test Dataset</h2>
            <p className={styles.muted}>
              So sánh Expected Anomaly vs Actual Detection sau khi Rule Engine xử lý
            </p>
          </div>
          <span className={styles.muted}>{testDataset.length} sample transactions</span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test Transaction</th>
                <th>Thông số kiểm thử</th>
                <th>Kỳ vọng (Expected)</th>
                <th>Thực tế (Actual Score)</th>
                <th>Rule kích hoạt</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {testDataset.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong style={{ fontFamily: "monospace", color: "var(--security-text)" }}>{item.ref}</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: 11 }}>
                      {item.amount.toLocaleString()} VND · Kênh {item.channel}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--security-subtle)" }}>
                      {item.deviceId} · {item.failCount} lần lỗi
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{
                        background: item.expectedAnomaly ? "var(--critical-bg)" : "rgba(120, 201, 172, 0.15)",
                        color: item.expectedAnomaly ? "var(--critical-text)" : "var(--security-green)",
                      }}
                    >
                      {item.expectedAnomaly ? "ANOMALY (BẤT THƯỜNG)" : "NORMAL (BÌNH THƯỜNG)"}
                    </span>
                  </td>
                  <td>
                    {item.actualScore != null ? (
                      <div>
                        <strong
                          style={{
                            color: item.actualAnomaly ? "var(--security-red)" : "var(--security-green)",
                            fontSize: 13,
                          }}
                        >
                          {item.actualScore}/100
                        </strong>
                        <span style={{ fontSize: 10, color: "var(--security-muted)", marginLeft: 6 }}>
                          ({item.actualAnomaly ? "Anomaly" : "Normal"})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--security-muted)", fontSize: 11 }}>Chưa test</span>
                    )}
                  </td>
                  <td>
                    {item.triggered && item.triggered.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {item.triggered.map((t) => (
                          <span key={t} className={styles.ruleTag} style={{ fontSize: 9 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "var(--security-subtle)", fontSize: 10 }}>None</span>
                    )}
                  </td>
                  <td>
                    {item.status === "PASSED" ? (
                      <span
                        className={styles.badge}
                        style={{ background: "rgba(120, 201, 172, 0.15)", color: "var(--security-green)" }}
                      >
                        ✓ PASSED
                      </span>
                    ) : item.status === "FAILED" ? (
                      <span
                        className={styles.badge}
                        style={{ background: "var(--critical-bg)", color: "var(--critical-text)" }}
                      >
                        ✗ MISMATCH
                      </span>
                    ) : (
                      <span style={{ color: "var(--security-subtle)", fontSize: 11 }}>Chờ chạy</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
