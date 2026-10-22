import type {
  RolePermissions,
  SecondaryView,
  UserProfile,
  UserRole,
} from "../components/fraudguard-dashboard/types";

export const DEMO_USERS: UserProfile[] = [
  {
    id: "usr-platform-admin",
    name: "Lê Hoàng Phúc",
    email: "phuc.lh@fraudguard.io",
    role: "Platform Admin",
    title: "Platform Superadmin",
    avatarLetter: "P",
    avatarBg: "#d97706", // Amber
    description:
      "Quản trị hệ thống, doanh nghiệp và tài khoản; xem tình trạng triển khai và tập rule, không cấu hình hay phát hành rule.",
  },
    {
    id: "usr-deployment",
    name: "Nguyễn Minh Hà",
    email: "ha.nm@fraudguard.io",
    role: "Implementation Staff",
    title: "Nhân viên triển khai",
    avatarLetter: "H",
    avatarBg: "#2563eb",
    description:
      "Triển khai TechPay, FastRetail và ABC Fashion: cấu hình, kiểm thử, review, phát hành và bàn giao.",
  },
  {
    id: "usr-deployment-2",
    name: "Phạm Thu Linh",
    email: "linh.pt@fraudguard.io",
    role: "Implementation Staff",
    title: "Nhân viên triển khai",
    avatarLetter: "L",
    avatarBg: "#0284c7",
    description:
      "Triển khai EduLearn và GreenMart; chỉ thao tác doanh nghiệp được phân công.",
  },

  {
    id: "usr-sme-admin",
    enterpriseId: "tenant-abc",
    name: "Trần Mai Anh",
    email: "anh.tm@abcfashion.vn",
    role: "SME Admin",
    title: "Security & Risk Lead",
    avatarLetter: "A",
    avatarBg: "#7c3aed", // Purple
    description:
      "Quản trị viên doanh nghiệp (ABC Fashion): Giám sát tổng quan, quản lý thành viên & phân quyền, cấu hình API Key và xem báo cáo điều hành.",
  },
  {
    id: "usr-techpay-admin",
    enterpriseId: "tenant-techpay",
    name: "TechPay Admin (Demo)",
    email: "admin@techpay.example",
    role: "SME Admin",
    title: "Enterprise Administrator",
    avatarLetter: "T",
    avatarBg: "#2563eb",
    description:
      "Tài khoản demo của TechPay: xem kết quả Mobile Wallet và Checkout Gateway sau bàn giao.",
  },
  {
    id: "usr-operation",
    enterpriseId: "tenant-abc",
    name: "Đặng Tuấn Kiệt",
    email: "kiet.dt@abcfashion.vn",
    role: "Operator",
    title: "Risk Operations Team Leader",
    avatarLetter: "K",
    avatarBg: "#2563eb", // Blue
    description:
      "Trưởng nhóm vận hành: Quản lý hàng đợi cảnh báo, phân công case cho điều tra viên, duyệt báo cáo điều tra và đưa ra quyết định xử lý cuối cùng.",
  },
  {
    id: "usr-investigator",
    enterpriseId: "tenant-abc",
    name: "Nguyễn Văn An",
    email: "an.nv@abcfashion.vn",
    role: "Investigator",
    title: "Fraud Field Investigator",
    avatarLetter: "N",
    avatarBg: "#0284c7", // Sky blue
    description:
      "Điều tra viên hiện trường: Tiếp nhận case được giao (My Cases), xác minh chứng cứ đơn COD, ghi chú và gửi báo cáo kết luận về cho Operator.",
  },

];

export const DEFAULT_DEMO_USER = DEMO_USERS.find(user => user.id === "usr-deployment")!;

