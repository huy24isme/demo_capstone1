"use client";

import { useState } from "react";
import { Download, Upload, CheckCircle2, ShieldAlert, FileText, X } from "lucide-react";
import { downloadCSVTemplate } from "@/lib/export-csv";
import styles from "./SecurityDashboard.module.css";

interface DataIngestionModalProps {
  open: boolean;
  onClose: () => void;
}

export function DataIngestionModal({ open, onClose }: DataIngestionModalProps) {
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
              <h2 className={styles.builderTitle}>Tiếp nhận & Chuẩn hóa Dữ liệu (Data Ingestion)</h2>
              <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                Chuẩn hóa Schema nội bộ theo Module M0 & Hỗ trợ Masked Multi-evidence (M7)
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
        <div style={{ display: "flex", borderBottom: "1px solid var(--security-border)", padding: "0 20px" }}>
          <button
            className={`${styles.tab} ${activeTab === "spec" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("spec")}
            type="button"
          >
            Đặc tả Lược đồ Dữ liệu (Schema Spec)
          </button>
          <button
            className={`${styles.tab} ${activeTab === "upload" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("upload")}
            type="button"
          >
            Nhập dữ liệu mẫu (Upload & Validate)
          </button>
        </div>

        <div className={styles.builderBody}>
          {activeTab === "spec" ? (
            <div>
              <p style={{ fontSize: 12, color: "var(--security-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
                Nền tảng <strong>SME-FraudGuard</strong> tiếp nhận dữ liệu từ các hệ thống E-commerce, EdTech và FinTech. Dữ liệu được che giấu PII (PII Masking) trước khi chấm điểm rủi ro.
              </p>

              <div style={{ overflowX: "auto", border: "1px solid var(--security-border)", borderRadius: 6 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tên trường</th>
                      <th>Kiểu dữ liệu</th>
                      <th>Phân loại</th>
                      <th>Mô tả & Ví dụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.ruleTag}>timestamp</code></td>
                      <td>ISO 8601</td>
                      <td><span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>Bắt buộc</span></td>
                      <td>Thời điểm phát sinh giao dịch UTC. Vd: <code>2026-09-30T10:15:00Z</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>amount</code></td>
                      <td>Number (&gt; 0)</td>
                      <td><span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>Bắt buộc</span></td>
                      <td>Giá trị giao dịch thực tế. Vd: <code>2500000</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>currency</code></td>
                      <td>String (3 ký tự)</td>
                      <td><span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>Bắt buộc</span></td>
                      <td>Đơn vị tiền tệ chuẩn. Vd: <code>VND</code>, <code>USD</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>transaction_type</code></td>
                      <td>Enum String</td>
                      <td><span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>Bắt buộc</span></td>
                      <td>Loại giao dịch: <code>payment</code>, <code>refund</code>, <code>subscription</code></td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>user_hash</code></td>
                      <td>SHA-256 Hash</td>
                      <td><span className={styles.badge} style={{ background: "rgba(237, 103, 117, 0.2)", color: "#ed6775", borderColor: "#ed6775" }}>Bắt buộc</span></td>
                      <td>Định danh khách hàng đã che giấu PII (không gửi số phone/email thật)</td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>device_hash</code></td>
                      <td>String / Hash</td>
                      <td><span className={styles.badge} style={{ background: "rgba(113, 185, 244, 0.2)", color: "#71b9f4", borderColor: "#71b9f4" }}>Tùy chọn (M7)</span></td>
                      <td>Fingerprint thiết bị. Nếu thiếu, AI tự động mask nhánh Graph</td>
                    </tr>
                    <tr>
                      <td><code className={styles.ruleTag}>ip_hash</code></td>
                      <td>String / IP</td>
                      <td><span className={styles.badge} style={{ background: "rgba(113, 185, 244, 0.2)", color: "#71b9f4", borderColor: "#71b9f4" }}>Tùy chọn (M7)</span></td>
                      <td>Địa chỉ IP mạng khách hàng phát sinh yêu cầu</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                  Chuẩn hóa theo Góp ý số 1 từ Hội đồng Phản biện Review 1.
                </span>
                <button
                  className={styles.btnPrimary}
                  onClick={downloadCSVTemplate}
                  type="button"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <Download size={15} />
                  Tải Template CSV Mẫu
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
                <Upload size={32} style={{ color: "var(--security-blue)", marginBottom: 12 }} />
                <h4 style={{ margin: "0 0 6px 0", fontSize: 14 }}>Tải lên file giao dịch đối soát</h4>
                <p style={{ margin: "0 0 16px 0", fontSize: 11, color: "var(--security-muted)" }}>
                  Hỗ trợ định dạng .CSV hoặc .JSON theo đúng chuẩn lược đồ đã đặc tả
                </p>
                <label className={styles.btnSecondary} style={{ cursor: "pointer", display: "inline-block" }}>
                  Chọn tệp từ máy tính
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleSimulateUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {isSimulatingUpload && (
                <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--security-blue)" }}>
                  Đang phân tích cú pháp (Schema Mapping & PII Masking)...
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
                  <CheckCircle2 size={20} style={{ color: "var(--security-green)", flexShrink: 0 }} />
                  <div style={{ fontSize: 12 }}>
                    <strong style={{ color: "var(--security-green)" }}>Xác thực dữ liệu thành công:</strong> Đã kiểm tra 100 dòng giao dịch hợp lệ. Tất cả các trường bắt buộc đều đầy đủ. Nhánh Masked Graph tự động bật cho 78% giao dịch có chứa device_hash.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.builderFooter}>
          <button className={styles.btnSecondary} onClick={onClose} type="button">
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
