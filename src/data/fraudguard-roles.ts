import type { RolePermissions, UserProfile, UserRole } from "../components/fraudguard-dashboard/types";

export const DEMO_USERS: UserProfile[] = [
  {
    id: "usr-sme-admin",
    name: "Trần Mai Anh",
    email: "anh.tm@fraudguard.sme",
    role: "SME Admin",
    title: "Security & Risk Lead",
    avatarLetter: "A",
    avatarBg: "#7c3aed", // Purple
    description: "Quản trị viên doanh nghiệp: Toàn quyền cấu hình Rules, Projects, API Keys, Webhooks và phân bổ hạn ngạch.",
  },
  {
    id: "usr-risk-staff",
    name: "Nguyễn Văn Hùng",
    email: "hung.nv@fraudguard.sme",
    role: "Risk Staff",
    title: "Fraud Operations Specialist",
    avatarLetter: "H",
    avatarBg: "#2563eb", // Blue
    description: "Chuyên viên điều tra: Thẩm định cảnh báo rủi ro, tạo & cập nhật Case, ghi chú điều tra. Không có quyền sửa Rules hoặc API Keys.",
  },
  {
    id: "usr-viewer",
    name: "Vũ Minh Quân",
    email: "quan.vm@external-audit.vn",
    role: "Viewer",
    title: "External Auditor / Executive",
    avatarLetter: "Q",
    avatarBg: "#059669", // Green
    description: "Kiểm toán viên độc lập / Ban giám đốc: Chế độ Read-only. Chỉ xem danh sách giao dịch, báo cáo, nhật ký kiểm toán và xuất CSV.",
  },
  {
    id: "usr-platform-admin",
    name: "Lê Hoàng Phúc",
    email: "phuc.lh@fraudguard.io",
    role: "Platform Admin",
    title: "Platform Superadmin",
    avatarLetter: "P",
    avatarBg: "#d97706", // Amber
    description: "Quản trị viên nền tảng SaaS: Toàn quyền hệ thống, hỗ trợ kỹ thuật các tenant, giám sát Platform Health và Global Audit.",
  },
];

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case "Platform Admin":
      return {
        canManageProjects: true,
        canManageRules: true,
        canManageCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: true,
      };
    case "SME Admin":
      return {
        canManageProjects: true,
        canManageRules: true,
        canManageCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: false,
      };
    case "Risk Staff":
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: false,
      };
    case "Viewer":
    default:
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: false,
        canViewAudit: true,
        canExport: true,
        isReadOnly: true,
        isSuperAdmin: false,
      };
  }
}

export interface PermissionMatrixItem {
  capability: string;
  category: string;
  platformAdmin: string;
  smeAdmin: string;
  riskStaff: string;
  viewer: string;
}

export const PERMISSION_MATRIX_DATA: PermissionMatrixItem[] = [
  {
    capability: "Xem Dashboard & KPIs phân tích rủi ro",
    category: "Monitoring",
    platformAdmin: "Theo support scope",
    smeAdmin: "Có",
    riskStaff: "Có",
    viewer: "Có",
  },
  {
    capability: "Xem danh sách giao dịch, Risk Score & AI Explanation",
    category: "Monitoring",
    platformAdmin: "Theo support scope",
    smeAdmin: "Có",
    riskStaff: "Có",
    viewer: "Có",
  },
  {
    capability: "Tạo & Cập nhật trạng thái Case, thêm ghi chú",
    category: "Case Management",
    platformAdmin: "Theo support scope",
    smeAdmin: "Theo quyền",
    riskStaff: "Có (Toàn quyền)",
    viewer: "Không (Read-only)",
  },
  {
    capability: "Tạo, chỉnh sửa, bật/tắt & xóa Rule Templates",
    category: "Rule Engine",
    platformAdmin: "Cấu hình ban đầu",
    smeAdmin: "Có (Toàn quyền)",
    riskStaff: "Không (Chỉ xem)",
    viewer: "Không (Chỉ xem)",
  },
  {
    capability: "Quản trị Project, tạo/regenerate/revoke API Key",
    category: "Integration",
    platformAdmin: "Theo support scope",
    smeAdmin: "Có (Toàn quyền)",
    riskStaff: "Không",
    viewer: "Không",
  },
  {
    capability: "Cấu hình Webhook nhận sự kiện gian lận",
    category: "Integration",
    platformAdmin: "Hỗ trợ",
    smeAdmin: "Có",
    riskStaff: "Không",
    viewer: "Không",
  },
  {
    capability: "Xem báo cáo hiệu suất & Xuất dữ liệu CSV",
    category: "Reporting",
    platformAdmin: "Toàn hệ thống",
    smeAdmin: "Trong tenant",
    riskStaff: "Trong tenant",
    viewer: "Có (Read-only)",
  },
  {
    capability: "Xem Security Audit Trail (Nhật ký kiểm toán)",
    category: "Audit & Compliance",
    platformAdmin: "Toàn hệ thống",
    smeAdmin: "Trong tenant",
    riskStaff: "Theo quyền",
    viewer: "Read-only",
  },
  {
    capability: "Quản lý Quota, Subscription Plan & Platform Health",
    category: "Platform Administration",
    platformAdmin: "Có (Toàn quyền)",
    smeAdmin: "Chỉ xem usage",
    riskStaff: "Không",
    viewer: "Không",
  },
];
