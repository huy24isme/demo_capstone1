export type RiskLevel = "Critical" | "High" | "Medium" | "Low";
export type ScoringSource = "AI" | "RULE" | "RULE_FALLBACK";
export type CaseStatus =
  | "Open"
  | "Reviewing"
  | "Confirmed Fraud"
  | "False Alarm"
  | "Resolved";

export interface TransactionRisk {
  id: string;
  transactionReference: string;
  projectId: string;
  projectName: string;
  transactionType: string;
  entityReference: string;
  amount?: number;
  currency?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence?: number;
  scoringSource: ScoringSource;
  triggeredRules: string[];
  explanation?: string;
  alertId?: string;
  caseId?: string;
  caseStatus?: CaseStatus;
  processedAt: string;
}

export interface FraudGuardFilters {
  query: string;
  projectId: "all" | string;
  transactionType: "all" | string;
  riskLevel: "all" | RiskLevel;
  scoringSource: "all" | ScoringSource;
  caseStatus: "all" | CaseStatus;
  range: 7 | 30 | 90;
}

/* ── New types for interactivity ── */

export type TableTab = "all" | "alerts" | "cases";

export type SortField =
  | "riskLevel"
  | "riskScore"
  | "processedAt"
  | "projectName"
  | "transactionType";

export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
}

/* ── Rule Engine types ── */

export type ConditionOperator = ">" | ">=" | "<" | "<=" | "==" | "!=" | "in" | "not_in" | "between";
export type LogicGroup = "AND" | "OR";
export type RuleCategory = "velocity" | "amount" | "identity" | "behavior" | "geo" | "device" | "custom";
export type RuleSeverity = "critical" | "high" | "medium" | "low";

export interface RuleConditionNode {
  type: "condition";
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface ConditionGroupNode {
  type: "group";
  id: string;
  logic: LogicGroup;
  children: Array<RuleConditionNode | ConditionGroupNode>;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  conditionGroup: ConditionGroupNode;
  riskPoints: number;
  multiplier?: number;
  threshold: number;
  enabled: boolean;
  appliesTo: {
    transactionTypes: string[];
    projects: string[];
  };
  createdAt: string;
  updatedAt: string;
}

/* ── View types ── */

export type SecondaryView =
  | "risk-overview"
  | "recent-alerts"
  | "active-cases"
  | "rule-templates"
  | "projects"
  | "reports"
  | "audit-trail"
  | "platform-health";

/* ── Project types ── */

export interface ProjectItem {
  id: string;
  name: string;
  code: string;
  description: string;
  environment: "Production" | "Staging";
  apiKey: string;
  webhookUrl?: string;
  quota: {
    used: number;
    total: number;
    resetDate: string;
  };
  status: "Active" | "Inactive";
  createdAt: string;
}

/* ── Audit Trail types ── */

export type AuditAction =
  | "CASE_STATUS_UPDATED"
  | "RULE_CREATED"
  | "RULE_TOGGLED"
  | "RULE_DELETED"
  | "API_KEY_GENERATED"
  | "WEBHOOK_UPDATED"
  | "ALERT_REVIEWED"
  | "EXPORT_GENERATED";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  action: AuditAction;
  target: string;
  ipAddress: string;
  details: string;
}

/* ── RBAC types ── */

export type UserRole =
  | "Platform Admin"
  | "SME Admin"
  | "Risk Staff"
  | "Viewer";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatarLetter: string;
  avatarBg: string;
  description: string;
}

export interface RolePermissions {
  canManageProjects: boolean;
  canManageRules: boolean;
  canManageCases: boolean;
  canViewAudit: boolean;
  canExport: boolean;
  isReadOnly: boolean;
  isSuperAdmin: boolean;
}

/* ── Platform Health & Tenant types ── */

export type ServiceStatus = "Healthy" | "Degraded" | "Offline";

export interface MicroserviceHealth {
  id: string;
  name: string;
  type: "AI Service" | "Rule Gateway" | "Message Queue" | "Database / Cache";
  version: string;
  status: ServiceStatus;
  latencyMs: number;
  throughput: string;
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
  details: string;
}

export interface SmeTenantItem {
  id: string;
  name: string;
  code: string;
  plan: "Free Tier" | "Growth" | "Enterprise";
  scoringEngine: "Dynamic Rules" | "AI Scoring + Fallback";
  totalTransactions: number;
  quotaLimit: number;
  quotaUsed: number;
  status: "Active" | "Warning" | "Suspended";
  joinedDate: string;
  activeProjectsCount: number;
}

export interface FallbackHourlyPoint {
  time: string;
  totalRequests: number;
  aiRequests: number;
  fallbackRequests: number;
  avgLatencyMs: number;
}

