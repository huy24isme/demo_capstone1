"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  Key,
  Plus,
  RefreshCw,
  Sliders,
  Check,
} from "lucide-react";
import type { ProjectItem } from "./types";
import { useToast } from "./ToastProvider";
import styles from "./SecurityDashboard.module.css";

interface ProjectsViewProps {
  initialProjects: ProjectItem[];
}

export function ProjectsView({ initialProjects }: ProjectsViewProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>(initialProjects);
  const [filterEnv, setFilterEnv] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Webhook Modal state
  const [editingWebhookProject, setEditingWebhookProject] =
    useState<ProjectItem | null>(null);
  const [webhookInput, setWebhookInput] = useState<string>("");

  // Create Project Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectEnv, setNewProjectEnv] = useState<"Production" | "Staging">(
    "Production",
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchEnv = filterEnv === "all" || p.environment === filterEnv;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchEnv && matchSearch;
    });
  }, [projects, filterEnv, search]);

  const stats = useMemo(() => {
    const totalCalls = projects.reduce((acc, p) => acc + p.quota.used, 0);
    const totalCap = projects.reduce((acc, p) => acc + p.quota.total, 0);
    return {
      total: projects.length,
      prod: projects.filter((p) => p.environment === "Production").length,
      staging: projects.filter((p) => p.environment === "Staging").length,
      totalCalls,
      quotaPercent: totalCap > 0 ? Math.round((totalCalls / totalCap) * 100) : 0,
    };
  }, [projects]);

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    toast("success", "Đã sao chép API Key vào bộ nhớ tạm");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateKey = (project: ProjectItem) => {
    const prefix = project.environment === "Production" ? "fg_live_" : "fg_test_";
    const newKey =
      prefix +
      Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");

    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, apiKey: newKey } : p)),
    );
    toast("info", `Đã tạo lại API Key mới cho dự án "${project.name}"`);
  };

  const handleOpenWebhookModal = (project: ProjectItem) => {
    setEditingWebhookProject(project);
    setWebhookInput(project.webhookUrl || "");
  };

  const handleSaveWebhook = () => {
    if (!editingWebhookProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === editingWebhookProject.id
          ? { ...p, webhookUrl: webhookInput.trim() || undefined }
          : p,
      ),
    );
    toast("success", `Đã cập nhật Webhook cho "${editingWebhookProject.name}"`);
    setEditingWebhookProject(null);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !newProjectCode.trim()) {
      toast("error", "Vui lòng nhập đầy đủ tên và mã dự án");
      return;
    }
    const prefix = newProjectEnv === "Production" ? "fg_live_" : "fg_test_";
    const newKey =
      prefix +
      Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");

    const newProject: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      code: newProjectCode.trim().toUpperCase(),
      description: newProjectDesc.trim() || "Dự án mới tích hợp FraudGuard",
      environment: newProjectEnv,
      apiKey: newKey,
      quota: {
        used: 0,
        total: newProjectEnv === "Production" ? 50000 : 10000,
        resetDate: "2026-10-01",
      },
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    setProjects((prev) => [...prev, newProject]);
    toast("success", `Đã tạo dự án mới: "${newProject.name}"`);
    setCreateModalOpen(false);
    setNewProjectName("");
    setNewProjectCode("");
    setNewProjectDesc("");
  };

  return (
    <>
      <div className={styles.breadcrumb}>
        FraudGuard / Configuration / Projects & API Keys
      </div>

      <div className={styles.pageHeading}>
        <div>
          <h1>Projects & API Keys</h1>
          <p>
            Quản lý các nguồn dữ liệu tích hợp, khóa xác thực API và Webhook cảnh báo.
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => setCreateModalOpen(true)}
          type="button"
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          New Project
        </button>
      </div>

      {/* KPI Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Total Projects</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>
            {stats.prod} Production · {stats.staging} Staging
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>API Calls This Month</div>
          <strong className={styles.statValue}>
            {stats.totalCalls.toLocaleString("en")}
          </strong>
          <span className={styles.statDescription}>Trên toàn bộ các dự án</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Overall Quota Usage</div>
          <strong
            className={styles.statValue}
            style={{
              color:
                stats.quotaPercent > 80
                  ? "var(--security-orange)"
                  : "var(--security-green)",
            }}
          >
            {stats.quotaPercent}%
          </strong>
          <span className={styles.statDescription}>Tự động reset ngày 01 hàng tháng</span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>Active Status</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-green)" }}
          >
            100%
          </strong>
          <span className={styles.statDescription}>Tất cả API keys hợp lệ</span>
        </article>
      </section>

      {/* Toolbar Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Tìm theo tên hoặc mã dự án..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.control}
            aria-label="Môi trường"
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
          >
            <option value="all">Tất cả môi trường</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className={styles.projectGrid}>
        {filteredProjects.map((project) => {
          const isRevealed = showKey[project.id];
          const quotaRate = Math.round(
            (project.quota.used / project.quota.total) * 100,
          );
          return (
            <article key={project.id} className={styles.projectCard}>
              {/* Header */}
              <div className={styles.projectCardHeader}>
                <div>
                  <h3 className={styles.projectCardTitle}>{project.name}</h3>
                  <p className={styles.projectCardDesc}>{project.description}</p>
                </div>
                <span
                  className={`${styles.projectEnvBadge} ${
                    project.environment === "Production"
                      ? styles.envProd
                      : styles.envStaging
                  }`}
                >
                  {project.environment}
                </span>
              </div>

              {/* API Key Box */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--security-text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    API Secret Key
                  </span>
                  <button
                    className={styles.button}
                    style={{ minHeight: 24, padding: "2px 8px", fontSize: 10 }}
                    onClick={() => handleRegenerateKey(project)}
                    type="button"
                    title="Sinh lại key mới"
                  >
                    <RefreshCw size={11} style={{ marginRight: 4 }} />
                    Regenerate
                  </button>
                </div>

                <div className={styles.apiKeyBox}>
                  <span className={styles.apiKeyCode}>
                    {isRevealed
                      ? project.apiKey
                      : project.apiKey.slice(0, 10) + "••••••••••••••••••"}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      className={styles.button}
                      style={{ minHeight: 26, padding: "4px 8px" }}
                      onClick={() => toggleShowKey(project.id)}
                      type="button"
                      title={isRevealed ? "Ẩn key" : "Hiện key"}
                    >
                      {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      className={styles.button}
                      style={{ minHeight: 26, padding: "4px 8px" }}
                      onClick={() => handleCopyKey(project.apiKey, project.id)}
                      type="button"
                      title="Sao chép"
                    >
                      {copiedId === project.id ? (
                        <Check size={13} color="var(--security-green)" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--security-text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Webhook Notification
                  </span>
                  <button
                    className={styles.button}
                    style={{ minHeight: 24, padding: "2px 8px", fontSize: 10 }}
                    onClick={() => handleOpenWebhookModal(project)}
                    type="button"
                  >
                    Edit URL
                  </button>
                </div>

                <div className={styles.webhookRow}>
                  <Globe size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span className={styles.webhookUrl}>
                    {project.webhookUrl || "Chưa cấu hình webhook"}
                  </span>
                </div>
              </div>

              {/* Monthly Quota Bar */}
              <div className={styles.quotaSection}>
                <div className={styles.quotaHeader}>
                  <span>Hạn mức tháng (Quota)</span>
                  <span>
                    {project.quota.used.toLocaleString("en")} /{" "}
                    {project.quota.total.toLocaleString("en")} ({quotaRate}%)
                  </span>
                </div>
                <div className={styles.quotaBar}>
                  <div
                    className={styles.quotaFill}
                    style={{
                      width: `${Math.min(quotaRate, 100)}%`,
                      background:
                        quotaRate > 80
                          ? "var(--security-orange)"
                          : "var(--security-blue)",
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Edit Webhook Modal */}
      {editingWebhookProject && (
        <div
          className={styles.builderOverlay}
          onClick={() => setEditingWebhookProject(null)}
        >
          <div
            className={styles.builderModal}
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.builderHeader}>
              <h2 className={styles.builderTitle}>
                Cấu hình Webhook — {editingWebhookProject.name}
              </h2>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setEditingWebhookProject(null)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className={styles.builderBody}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--security-muted)",
                  marginTop: 0,
                  marginBottom: 14,
                }}
              >
                Khi có giao dịch rủi ro vượt ngưỡng Critical, FraudGuard sẽ gửi HTTP POST payload tới URL này.
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Webhook Endpoint URL</label>
                <input
                  className={styles.formInput}
                  type="url"
                  placeholder="https://your-api.com/webhooks/fraud-alerts"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.builderFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setEditingWebhookProject(null)}
                type="button"
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSaveWebhook}
                type="button"
              >
                Lưu Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div
          className={styles.builderOverlay}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className={styles.builderModal}
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.builderHeader}>
              <h2 className={styles.builderTitle}>Tạo Dự Án Mới</h2>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setCreateModalOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className={styles.builderBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên dự án *</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="Ví dụ: B2B Payment Portal"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mã định danh (Code) *</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="B2B_PORTAL"
                    value={newProjectCode}
                    onChange={(e) => setNewProjectCode(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Môi trường</label>
                  <select
                    className={styles.formInput}
                    value={newProjectEnv}
                    onChange={(e) =>
                      setNewProjectEnv(e.target.value as "Production" | "Staging")
                    }
                  >
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mô tả mục đích dự án</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Mô tả các loại giao dịch và luồng thanh toán..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.builderFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setCreateModalOpen(false)}
                type="button"
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleCreateProject}
                type="button"
              >
                Tạo Dự Án
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
