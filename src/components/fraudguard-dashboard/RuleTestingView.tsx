"use client";

import { useEffect, useState } from "react";
import type { RuleTemplate } from "./types";
import { evaluateSandboxRule, nextSandboxVersion } from "@/lib/rule-sandbox";
import styles from "./SecurityDashboard.module.css";
import { Play, Check, Sliders } from "lucide-react";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";

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
  addressReuseCount: number;
  expectedAnomaly?: boolean;
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
    addressReuseCount: 3,
  },
  {
    id: "stx-02",
    ref: "TX-TEST-83913",
    amount: 850000,
    channel: "COD",
    deviceId: "DEV_REGULAR_01",
    failCount: 0,
    addressReuseCount: 1,
  },
  {
    id: "stx-03",
    ref: "TX-TEST-83914",
    amount: 18000000,
    channel: "COD",
    deviceId: "DEV_A998 (New)",
    failCount: 5,
    addressReuseCount: 3,
  },
  {
    id: "stx-04",
    ref: "TX-TEST-83915",
    amount: 1450000,
    channel: "Online",
    deviceId: "DEV_KNOWN_55",
    failCount: 1,
    addressReuseCount: 1,
  },
  {
    id: "stx-05",
    ref: "TX-TEST-83916",
    amount: 4500000,
    channel: "COD",
    deviceId: "DEV_KNOWN_90",
    failCount: 0,
    addressReuseCount: 3,
  },
];

const EXPECTED_BY_RULE: Record<string, boolean[]> = {
  "rule-cod-001": [true, false, true, false, false],
  "rule-cod-002": [true, false, true, false, false],
  "rule-cod-003": [true, false, true, false, false],
  "rule-cod-004": [true, false, true, false, true],
  "rule-002": [false, false, false, false, false],
};

