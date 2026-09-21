"use client";

import { Eye, ShieldAlert, Zap, Info } from "lucide-react";
import type { SecondaryView, UserProfile } from "./types";
import styles from "./SecurityDashboard.module.css";

interface RoleNoticeBannerProps {
  currentUser: UserProfile;
  activeNavItem: SecondaryView;
}

export function RoleNoticeBanner({
  currentUser,
  activeNavItem,
}: RoleNoticeBannerProps) {
  if (currentUser.role === "Viewer") {
    return (
      <div className={`${styles.roleNoticeBanner} ${styles.roleNoticeViewer}`}>
        <div className={styles.roleNoticeLeft}>
          <div className={styles.roleNoticeIcon}>
            <Eye size={16} color="var(--security-green)" />
          </div>
          <div>
            <strong>Chế độ Read-only (Viewer / External Auditor):</strong> Bạn có quyền xem toàn bộ giao dịch, rủi ro, phân tích và xuất báo cáo CSV. Các thao tác ghi (Tạo Case, Đổi trạng thái Case, Sửa Rule, Cấp API Key) bị vô hiệu hóa theo nguyên tắc bảo toàn dữ liệu.
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === "Risk Staff" && (activeNavItem === "rule-templates" || activeNavItem === "projects")) {
    return (
      <div className={`${styles.roleNoticeBanner} ${styles.roleNoticeRiskStaff}`}>
        <div className={styles.roleNoticeLeft}>
          <div className={styles.roleNoticeIcon}>
            <Info size={16} color="var(--security-blue)" />
          </div>
          <div>
            <strong>Giới hạn quyền hạn (Risk Staff):</strong> Bạn đang xem ở chế độ chỉ đọc đối với {activeNavItem === "rule-templates" ? "Rule Templates" : "Projects & API Keys"}. Thao tác tạo mới hoặc sửa đổi yêu cầu quyền <strong>SME Admin</strong>.
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === "Platform Admin") {
    return (
      <div className={`${styles.roleNoticeBanner} ${styles.roleNoticePlatformAdmin}`}>
        <div className={styles.roleNoticeLeft}>
          <div className={styles.roleNoticeIcon}>
            <Zap size={16} color="var(--security-orange)" />
          </div>
          <div>
            <strong>Platform Superadmin:</strong> Bạn đang truy cập với quyền quản trị tối cao của FraudGuard SaaS. Hỗ trợ toàn bộ tenant, xem báo cáo và kiểm toán toàn hệ thống.
          </div>
        </div>
      </div>
    );
  }

  return null;
}
