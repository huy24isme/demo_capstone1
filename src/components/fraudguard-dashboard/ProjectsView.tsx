"use client";

import { useMemo, useState } from "react";
import { useDialogFocus } from './useDialogFocus';
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  Plus,
  RefreshCw,
   Check,
} from "lucide-react";
import type { ProjectItem, RolePermissions } from "./types";
import { useToast } from "./ToastProvider";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface ProjectsViewProps {
  initialProjects: ProjectItem[];
  onProjectsChange: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  permissions?: RolePermissions;

}

export function ProjectsView({
  initialProjects,
  onProjectsChange,
  permissions,

}: ProjectsViewProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";
  const canManage = permissions ? permissions.canManageProjects : true;
  const { toast } = useToast();
  const projects = initialProjects;
  const setProjects = onProjectsChange;
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
  const createRef = useDialogFocus(createModalOpen, () => setCreateModalOpen(false));
  const webhookRef = useDialogFocus(!!editingWebhookProject, () => setEditingWebhookProject(null));
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
    toast(
      "success",
      language === "vi"
        ? "Đã sao chép API Key vào bộ nhớ tạm"
        : "API Key copied to clipboard",
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateKey = (project: ProjectItem) => {
    if (!canManage) return;
    const prefix = project.environment === "Production" ? "fg_demo_live_" : "fg_demo_test_";
    const newKey =
      prefix +
      Array.from({ length: 24 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");

    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, apiKey: newKey } : p)),
    );
    toast(
      "info",
      language === "vi"
        ? `Đã tạo lại API Key mới cho dự án "${project.name}"`
        : `New API Key generated for "${project.name}"`,
    );
  };

  const handleOpenWebhookModal = (project: ProjectItem) => {
    setEditingWebhookProject(project);
    setWebhookInput(project.webhookUrl || "");
  };

  const handleSaveWebhook = () => {
    if (!canManage || !editingWebhookProject) return;
    if (webhookInput.trim()) {
      try { const url = new URL(webhookInput.trim()); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
      catch { toast('error', language === 'vi' ? 'Webhook phải là URL HTTP/HTTPS hợp lệ, không chứa mật khẩu.' : 'Enter a valid HTTP/HTTPS URL without credentials.'); return; }
    }
    setProjects((prev) =>
      prev.map((p) =>
        p.id === editingWebhookProject.id
          ? { ...p, webhookUrl: webhookInput.trim() || undefined }
          : p,
      ),
    );
    toast(
      "success",
      language === "vi"
        ? `Đã cập nhật Webhook cho "${editingWebhookProject.name}"`
        : `Webhook updated for "${editingWebhookProject.name}"`,
    );
    setEditingWebhookProject(null);
  };

  const handleCreateProject = () => {
    if (!canManage) return;
    if (projects.some(p => p.code.toUpperCase() === newProjectCode.trim().toUpperCase())) { toast('error', language === 'vi' ? 'Mã dự án đã tồn tại.' : 'Project code already exists.'); return; }
    if (!newProjectName.trim() || !newProjectCode.trim()) {
      toast(
        "error",
        language === "vi"
          ? "Vui lòng nhập đầy đủ tên và mã dự án"
          : "Please enter both project name and code",
      );
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
      description:
        newProjectDesc.trim() ||
        (language === "vi"
          ? "Dự án mới tích hợp FraudGuard"
          : "New FraudGuard integration project"),
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
    toast(
      "success",
      language === "vi"
        ? `Đã tạo dự án mới: "${newProject.name}"`
        : `Created new project: "${newProject.name}"`,
    );
    setCreateModalOpen(false);
    setNewProjectName("");
    setNewProjectCode("");
    setNewProjectDesc("");
  };

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <h1>{t.projectsView.title}</h1>
          <p>{language === 'vi' ? 'Quản lý các dự án gửi giao dịch và nơi nhận thông báo cảnh báo.' : 'Manage projects that submit transactions and receive alert notifications.'}</p>
        </div>
        <button
          className={`${styles.btnPrimary} ${!canManage ? styles.actionDisabledTooltip : ""}`}
          onClick={() => canManage && setCreateModalOpen(true)}
          disabled={!canManage}
          title={!canManage ? "SME Admin permission required" : undefined}
          type="button"
        >
          <Plus size={15} style={{ marginRight: 6 }} />
          {t.projectsView.btnCreate}
        </button>
      </div>

      {/* KPI Stats */}
      <section className={styles.metricsGrid} style={{ marginTop: 24 }}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.projectsView.kpis.total}</div>
          <strong className={styles.statValue}>{stats.total}</strong>
          <span className={styles.statDescription}>
            {t.projectsView.kpis.totalDesc
              .replace("{prod}", String(stats.prod))
              .replace("{staging}", String(stats.staging))}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.projectsView.kpis.calls}</div>
          <strong className={styles.statValue}>
            {stats.totalCalls.toLocaleString(dateLocale)}
          </strong>
          <span className={styles.statDescription}>
            {t.projectsView.kpis.callsDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.projectsView.kpis.quota}</div>
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
          <span className={styles.statDescription}>
            {t.projectsView.kpis.quotaDesc}
          </span>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>{t.projectsView.kpis.status}</div>
          <strong
            className={styles.statValue}
            style={{ color: "var(--security-green)" }}
          >
            100%
          </strong>
          <span className={styles.statDescription}>
            {t.projectsView.kpis.statusDesc}
          </span>
        </article>
      </section>

      {/* Toolbar Filters */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder={t.projectsView.searchPlaceholder}
            aria-label={t.projectsView.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.control}
            aria-label="Environment"
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
          >
            <option value="all">{t.projectsView.filterAllEnv}</option>
            <option value="Production">{t.projectsView.filterProd}</option>
            <option value="Staging">{t.projectsView.filterStaging}</option>
          </select>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className={styles.projectGrid}>
        {filteredProjects.length === 0 ? (
          <div className={styles.muted} style={{ padding: "20px 0" }}>
            {t.projectsView.emptyMessage}
          </div>
        ) : (
          filteredProjects.map((project) => {
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
                      {t.projectsView.card.apiKey}
                    </span>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      style={{ minHeight: 34, padding: "4px 8px", fontSize: 11 }}
                      onClick={() => canManage && handleRegenerateKey(project)}
                      disabled={!canManage}
                      type="button"
                      title={t.projectsView.card.btnRegenerate}
                    >
                      <RefreshCw size={11} style={{ marginRight: 4 }} />
                      {t.projectsView.card.btnRegenerate}
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
                        title={isRevealed ? "Hide" : "Show"}
                      >
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        className={styles.button}
                        style={{ minHeight: 26, padding: "4px 8px" }}
                        onClick={() => handleCopyKey(project.apiKey, project.id)}
                        type="button"
                        title={t.projectsView.card.btnCopy}
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
                      {t.projectsView.card.webhook}
                    </span>
                    <button
                      className={`${styles.button} ${!canManage ? styles.actionDisabledTooltip : ""}`}
                      style={{ minHeight: 34, padding: "4px 8px", fontSize: 11 }}
                      onClick={() => canManage && handleOpenWebhookModal(project)}
                      disabled={!canManage}
                      type="button"
                      title={t.projectsView.card.btnConfigWebhook}
                    >
                      {t.projectsView.card.btnConfigWebhook}
                    </button>
                  </div>

                  <div className={styles.webhookRow}>
                    <Globe size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span className={styles.webhookUrl}>
                      {project.webhookUrl || t.projectsView.card.notConfigured}
                    </span>
                  </div>
                </div>

                {/* Monthly Quota Bar */}
                <div className={styles.quotaSection}>
                  <div className={styles.quotaHeader}>
                    <span>{t.projectsView.card.quota}</span>
                    <span>
                      {project.quota.used.toLocaleString(dateLocale)} /{" "}
                      {project.quota.total.toLocaleString(dateLocale)} ({quotaRate}%)
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
          })
        )}
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
            ref={webhookRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={t.projectsView.modalWebhook.title.replace('{name}', editingWebhookProject.name)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.builderHeader}>
              <h2 className={styles.builderTitle}>
                {t.projectsView.modalWebhook.title.replace(
                  "{name}",
                  editingWebhookProject.name,
                )}
              </h2>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setEditingWebhookProject(null)}
                aria-label={language === 'vi' ? 'Đóng' : 'Close'}
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
                {t.projectsView.modalWebhook.desc}
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {t.projectsView.modalWebhook.urlLabel}
                </label>
                <input
                  className={styles.formInput}
                  type="url"
                  aria-label={t.projectsView.modalWebhook.urlLabel}
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
                {t.projectsView.modalWebhook.btnCancel}
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSaveWebhook}
                type="button"
              >
                {t.projectsView.modalWebhook.btnSave}
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
            ref={createRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={t.projectsView.modalCreate.title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.builderHeader}>
              <h2 className={styles.builderTitle}>
                {t.projectsView.modalCreate.title}
              </h2>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setCreateModalOpen(false)}
                aria-label={language === 'vi' ? 'Đóng' : 'Close'}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className={styles.builderBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {t.projectsView.modalCreate.nameLabel}
                </label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder={t.projectsView.modalCreate.namePlaceholder}
                  aria-label={t.projectsView.modalCreate.nameLabel}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    {t.projectsView.modalCreate.codeLabel}
                  </label>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder={t.projectsView.modalCreate.codePlaceholder}
                    aria-label={t.projectsView.modalCreate.codeLabel}
                    value={newProjectCode}
                    onChange={(e) => setNewProjectCode(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    {t.projectsView.modalCreate.envLabel}
                  </label>
                  <select
                    className={styles.formInput}
                    value={newProjectEnv}
                    aria-label={t.projectsView.modalCreate.envLabel}
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
                <label className={styles.formLabel}>
                  {t.projectsView.modalCreate.descLabel}
                </label>
                <textarea
                  className={styles.formTextarea}
                  placeholder={t.projectsView.modalCreate.descPlaceholder}
                  aria-label={t.projectsView.modalCreate.descLabel}
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
                {t.projectsView.modalCreate.btnCancel}
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleCreateProject}
                type="button"
              >
                {t.projectsView.modalCreate.btnSubmit}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
