"use client";

import { useState } from "react";
import styles from "./SecurityDashboard.module.css";
import { CheckCircle2, ChevronRight, Clock, ShieldCheck, Building2, Key, FileText, ArrowRight, Lock } from "lucide-react";
import { useToast } from "./ToastProvider";

interface OnboardingViewProps {
  onActivateWorkspace?: (workspaceName: string) => void;
}

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  actor: string;
}

export function OnboardingView({ onActivateWorkspace }: OnboardingViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"in-progress" | "new" | "completed">("in-progress");
  const [currentStep, setCurrentStep] = useState(7); // Currently at Step 7/8 for ABC Fashion
  const [isHandedOver, setIsHandedOver] = useState(false);

  const steps: OnboardingStep[] = [
    {
      step: 1,
      title: "SME gửi đặc tả",
      description: "ABC Fashion cung cấp nghiệp vụ giám sát đơn COD và mẫu giao dịch 100 dòng.",
      status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "upcoming",
      actor: "SME Admin",
    },
    {
      step: 2,
      title: "Platform Admin Review",
      description: "Xác nhận các trường dữ liệu: COD channel, device ID, address hash, fail count.",
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 3,
      title: "Create Workspace / Project",
      description: "Khởi tạo workspace tenant 'ABC Fashion' và dự án 'COD Order Monitoring' (proj-abc-cod).",
      status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 4,
      title: "Setup Transaction Schema",
      description: "Cấu hình custom schema cho đơn hàng thương mại điện tử giao nhận COD.",
      status: currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 5,
      title: "Setup Detection Rules",
      description: "Thiết lập 4 rules cốt lõi: High Amount, New Device, Failed Tx, Address Reuse.",
      status: currentStep > 5 ? "completed" : currentStep === 5 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 6,
      title: "Setup Data Integration",
      description: "Cấp API Key live/staging và thiết lập Webhook endpoint https://api.abcfashion.vn/fraudguard/webhook.",
      status: currentStep > 6 ? "completed" : currentStep === 6 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 7,
      title: "Test with Sample Data",
      description: "Chạy thử 26 giao dịch mẫu qua Sandbox Rule Engine để đánh giá độ chuẩn xác.",
      status: currentStep > 7 ? "completed" : currentStep === 7 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 8,
      title: "Review Result & Validate",
      description: "Xác nhận rule trigger chuẩn xác (TX-83912 đạt điểm 82/100 Anomaly).",
      status: currentStep > 8 ? "completed" : currentStep === 8 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 9,
      title: "Handover & Activate",
      description: "Bàn giao tài khoản SME Admin, khóa quyền truy cập dữ liệu nội bộ của Platform Admin.",
      status: isHandedOver ? "completed" : currentStep === 9 ? "current" : "upcoming",
      actor: "Platform Admin & SME",
    },
  ];

  const handleAdvanceStep = () => {
    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
      toast("success", `Đã hoàn thành Bước ${currentStep}: Chuyển sang Bước ${currentStep + 1}`);
    } else if (currentStep === 8) {
      setCurrentStep(9);
      toast("info", "Đã xác nhận kết quả kiểm thử. Sẵn sàng bàn giao Workspace.");
    }
  };

  const handleHandover = () => {
    setIsHandedOver(true);
    setCurrentStep(9);
    toast("success", "Đã hoàn thành bàn giao Workspace cho ABC Fashion! Ranh giới Handover Boundary đã được kích hoạt.");
    if (onActivateWorkspace) {
      onActivateWorkspace("ABC Fashion");
    }
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>Enterprise Onboarding & Workspace Handover</h1>
          <p>
            Quy trình tiếp nhận đặc tả doanh nghiệp, cấu hình schema, kiểm thử rule ban đầu và bàn giao vận hành.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs} style={{ marginTop: 20, borderBottom: "1px solid var(--security-border)" }}>
        <button
          className={`${styles.tab} ${activeTab === "in-progress" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("in-progress")}
          type="button"
        >
          Đang triển khai (ABC Fashion)
        </button>
        <button
          className={`${styles.tab} ${activeTab === "completed" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("completed")}
          type="button"
        >
          Đã bàn giao (Production Workspaces)
        </button>
        <button
          className={`${styles.tab} ${activeTab === "new" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("new")}
          type="button"
        >
          Yêu cầu mới (Inbound Pipeline)
        </button>
      </div>

      {/* Handover Boundary Callout Banner */}
      <div
        style={{
          marginTop: 18,
          padding: "16px 20px",
          borderRadius: 6,
          background: isHandedOver ? "rgba(120, 201, 172, 0.08)" : "rgba(217, 119, 6, 0.08)",
          border: `1px solid ${isHandedOver ? "#3f665a" : "#715139"}`,
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div style={{ padding: 6, borderRadius: 4, background: isHandedOver ? "rgba(120, 201, 172, 0.2)" : "rgba(217, 119, 6, 0.2)" }}>
          {isHandedOver ? <Lock size={22} color="var(--security-green)" /> : <ShieldCheck size={22} color="var(--security-orange)" />}
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14, color: isHandedOver ? "var(--security-green)" : "var(--security-orange)" }}>
            Handover Boundary (Ranh giới Bàn giao Doanh nghiệp): {isHandedOver ? "AFTER HANDOVER (PRODUCTION)" : "BEFORE HANDOVER (STAGING / SETUP)"}
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--security-text-secondary)", lineHeight: 1.6 }}>
            {isHandedOver
              ? "Workspace đã trở thành môi trường vận hành riêng của SME. Platform Admin bị giới hạn, không truy cập trực tiếp vào hồ sơ giao dịch hay đóng case của khách hàng. Mọi thay đổi Rule về sau phải qua Change Request và kiểm thử tại Rule Testing Sandbox."
              : "Workspace đang trong giai đoạn triển khai kỹ thuật. Platform Admin có toàn quyền cấu hình schema, thiết lập detection rule, nạp sample data và chạy thử nghiệm để tinh chỉnh ngưỡng trước khi bàn giao."}
          </p>
        </div>
      </div>

      {/* Case Study Card */}
      <div className={styles.panel} style={{ marginTop: 20, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "rgba(113, 185, 244, 0.15)",
                display: "grid",
                placeItems: "center",
                color: "var(--security-blue)",
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                ABC Fashion — COD Order Monitoring
              </h2>
              <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                Mã dự án: <code>proj-abc-cod</code> · Gói: Enterprise · Tenant ID: <code>tnt-abc-0921</code>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className={styles.badge}
              style={{
                background: isHandedOver ? "rgba(120, 201, 172, 0.15)" : "rgba(237, 167, 101, 0.15)",
                color: isHandedOver ? "var(--security-green)" : "var(--security-orange)",
                borderColor: isHandedOver ? "#3f665a" : "#715139",
                fontSize: 11,
                padding: "4px 10px",
              }}
            >
              {isHandedOver ? "COMPLETED & ACTIVATED" : `ONBOARDING STEP ${currentStep}/9`}
            </span>
          </div>
        </div>

        {/* 9 Steps Visual Pipeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {steps.map((st) => (
            <div
              key={st.step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderRadius: 6,
                background: st.status === "current" ? "rgba(113, 185, 244, 0.08)" : "var(--security-control)",
                border: `1px solid ${st.status === "current" ? "var(--security-blue)" : "var(--security-border)"}`,
                opacity: st.status === "upcoming" ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background:
                    st.status === "completed"
                      ? "var(--security-green)"
                      : st.status === "current"
                      ? "var(--security-blue)"
                      : "var(--security-border)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {st.status === "completed" ? "✓" : st.step}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <strong style={{ fontSize: 13, color: "var(--security-text)" }}>
                    Step {st.step}: {st.title}
                  </strong>
                  <span style={{ fontSize: 10, color: "var(--security-subtle)", textTransform: "uppercase" }}>
                    ({st.actor})
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--security-muted)" }}>
                  {st.description}
                </p>
              </div>

              <div style={{ flexShrink: 0 }}>
                {st.status === "completed" ? (
                  <span style={{ fontSize: 11, color: "var(--security-green)", fontWeight: 600 }}>Hoàn thành</span>
                ) : st.status === "current" ? (
                  <span style={{ fontSize: 11, color: "var(--security-blue)", fontWeight: 600 }}>Đang thực hiện</span>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--security-subtle)" }}>Chờ</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--security-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--security-muted)" }}>
            {isHandedOver ? (
              <span>Doanh nghiệp đã chính thức nhận bàn giao và đang tự vận hành hồ sơ rủi ro.</span>
            ) : currentStep < 9 ? (
              <span>Đang trong giai đoạn chuẩn bị kỹ thuật. Bấm nút để tiến hành kiểm thử và chuyển bước.</span>
            ) : (
              <span>Đã hoàn thành kiểm thử. Sẵn sàng bàn giao hệ thống cho ABC Fashion.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!isHandedOver && currentStep < 9 && (
              <button className={styles.button} onClick={handleAdvanceStep} type="button">
                Chuyển bước kế tiếp →
              </button>
            )}

            {!isHandedOver && (
              <button
                className={styles.drawerPrimaryBtn}
                onClick={handleHandover}
                type="button"
                style={{
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  padding: "0 18px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Key size={14} />
                Bàn giao & Kích hoạt Workspace (Handover)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
