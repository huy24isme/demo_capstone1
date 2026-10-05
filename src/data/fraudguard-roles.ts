import type { RolePermissions, UserProfile, UserRole } from "../components/fraudguard-dashboard/types";

export const DEMO_USERS: UserProfile[] = [
  {
    id: "usr-platform-admin",
    name: "Lê Hoàng Phúc",
    email: "phuc.lh@fraudguard.io",
    role: "Platform Admin",
    title: "Platform Superadmin",
    avatarLetter: "P",
    avatarBg: "#d97706", // Amber
    description: "Quản trị viên nền tảng SaaS: Tiếp nhận đặc tả doanh nghiệp, onboarding khách hàng, cấu hình & kiểm thử rule sandbox trước khi bàn giao.",
  },
  {
    id: "usr-sme-admin",
    name: "Trần Mai Anh",
    email: "anh.tm@abcfashion.vn",
    role: "SME Admin",
    title: "Security & Risk Lead",
    avatarLetter: "A",
    avatarBg: "#7c3aed", // Purple
    description: "Quản trị viên doanh nghiệp (ABC Fashion): Giám sát tổng quan, quản lý thành viên & phân quyền, cấu hình API Key và xem báo cáo điều hành.",
  },
  {
    id: "usr-operation",
    name: "Đặng Tuấn Kiệt",
    email: "kiet.dt@abcfashion.vn",
    role: "Operation",
    title: "Risk Operations Team Leader",
    avatarLetter: "K",
    avatarBg: "#2563eb", // Blue
    description: "Trưởng nhóm vận hành: Quản lý hàng đợi cảnh báo, phân công case cho điều tra viên, duyệt báo cáo điều tra và đưa ra quyết định xử lý cuối cùng.",
  },
  {
    id: "usr-investigator",
    name: "Nguyễn Văn An",
    email: "an.nv@abcfashion.vn",
    role: "Investigator",
    title: "Fraud Field Investigator",
    avatarLetter: "N",
    avatarBg: "#0284c7", // Sky blue
    description: "Điều tra viên hiện trường: Tiếp nhận case được giao (My Cases), xác minh chứng cứ đơn COD, ghi chú và gửi báo cáo kết luận về cho Operation.",
  },
  {
    id: "usr-viewer",
    name: "Vũ Minh Quân",
    email: "quan.vm@external-audit.vn",
    role: "Viewer",
    title: "External Auditor / Executive",
    avatarLetter: "Q",
    avatarBg: "#059669", // Emerald green
    description: "Kiểm toán viên / Ban lãnh đạo: Chế độ chỉ đọc (Read-only). Xem danh sách giao dịch, báo cáo, và xuất dữ liệu mà không có quyền thay đổi.",
  },
];

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case "Platform Admin":
      return {
        canManageProjects: true,
        canManageRules: true,
        canManageCases: true,
        canInvestigateCases: true,
        canViewAllCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: true,
        canAccessRuleTesting: true,
        canAccessOnboarding: true,
      };
    case "SME Admin":
      return {
        canManageProjects: true,
        canManageRules: true,
        canManageCases: true,
        canInvestigateCases: false,
        canViewAllCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: false,
        canAccessRuleTesting: false,
        canAccessOnboarding: false,
      };
    case "Operation":
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: true, // Assign, review reports, close/confirm
        canInvestigateCases: true,
        canViewAllCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: false,
        isSuperAdmin: false,
        canAccessRuleTesting: false,
        canAccessOnboarding: false,
      };
    case "Investigator":
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: false, // Cannot assign or close case
        canInvestigateCases: true, // Can submit investigation notes & report
        canViewAllCases: false, // Only "My Cases"
        canViewAudit: false,
        canExport: false,
        isReadOnly: false,
        isSuperAdmin: false,
        canAccessRuleTesting: false,
        canAccessOnboarding: false,
      };
    case "Viewer":
    default:
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: false,
        canInvestigateCases: false,
        canViewAllCases: true,
        canViewAudit: true,
        canExport: true,
        isReadOnly: true,
        isSuperAdmin: false,
        canAccessRuleTesting: false,
        canAccessOnboarding: false,
      };
  }
}