export function RuleTestingView({ rules, onPublishRule }: RuleTestingViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const { toast } = useToast();

  const [selectedRuleId, setSelectedRuleId] = useState(
    rules[0]?.id || "rule-cod-001",
  );
  const [results, setResults] = useState<TestSampleTx[]>([]);
  const [testedSignature, setTestedSignature] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];
  const signature = JSON.stringify(selectedRule);
  const hasRun = testedSignature === signature;
  const samples = SAMPLE_DATASET.map((item, index) => ({ ...item, expectedAnomaly: EXPECTED_BY_RULE[selectedRule?.id ?? ""]?.[index] }));
  const testDataset = hasRun ? results : samples;
  const passedCount = hasRun ? results.filter((tx) => tx.status === "PASSED").length : 0;
  const nextVersion = selectedRule ? nextSandboxVersion(selectedRule.version) : null;
  const canPublish = !!onPublishRule && !!selectedRule && !!nextVersion && hasRun && results.length > 0 && passedCount === results.length;

  useEffect(() => {
    setTestedSignature(null);
    setError("");
  }, [selectedRule]);

  const handleRunSandboxTest = () => {
    if (!selectedRule) return;
    setError("");
    setTestedSignature(null);
    try {
      const evaluated = samples.map((item): TestSampleTx => {
        const result = evaluateSandboxRule(selectedRule, {
          projectId: "proj-abc-cod",
          transactionType: "payment",
          fields: {
            amount: item.amount,
            currency: "VND",
            channel: item.channel,
            "device.is_new": item.deviceId.includes("(New)"),
            "velocity.failed_tx.24h": item.failCount,
            "identity.address_reuse_count": item.addressReuseCount,
          },
        });
        return {
          ...item,
          ...result,
          status: item.expectedAnomaly == null ? "PENDING" : result.actualAnomaly === item.expectedAnomaly ? "PASSED" : "FAILED",
        };
      });
      const passed = evaluated.filter((item) => item.status === "PASSED").length;
      setResults(evaluated);
      setTestedSignature(signature);
      toast(
        passed === evaluated.length ? "success" : "error",
        language === "vi"
          ? `${passed}/${evaluated.length} mẫu khớp kỳ vọng (${Math.round(passed / evaluated.length * 100)}%).`
          : `${passed}/${evaluated.length} samples match expectations (${Math.round(passed / evaluated.length * 100)}%).`,
      );
    } catch (cause) {
      setResults([]);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const handlePublishVersion = () => {
    if (!canPublish || !selectedRule || !nextVersion || !onPublishRule) return;
    const updatedRule: RuleTemplate = {
      ...selectedRule,
      version: nextVersion,
      status: "Published",
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onPublishRule(updatedRule);
    setTestedSignature(null);
    toast(
      "success",
      language === "vi"
        ? `Đã cập nhật ${selectedRule.name} lên ${updatedRule.version} trong bản demo.`
        : `Updated ${selectedRule.name} to ${updatedRule.version} in this demo.`,
    );
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.ruleTestingView.title}</h1>
          <p>{t.ruleTestingView.subtitle}</p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className={styles.metricsGrid} style={{ marginTop: 20 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            {t.ruleTestingView.kpis.targetProject}
          </div>
          <strong
            className={styles.statValue}
            style={{ fontSize: 20, color: "var(--security-blue)" }}
          >
            ABC Fashion
          </strong>
          <span className={styles.statDescription}>
            {t.ruleTestingView.kpis.targetProjectDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            {t.ruleTestingView.kpis.activeVersion}
          </div>
          <strong className={styles.statValue} style={{ fontSize: 22 }}>
            {selectedRule?.version || "v1.0"}
          </strong>
          <span className={styles.statDescription}>
            {t.ruleTestingView.kpis.activeVersionDesc}
          </span>
        </article>
        <article className={styles.statCard} style={{ borderColor: "#715139" }}>
          <div className={styles.statLabel}>
            {t.ruleTestingView.kpis.sandboxVersion}
          </div>
          <strong
            className={styles.statValue}
            style={{ fontSize: 22, color: "var(--security-orange)" }}
          >
            {nextVersion ?? "-"} (Testing)
          </strong>
          <span className={styles.statDescription}>
            {t.ruleTestingView.kpis.sandboxVersionDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            {t.ruleTestingView.kpis.validationRate}
          </div>
          <strong
            className={styles.statValue}
            style={{ color: hasRun && passedCount !== testDataset.length ? "var(--security-red)" : "var(--security-green)" }}
          >
            {hasRun
              ? `${Math.round((passedCount / testDataset.length) * 100)}%`
              : t.ruleTestingView.kpis.validationWaiting}
          </strong>
          <span className={styles.statDescription}>
            {hasRun
              ? t.ruleTestingView.kpis.validationSummary
                  .replace("{passed}", String(passedCount))
                  .replace("{total}", String(testDataset.length))
              : t.ruleTestingView.kpis.validationNotRun}
          </span>
        </article>
      </div>

      {/* Sandbox Controls Panel */}
      <div className={styles.panel} style={{ marginTop: 14, padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sliders size={20} color="var(--security-blue)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {t.ruleTestingView.controls.title}
            </h2>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className={styles.button}
              onClick={handleRunSandboxTest}
              disabled={!selectedRule}
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
              {t.ruleTestingView.controls.btnRun}
            </button>

            <button
              className={styles.drawerPrimaryBtn}
              onClick={handlePublishVersion}
              disabled={!canPublish}
              type="button"
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Check size={16} />
              {t.ruleTestingView.controls.btnPublish.replace("{version}", nextVersion ?? "?")}
            </button>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}
        >
          <div>
            <label
              htmlFor="sandbox-rule"
              className={styles.drawerLabel}
              style={{ display: "block", marginBottom: 6 }}
            >
              {t.ruleTestingView.controls.selectRule}
            </label>
            <select
              id="sandbox-rule"
              className={styles.control}
              style={{ width: "100%" }}
              value={selectedRule?.id ?? ""}
              disabled={!rules.length}
              onChange={(e) => { setSelectedRuleId(e.target.value); setTestedSignature(null); setError(""); }}
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.version || "v1.0"})
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      <p className={styles.muted}>
        {language === "vi"
          ? "Thử riêng rule đã chọn trên 5 giao dịch thanh toán mẫu của ABC Fashion, kể cả rule đang tắt. Rule khớp trả về bất thường; không khớp trả về bình thường. Nhãn kỳ vọng riêng cho từng rule được giữ cố định; dấu — nghĩa là chưa có nhãn kiểm chứng. Chỉ phát hành trong demo khi tất cả mẫu đạt."
          : "Test only the selected rule on 5 sample ABC Fashion payments, including disabled rules. A matching rule returns Abnormal; otherwise Normal. Expected labels are fixed per rule; — means no verification label is available. Publishing in the demo requires all samples to pass."}
      </p>
      {!selectedRule && <p role="status">{language === "vi" ? "Chưa có rule để kiểm thử." : "No rules available to test."}</p>}
      {selectedRule && !nextVersion && <p role="alert">{language === "vi" ? "Phiên bản rule không hợp lệ. Không thể phát hành." : "Invalid rule version. Publishing is unavailable."}</p>}
      {error && <p role="alert" style={{ color: "var(--security-red)" }}>
        {language === "vi" ? "Không thể kiểm thử. Kiểm tra trường dữ liệu mẫu và điều kiện rule: " : "Cannot run the test. Check sample fields and rule conditions: "}{error}
      </p>}

      {/* Test Results Table */}
      <section
        className={`${styles.panel} ${styles.tablePanel}`}
        style={{ marginTop: 20 }}
      >
        <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
          <div>
            <h2>{t.ruleTestingView.results.title}</h2>
            <p className={styles.muted}>{t.ruleTestingView.results.subtitle}</p>
          </div>
          <span className={styles.muted}>
            {t.ruleTestingView.results.sampleCount.replace(
              "{count}",
              String(testDataset.length),
            )}
          </span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.ruleTestingView.results.colTxn}</th>
                <th>{t.ruleTestingView.results.colParams}</th>
                <th>{t.ruleTestingView.results.colExpected}</th>
                <th>{t.ruleTestingView.results.colActual}</th>
                <th>{t.ruleTestingView.results.colTriggered}</th>
                <th>{t.ruleTestingView.results.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {testDataset.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong
                      style={{
                        fontFamily: "monospace",
                        color: "var(--security-text)",
                      }}
                    >
                      {item.ref}
                    </strong>
                  </td>
                  <td>
                    <div style={{ fontSize: 11 }}>
                      {item.amount.toLocaleString(dateLocale)} VND · {item.channel}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--security-subtle)",
                      }}
                    >
                      {item.deviceId} · {item.failCount}{" "}
                      {language === "vi" ? "lỗi" : "fails"}
                    </div>
                  </td>
                  <td>
                    <span
                      className={styles.badge}
                      style={{
                        background: item.expectedAnomaly
                          ? "var(--critical-bg)"
                          : "rgba(120, 201, 172, 0.15)",
                        color: item.expectedAnomaly
                          ? "var(--critical-text)"
                          : "var(--security-green)",
                      }}
                    >
                      {item.expectedAnomaly == null ? "—" : item.expectedAnomaly ? t.risk.anomaly : t.risk.normal}
                    </span>
                  </td>
                  <td>
                    {item.actualAnomaly != null ? (
                      <div>
                        <strong
                          style={{
                            color: item.actualAnomaly
                              ? "var(--security-red)"
                              : "var(--security-green)",
                            fontSize: 13,
                          }}
                        >
                          {item.actualAnomaly ? t.risk.anomaly : t.risk.normal}
                        </strong>

                      </div>
                    ) : (
                      <span
                        style={{ color: "var(--security-muted)", fontSize: 11 }}
                      >
                        {t.ruleTestingView.results.notTested}
                      </span>
                    )}
                  </td>
                  <td>
                    {item.triggered && item.triggered.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {item.triggered.map((trg) => (
                          <span
                            key={trg}
                            className={styles.ruleTag}
                            style={{ fontSize: 9 }}
                          >
                            {trg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span
                        style={{ color: "var(--security-subtle)", fontSize: 10 }}
                      >
                        None
                      </span>
                    )}
                  </td>
                  <td>
                    {item.status === "PASSED" ? (
                      <span
                        className={styles.badge}
                        style={{
                          background: "rgba(120, 201, 172, 0.15)",
                          color: "var(--security-green)",
                        }}
                      >
                        {t.ruleTestingView.results.passed}
                      </span>
                    ) : item.status === "FAILED" ? (
                      <span
                        className={styles.badge}
                        style={{
                          background: "var(--critical-bg)",
                          color: "var(--critical-text)",
                        }}
                      >
                        {t.ruleTestingView.results.mismatch}
                      </span>
                    ) : (
                      <span
                        style={{ color: "var(--security-subtle)", fontSize: 11 }}
                      >
                        {t.ruleTestingView.results.pending}
                      </span>
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
