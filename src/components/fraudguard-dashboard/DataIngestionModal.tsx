"use client";

import { useState } from "react";
import { Download, Upload, CheckCircle2, FileText, X } from "lucide-react";
import { downloadCSVTemplate } from "@/lib/export-csv";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface DataIngestionModalProps {
  open: boolean;
  onClose: () => void;
}

export function DataIngestionModal({ open, onClose }: DataIngestionModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"spec" | "upload">("spec");
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!open) return null;

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsSimulatingUpload(true);
      setTimeout(() => {
        setIsSimulatingUpload(false);
        setUploadSuccess(true);
      }, 1000);
    }
  };

  return (
    <>
      <div className={styles.builderOverlay} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.builderModal}
        style={{ maxWidth: 760 }}
        role="dialog"
        aria-label="Data Ingestion Specification & Template"
      >
        <div className={styles.builderHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={18} style={{ color: "var(--security-blue)" }} />
            <div>
              <h2 className={styles.builderTitle}>
                {t.dataIngestionModal.title}
              </h2>
              <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                {t.dataIngestionModal.subtitle}
              </span>
            </div>
          </div>
          <button
            className={styles.drawerCloseBtn}
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--security-border)",
            padding: "0 20px",
          }}
        >
          <button
            className={`${styles.tab} ${activeTab === "spec" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("spec")}
            type="button"
          >
            {t.dataIngestionModal.tabSpec}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "upload" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("upload")}
            type="button"
          >
            {t.dataIngestionModal.tabUpload}
          </button>
        </div>

        <div className={styles.builderBody}>
          {activeTab === "spec" ? (
            <div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--security-text-secondary)",
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                {t.dataIngestionModal.specDesc}
              </p>

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid var(--security-border)",
                  borderRadius: 6,
                }}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t.dataIngestionModal.tableHeaders.fieldName}</th>
                      <th>{t.dataIngestionModal.tableHeaders.dataType}</th>
                      <th>{t.dataIngestionModal.tableHeaders.classification}</th>
                      <th>{t.dataIngestionModal.tableHeaders.description}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.ruleTag}>timestamp</code></td>
                      <td>ISO 8601</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(237, 103, 117, 0.2)",
                            color: "#ed6775",
                            borderColor: "#ed6775",
                          }}
                        >
                          {t.dataIngestionModal.requiredBadge}
                        </span>
                      </td>
                      <td>Thời điểm phát sinh giao dịch UTC. Vd: <code>2026-09-30T10:15:00Z</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>amount</code></td>
                      <td>Number (&gt; 0)</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(237, 103, 117, 0.2)",
                            color: "#ed6775",
                            borderColor: "#ed6775",
                          }}
                        >
                          {t.dataIngestionModal.requiredBadge}
                        </span>
                      </td>
                      <td>Giá trị giao dịch thực tế. Vd: <code>2500000</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>currency</code></td>
                      <td>String (3 ký tự)</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(237, 103, 117, 0.2)",
                            color: "#ed6775",
                            borderColor: "#ed6775",
                          }}
                        >
                          {t.dataIngestionModal.requiredBadge}
                        </span>
                      </td>
                      <td>Đơn vị tiền tệ chuẩn. Vd: <code>VND</code>, <code>USD</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>transaction_type</code></td>
                      <td>Enum String</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(237, 103, 117, 0.2)",
                            color: "#ed6775",
                            borderColor: "#ed6775",
                          }}
                        >
                          {t.dataIngestionModal.requiredBadge}
                        </span>
                      </td>
                      <td>Loại giao dịch: <code>payment</code>, <code>refund</code>, <code>subscription</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>user_hash</code></td>
                      <td>SHA-256 Hash</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(237, 103, 117, 0.2)",
                            color: "#ed6775",
                            borderColor: "#ed6775",
                          }}
                        >
                          {t.dataIngestionModal.requiredBadge}
                        </span>
                      </td>
                      <td>Định danh khách hàng đã che giấu PII (không gửi số phone/email thật)</td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>device_hash</code></td>
                      <td>String / Hash</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(113, 185, 244, 0.2)",
                            color: "#71b9f4",
                            borderColor: "#71b9f4",
                          }}
                        >
                          {t.dataIngestionModal.optionalBadge}
                        </span>
                      </td>
                      <td>Fingerprint thiết bị. Nếu thiếu, AI tự động mask nhánh Graph</td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>ip_hash</code></td>
                      <td>String / IP</td>
                      <td>
                        <span
                          className={styles.badge}
                          style={{
                            background: "rgba(113, 185, 244, 0.2)",
                            color: "#71b9f4",
                            borderColor: "#71b9f4",
                          }}
                        >
                          {t.dataIngestionModal.optionalBadge}
                        </span>
                      </td>
                      <td>Địa chỉ IP mạng khách hàng phát sinh yêu cầu</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                  {t.dataIngestionModal.councilNote}
                </span>
                <button
                  className={styles.btnPrimary}
                  onClick={downloadCSVTemplate}
                  type="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <Download size={15} />
                  {t.dataIngestionModal.btnDownloadTemplate}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 0" }}>
              <div
                style={{
                  border: "2px dashed var(--security-border-strong)",
                  borderRadius: 8,
                  padding: 30,
                  textAlign: "center",
                  background: "rgba(255, 255, 255, 0.01)",
                }}
              >
                <Upload
                  size={32}
                  style={{ color: "var(--security-blue)", marginBottom: 12 }}
                />
                <h4 style={{ margin: "0 0 6px 0", fontSize: 14 }}>
                  {t.dataIngestionModal.uploadZoneTitle}
                </h4>
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: 11,
                    color: "var(--security-muted)",
                  }}
                >
                  {t.dataIngestionModal.uploadZoneSub}
                </p>
                <label
                  className={styles.btnSecondary}
                  style={{ cursor: "pointer", display: "inline-block" }}
                >
                  {t.dataIngestionModal.btnChooseFile}
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleSimulateUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {isSimulatingUpload && (
                <div
                  style={{
                    marginTop: 16,
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--security-blue)",
                  }}
                >
                  {t.dataIngestionModal.simulatingMsg}
                </div>
              )}

              {uploadSuccess && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "rgba(120, 201, 172, 0.15)",
                    border: "1px solid var(--security-green)",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CheckCircle2
                    size={20}
                    style={{ color: "var(--security-green)", flexShrink: 0 }}
                  />
                  <div style={{ fontSize: 12 }}>
                    {t.dataIngestionModal.successMsg}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.builderFooter}>
          <button
            className={styles.btnSecondary}
            onClick={onClose}
            type="button"
          >
            {t.dataIngestionModal.btnClose}
          </button>
        </div>
      </div>
    </>
  );
}