export interface PermissionMatrixItem {
  capability: string;
  category: string;
  platformAdmin: string;
  smeAdmin: string;
  operation: string;
  investigator: string;
  viewer: string;
}

export const PERMISSION_MATRIX_DATA: PermissionMatrixItem[] = [
  {
    capability: "Onboarding doanh nghiệp & thiết lập Schema ban đầu",
    category: "Onboarding",
    platformAdmin: "Có (Toàn quyền)",
    smeAdmin: "Gửi đặc tả",
    operation: "Không",
    investigator: "Không",
    viewer: "Không",
  },
  {
    capability: "Kiểm thử Sandbox & Quản lý Version Rule (v1, v2...)",
    category: "Rule Lifecycle",
    platformAdmin: "Có (Môi trường test riêng)",
    smeAdmin: "Gửi Change Request",
    operation: "Không",
    investigator: "Không",
    viewer: "Không",
  },
  {
    capability: "Xem Dashboard tổng quan & Phân tích rủi ro",
    category: "Monitoring",
    platformAdmin: "Theo support scope",
    smeAdmin: "Toàn doanh nghiệp",
    operation: "Toàn doanh nghiệp",
    investigator: "Chỉ theo dõi ca trực",
    viewer: "Có (Read-only)",
  },
  {
    capability: "Xem danh sách giao dịch & AI Scoring Explanation",
    category: "Monitoring",
    platformAdmin: "Theo support scope",
    smeAdmin: "Có",
    operation: "Có",
    investigator: "Theo ca trực / case",
    viewer: "Có (Read-only)",
  },
  {
    capability: "Phân công Case cho Điều tra viên (Assign Case)",
    category: "Case Management",
    platformAdmin: "Không can thiệp prod",
    smeAdmin: "Có quyền",
    operation: "Có (Trách nhiệm chính)",
    investigator: "Không",
    viewer: "Không",
  },
  {
    capability: "Xem Hàng đợi Case (Case Queue)",
    category: "Case Management",
    platformAdmin: "Theo support scope",
    smeAdmin: "Toàn bộ",
    operation: "Toàn bộ (Mọi trạng thái)",
    investigator: "Chỉ 'My Cases' được giao",
    viewer: "Toàn bộ (Read-only)",
  },
  {
    capability: "Thêm ghi chú điều tra & Gửi báo cáo kết luận (Submit Report)",
    category: "Investigation",
    platformAdmin: "Không can thiệp prod",
    smeAdmin: "Có quyền",
    operation: "Có quyền",
    investigator: "Có (Nhiệm vụ chính)",
    viewer: "Không (Read-only)",
  },
  {
    capability: "Đưa ra quyết định cuối cùng (Confirm Fraud / False Alarm / Resolve)",
    category: "Case Decision",
    platformAdmin: "Không can thiệp prod",
    smeAdmin: "Có quyền",
    operation: "Có (Duyệt báo cáo)",
    investigator: "Không có quyền đóng",
    viewer: "Không",
  },
  {
    capability: "Quản trị Project, thành viên & API Keys doanh nghiệp",
    category: "Administration",
    platformAdmin: "Setup ban đầu",
    smeAdmin: "Có (Toàn quyền)",
    operation: "Không",
    investigator: "Không",
    viewer: "Không",
  },
  {
    capability: "Xem Báo cáo phân tích & Xuất dữ liệu CSV",
    category: "Reporting",
    platformAdmin: "Toàn hệ thống",
    smeAdmin: "Toàn doanh nghiệp",
    operation: "Toàn doanh nghiệp",
    investigator: "Không",
    viewer: "Có (Read-only)",
  },
  {
    capability: "Xem Security Audit Trail (Nhật ký tuân thủ)",
    category: "Audit & Compliance",
    platformAdmin: "Toàn hệ thống",
    smeAdmin: "Trong doanh nghiệp",
    operation: "Trong doanh nghiệp",
    investigator: "Không",
    viewer: "Read-only",
  },
];
