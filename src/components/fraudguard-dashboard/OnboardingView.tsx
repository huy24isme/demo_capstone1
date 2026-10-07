"use client";

import { useState } from "react";
import styles from "./SecurityDashboard.module.css";
import { ShieldCheck, Building2, Key, Lock } from "lucide-react";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";

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
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"in-progress" | "new" | "completed">("in-progress");
  const [currentStep, setCurrentStep] = useState(7); // Currently at Step 7/8 for ABC Fashion
  const [isHandedOver, setIsHandedOver] = useState(false);

  const steps: OnboardingStep[] = [
    {
      step: 1,
      title: language === "vi" ? "SME gửi đặc tả" : "SME Submits Specification",
      description:
        language === "vi"
          ? "ABC Fashion cung cấp nghiệp vụ giám sát đơn COD và mẫu giao dịch 100 dòng."
          : "ABC Fashion supplies COD monitoring rules and 100 sample transactions.",
      status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "upcoming",
      actor: "SME Admin",
    },
    {
      step: 2,
      title: language === "vi" ? "Platform Admin Review" : "Platform Admin Review",
      description:
        language === "vi"
          ? "Xác nhận các trường dữ liệu: COD channel, device ID, address hash, fail count."
          : "Validate data fields: COD channel, device ID, address hash, fail count.",
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 3,
      title: language === "vi" ? "Create Workspace / Project" : "Create Workspace / Project",
      description:
        language === "vi"
          ? "Khởi tạo workspace tenant 'ABC Fashion' và dự án 'COD Order Monitoring' (proj-abc-cod)."
          : "Initialize tenant workspace 'ABC Fashion' and 'COD Order Monitoring' project (proj-abc-cod).",
      status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 4,
      title: language === "vi" ? "Setup Transaction Schema" : "Setup Transaction Schema",
      description:
        language === "vi"
          ? "Cấu hình custom schema cho đơn hàng thương mại điện tử giao nhận COD."
          : "Configure custom schema for e-commerce COD cash-on-delivery orders.",
      status: currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 5,
      title: language === "vi" ? "Setup Detection Rules" : "Setup Detection Rules",
      description:
        language === "vi"
          ? "Thiết lập 4 rules cốt lõi: High Amount, New Device, Failed Tx, Address Reuse."
          : "Configure 4 core rules: High Amount, New Device, Failed Tx, Address Reuse.",
      status: currentStep > 5 ? "completed" : currentStep === 5 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 6,
      title: language === "vi" ? "Setup Data Integration" : "Setup Data Integration",
      description:
        language === "vi"
          ? "Cấp API Key live/staging và thiết lập Webhook endpoint https://api.abcfashion.vn/fraudguard/webhook."
          : "Provision live/staging API keys and configure webhook endpoint https://api.abcfashion.vn/fraudguard/webhook.",
      status: currentStep > 6 ? "completed" : currentStep === 6 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 7,
      title: language === "vi" ? "Test with Sample Data" : "Test with Sample Data",
      description:
        language === "vi"
          ? "Chạy thử 26 giao dịch mẫu qua Sandbox Rule Engine để đánh giá độ chuẩn xác."
          : "Run 26 sample transactions through Sandbox Rule Engine to calibrate precision.",
      status: currentStep > 7 ? "completed" : currentStep === 7 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 8,
      title: language === "vi" ? "Review Result & Validate" : "Review Result & Validate",
      description:
        language === "vi"
          ? "Xác nhận rule trigger chuẩn xác (TX-83912 đạt điểm 82/100 Anomaly)."
          : "Confirm correct rule triggers (TX-83912 scored 82/100 Anomaly).",
      status: currentStep > 8 ? "completed" : currentStep === 8 ? "current" : "upcoming",
      actor: "Platform Admin",
    },
    {
      step: 9,
      title: language === "vi" ? "Handover & Activate" : "Handover & Activate",
      description:
        language === "vi"
          ? "Bàn giao tài khoản SME Admin, khóa quyền truy cập dữ liệu nội bộ của Platform Admin."
          : "Handover credentials to SME Admin and restrict Platform Admin access to private records.",
      status: isHandedOver ? "completed" : currentStep === 9 ? "current" : "upcoming",
      actor: "Platform Admin & SME",
    },
  ];

  const handleAdvanceStep = () => {
    if (currentStep < 8) {
      setCurrentStep((prev) => prev + 1);
      toast(
        "success",
        language === "vi"
          ? `Đã hoàn thành Bước ${currentStep}: Chuyển sang Bước ${currentStep + 1}`
          : `Step ${currentStep} completed: Advanced to Step ${currentStep + 1}`,
      );
    } else if (currentStep === 8) {
      setCurrentStep(9);
      toast(
        "info",
        language === "vi"
          ? "Đã xác nhận kết quả kiểm thử. Sẵn sàng bàn giao Workspace."
          : "Validation confirmed. Ready for workspace handover.",
      );
    }
  };

  const handleHandover = () => {
    setIsHandedOver(true);
    setCurrentStep(9);
    toast(
      "success",
      language === "vi"
        ? "Đã hoàn thành bàn giao Workspace cho ABC Fashion! Ranh giới Handover Boundary đã được kích hoạt."
        : "Workspace handover to ABC Fashion complete! Handover Boundary activated.",
    );
    if (onActivateWorkspace) {
      onActivateWorkspace("ABC Fashion");
    }
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.onboardingView.title}</h1>
          <p>{t.onboardingView.subtitle}</p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={styles.tabs}
        style={{
          marginTop: 20,
          borderBottom: "1px solid var(--security-border)",
        }}
      >
        <button
          className={`${styles.tab} ${activeTab === "in-progress" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("in-progress")}
          type="button"
        >
          {t.onboardingView.tabs.inProgress}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "completed" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("completed")}
          type="button"
        >
          {t.onboardingView.tabs.completed}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "new" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("new")}
          type="button"
        >
          {t.onboardingView.tabs.newReqs}
        </button>
      </div>

      {/* Handover Boundary Callout Banner */}
      <div
        style={{
          marginTop: 18,
          padding: "16px 20px",
          borderRadius: 6,
          background: isHandedOver
            ? "rgba(120, 201, 172, 0.08)"
            : "rgba(217, 119, 6, 0.08)",
          border: `1px solid ${isHandedOver ? "#3f665a" : "#715139"}`,
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 6,
            borderRadius: 4,
            background: isHandedOver
              ? "rgba(120, 201, 172, 0.2)"
              : "rgba(217, 119, 6, 0.2)",
          }}
        >
          {isHandedOver ? (
            <Lock size={22} color="var(--security-green)" />
          ) : (
            <ShieldCheck size={22} color="var(--security-orange)" />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <strong
            style={{
              fontSize: 14,
              color: isHandedOver ? "var(--security-green)" : "var(--security-orange)",
            }}
          >
            {t.onboardingView.boundary.title}{" "}
            {isHandedOver
              ? t.onboardingView.boundary.afterTitle
              : t.onboardingView.boundary.beforeTitle}
          </strong>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--security-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {isHandedOver
              ? t.onboardingView.boundary.afterDesc
              : t.onboardingView.boundary.beforeDesc}
          </p>
        </div>
      </div>

      {/* Case Study Card */}
      <div className={styles.panel} style={{ marginTop: 20, padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
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
                {t.onboardingView.caseStudy.title}
              </h2>
              <span style={{ fontSize: 11, color: "var(--security-muted)" }}>
                {t.onboardingView.caseStudy.projectCode
                  .replace("{code}", "proj-abc-cod")
                  .replace("{tenant}", "tnt-abc-0921")}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className={styles.badge}
              style={{
                background: isHandedOver
                  ? "rgba(120, 201, 172, 0.15)"
                  : "rgba(237, 167, 101, 0.15)",
                color: isHandedOver ? "var(--security-green)" : "var(--security-orange)",
                borderColor: isHandedOver ? "#3f665a" : "#715139",
                fontSize: 11,
                padding: "4px 10px",
              }}
            >
              {isHandedOver
                ? t.onboardingView.caseStudy.badgeCompleted
                : t.onboardingView.caseStudy.badgeStep.replace(
                    "{step}",
                    String(currentStep),
                  )}
            </span>
          </div>
        </div>

        {/* 9 Steps Visual Pipeline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 16,
          }}
        >
          {steps.map((st) => (
            <div
              key={st.step}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderRadius: 6,
                background:
                  st.status === "current"
                    ? "rgba(113, 185, 244, 0.08)"
                    : "var(--security-control)",
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <strong style={{ fontSize: 13, color: "var(--security-text)" }}>
                    Step {st.step}: {st.title}
                  </strong>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--security-subtle)",
                      textTransform: "uppercase",
                    }}
                  >
                    ({st.actor})
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--security-muted)",
                  }}
                >
                  {st.description}
                </p>
              </div>

              <div style={{ flexShrink: 0 }}>
                {st.status === "completed" ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--security-green)",
                      fontWeight: 600,
                    }}
                  >
                    {t.onboardingView.caseStudy.stepCompleted}
                  </span>
                ) : st.status === "current" ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--security-blue)",
                      fontWeight: 600,
                    }}
                  >
                    {t.onboardingView.caseStudy.stepCurrent}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--security-subtle)",
                    }}
                  >
                    {t.onboardingView.caseStudy.stepUpcoming}
                  </span>
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
              <span>{t.onboardingView.actions.descCompleted}</span>
            ) : currentStep < 9 ? (
              <span>{t.onboardingView.actions.descInProgress}</span>
            ) : (
              <span>{t.onboardingView.actions.descReady}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {!isHandedOver && currentStep < 9 && (
              <button
                className={styles.button}
                onClick={handleAdvanceStep}
                type="button"
              >
                {t.onboardingView.actions.btnAdvance}
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
                {t.onboardingView.actions.btnHandover}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