export function getRoleHomeView(role: UserRole): SecondaryView {
  switch (role) {
    case "Platform Admin": return "platform-health";
    case "Implementation Staff": return "rule-sets";
    case "Operator":
    case "Investigator": return "active-cases";
    default: return "risk-overview";
  }
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case "Platform Admin":
      return {
        canManageProjects: false,
        canManageRules: false,
        canManageCases: false,
        canInvestigateCases: false,
        canViewAllCases: false,
        canViewAudit: true,
        canExport: false,
        isReadOnly: false,
        isSuperAdmin: true,
        canAccessRuleTesting: false,
        canAccessOnboarding: false,
      };
    case "Implementation Staff":
      return {
        canManageProjects: true,
        canManageRules: true,
        canManageCases: false,
        canInvestigateCases: false,
        canViewAllCases: false,
        canViewAudit: true,
        canExport: false,
        isReadOnly: false,
        isSuperAdmin: false,
        canAccessRuleTesting: true,
        canAccessOnboarding: true,
      };
    case "SME Admin":
      return {
        canManageProjects: true,
        canManageRules: false,
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
    case "Operator":
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
  deploymentStaff: string;
  smeAdmin: string;
  operation: string;
  investigator: string;
}

export const PERMISSION_MATRIX_DATA: PermissionMatrixItem[] = [
  {
    capability: "Onboarding doanh nghiệp & thiết lập Schema ban đầu",
    category: "Onboarding",
    platformAdmin: "Chỉ xem trạng thái",
    deploymentStaff: "Có (Doanh nghiệp được phân công)",
    smeAdmin: "Gửi đặc tả",
    operation: "Không",
    investigator: "Không",
  },
  {
    capability: "Kiểm thử Sandbox & Quản lý Version Rule (v1, v2...)",
    category: "Rule Lifecycle",
    platformAdmin: "Chỉ xem tập rule",
    deploymentStaff: "Có (Doanh nghiệp được phân công)",
    smeAdmin: "Gửi Change Request",
    operation: "Không",
    investigator: "Không",
  },
  {
    capability: "Xem Dashboard tổng quan & Phân tích rủi ro",
    category: "Monitoring",
    platformAdmin: "Không truy cập nghiệp vụ",
    deploymentStaff: "Không",
    smeAdmin: "Toàn doanh nghiệp",
    operation: "Toàn doanh nghiệp",
    investigator: "Chỉ theo dõi ca trực",
  },
  {
    capability: "Xem danh sách giao dịch & AI Detection Explanation",
    category: "Monitoring",
    platformAdmin: "Không truy cập nghiệp vụ",
    deploymentStaff: "Không",
    smeAdmin: "Có",
    operation: "Có",
    investigator: "Theo ca trực / case",
  },
  {
    capability: "Phân công Case cho Điều tra viên (Assign Case)",
    category: "Case Management",
    platformAdmin: "Không can thiệp prod",
    deploymentStaff: "Không",
    smeAdmin: "Có quyền",
    operation: "Có (Trách nhiệm chính)",
    investigator: "Không",
  },
  {
    capability: "Xem Hàng đợi Case (Case Queue)",
    category: "Case Management",
    platformAdmin: "Không truy cập nghiệp vụ",
    deploymentStaff: "Không",
    smeAdmin: "Toàn bộ",
    operation: "Toàn bộ (Mọi trạng thái)",
    investigator: "Chỉ 'My Cases' được giao",
  },
  {
    capability: "Thêm ghi chú điều tra & Gửi báo cáo kết luận (Submit Report)",
    category: "Investigation",
    platformAdmin: "Không can thiệp prod",
    deploymentStaff: "Không",
    smeAdmin: "Có quyền",
    operation: "Có quyền",
    investigator: "Có (Nhiệm vụ chính)",
  },
  {
    capability:
      "Đưa ra quyết định cuối cùng (Confirm Fraud / False Alarm / Resolve)",
    category: "Case Decision",
    platformAdmin: "Không can thiệp prod",
    deploymentStaff: "Không",
    smeAdmin: "Có quyền",
    operation: "Có (Duyệt báo cáo)",
    investigator: "Không có quyền đóng",
  },
  {
    capability: "Quản trị Project, thành viên & API Keys doanh nghiệp",
    category: "Administration",
    platformAdmin: "Quản trị doanh nghiệp và tài khoản",
    deploymentStaff: "Setup doanh nghiệp được phân công",
    smeAdmin: "Có (Toàn quyền)",
    operation: "Không",
    investigator: "Không",
  },
  {
    capability: "Xem Báo cáo phân tích & Xuất dữ liệu CSV",
    category: "Reporting",
    platformAdmin: "Toàn hệ thống",
    deploymentStaff: "Không",
    smeAdmin: "Toàn doanh nghiệp",
    operation: "Toàn doanh nghiệp",
    investigator: "Không",
  },
  {
    capability: "Xem Security Audit Trail (Nhật ký tuân thủ)",
    category: "Audit & Compliance",
    platformAdmin: "Toàn hệ thống",
    deploymentStaff: "Không",
    smeAdmin: "Trong doanh nghiệp",
    operation: "Trong doanh nghiệp",
    investigator: "Không",
  },
];

export function canSaveMember(actor: UserProfile, member: UserProfile, users: UserProfile[]): boolean {
  if (actor.role !== 'SME Admin' || !actor.enterpriseId || member.enterpriseId !== actor.enterpriseId || member.id === actor.id || !['SME Admin','Operator','Investigator'].includes(member.role)) return false;
  if (!member.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) return false;
  const previous = users.find(u => u.id === member.id);
  if (previous && previous.enterpriseId !== actor.enterpriseId) return false;
  return !users.some(u => u.id !== member.id && (u.email.toLowerCase() === member.email.toLowerCase() || u.enterpriseId === member.enterpriseId && u.name.toLowerCase() === member.name.toLowerCase()));
}
