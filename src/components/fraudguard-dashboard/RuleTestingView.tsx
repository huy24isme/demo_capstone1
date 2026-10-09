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
    addressReuseCount: 3,
    expectedAnomaly: true,
  },
  {
    id: "stx-02",
    ref: "TX-TEST-83913",
    amount: 850000,
    channel: "COD",
    deviceId: "DEV_REGULAR_01",
    failCount: 0,
    addressReuseCount: 1,
    expectedAnomaly: false,
  },
  {
    id: "stx-03",
    ref: "TX-TEST-83914",
    amount: 18000000,
    channel: "COD",
    deviceId: "DEV_A998 (New)",
    failCount: 5,
    addressReuseCount: 3,
    expectedAnomaly: true,
  },
  {
    id: "stx-04",
    ref: "TX-TEST-83915",
    amount: 1450000,
    channel: "Online",
    deviceId: "DEV_KNOWN_55",
    failCount: 1,
    addressReuseCount: 1,
    expectedAnomaly: false,
  },
  {
    id: "stx-05",
    ref: "TX-TEST-83916",
    amount: 4500000,
    channel: "COD",
    deviceId: "DEV_KNOWN_90",
    failCount: 0,
    addressReuseCount: 3,
    expectedAnomaly: false,
  },
];

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
  const [riskPoints, setRiskPoints] = useState(rules[0]?.riskPoints ?? 25);
  const [threshold, setThreshold] = useState(rules[0]?.threshold ?? 25);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];
  const signature = JSON.stringify({ selectedRule, riskPoints, threshold });
  const hasRun = testedSignature === signature;
  const testDataset = hasRun ? results : SAMPLE_DATASET;
  const passedCount = hasRun ? results.filter((tx) => tx.status === "PASSED").length : 0;
  const nextVersion = selectedRule ? nextSandboxVersion(selectedRule.version) : null;
  const canPublish = !!onPublishRule && !!selectedRule && !!nextVersion && hasRun && results.length > 0 && passedCount === results.length;

  useEffect(() => {
    setRiskPoints(selectedRule?.riskPoints ?? 25);
    setThreshold(selectedRule?.threshold ?? 25);
    setTestedSignature(null);
    setError("");
  }, [selectedRule]);

  const handleRunSandboxTest = () => {
    if (!selectedRule) return;
    setError("");
    setTestedSignature(null);
    try {
      const evaluated = SAMPLE_DATASET.map((item): TestSampleTx => {
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
        }, riskPoints, threshold);
        return {
          ...item,
          ...result,
          status: result.actualAnomaly === item.expectedAnomaly ? "PASSED" : "FAILED",
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
      riskPoints,
      threshold,
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

        {/* Rule selector & threshold adjusters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
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

          <div>
            <label
              htmlFor="sandbox-points"
              className={styles.drawerLabel}
              style={{ display: "block", marginBottom: 6 }}
            >
              {t.ruleTestingView.controls.riskPoints.replace(
                "{points}",
                String(riskPoints),
              )}
            </label>
            <input
              id="sandbox-points"
              type="range"
              min="1"
              max="100"
              step="1"
              value={riskPoints}
              onChange={(e) => { setRiskPoints(Number(e.target.value)); setTestedSignature(null); setError(""); }}
              style={{ width: "100%", accentColor: "var(--security-orange)" }}
            />
          </div>

          <div>
            <label
              htmlFor="sandbox-threshold"
              className={styles.drawerLabel}
              style={{ display: "block", marginBottom: 6 }}
            >
              {t.ruleTestingView.controls.threshold.replace(
                "{val}",
                String(threshold),
              )}
            </label>
            <input
              id="sandbox-threshold"
              type="range"
              min="1"
              max="100"
              step="1"
              value={threshold}
              onChange={(e) => { setThreshold(Number(e.target.value)); setTestedSignature(null); setError(""); }}
              style={{ width: "100%", accentColor: "var(--security-blue)" }}
            />
          </div>
        </div>
      </div>

      <p className={styles.muted}>
        {language === "vi"
          ? "Thử riêng rule đã chọn trên 5 giao dịch thanh toán mẫu của ABC Fashion, kể cả rule đang tắt. Điểm bằng điểm rule khi khớp, bằng 0 khi không khớp; so với ngưỡng đang chọn. Nhãn kỳ vọng được giữ nguyên. Chỉ phát hành trong demo khi tất cả mẫu đạt."
          : "Test only the selected rule on 5 sample ABC Fashion payments, including disabled rules. A match contributes the rule points; otherwise the score is 0. Compare with the selected threshold. Expected labels stay fixed. Publishing in the demo requires all samples to pass."}
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
                      {item.expectedAnomaly ? t.risk.anomaly : t.risk.normal}
                    </span>
                  </td>
                  <td>
                    {item.actualScore != null ? (
                      <div>
                        <strong
                          style={{
                            color: item.actualAnomaly
                              ? "var(--security-red)"
                              : "var(--security-green)",
                            fontSize: 13,
                          }}
                        >
                          {item.actualScore}/100
                        </strong>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--security-muted)",
                            marginLeft: 6,
                          }}
                        >
                          ({item.actualAnomaly ? t.risk.anomaly : t.risk.normal})
                        </span>
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
