"use client";

import { Eye, Zap, Info, UserCheck } from "lucide-react";
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

  if (currentUser.role === "Investigator") {
    const isHistory = activeNavItem === "reports";
    return (
      <div className={`${styles.roleNoticeBanner} ${styles.roleNoticeRiskStaff}`}>
        <div className={styles.roleNoticeLeft}>
          <div className={styles.roleNoticeIcon}>
            <UserCheck size={16} color="#38bdf8" />
          </div>
          <div>
            {isHistory ? (
              <>
                <strong>Lịch sử điều tra cá nhân (Investigation History):</strong> Xem lại danh sách các hồ sơ bạn đã hoàn tất thẩm định, nội dung báo cáo kết luận và quyết định phê duyệt cuối cùng từ Operation Team Leader.
              </>
            ) : (
              <>
                <strong>Khu vực Điều tra viên (Field Investigator):</strong> Bạn đang đăng nhập với vai trò điều tra hiện trường ({currentUser.name}). Chỉ hiển thị các Case được giao trực tiếp (My Cases). Vui lòng thêm ghi chú chứng cứ và nộp Báo cáo điều tra để Team Leader phê duyệt.
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === "Operation" && (activeNavItem === "rule-templates" || activeNavItem === "projects")) {
    return (
      <div className={`${styles.roleNoticeBanner} ${styles.roleNoticeRiskStaff}`}>
        <div className={styles.roleNoticeLeft}>
          <div className={styles.roleNoticeIcon}>
            <Info size={16} color="var(--security-blue)" />
          </div>
          <div>
            <strong>Quyền hạn Vận hành (Operation):</strong> Bạn đang xem ở chế độ chỉ đọc đối với {activeNavItem === "rule-templates" ? "Rule Templates" : "Projects & API Keys"}. Trách nhiệm chính của bạn là quản lý Case Queue, phân công điều tra viên và đưa ra quyết định xử lý cuối cùng.
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
            <strong>Platform Superadmin:</strong> Bạn đang truy cập hệ thống vận hành nền tảng SaaS. Quản lý Onboarding khách hàng, kiểm thử Sandbox & Versioning của Rule trước khi bàn giao (Handover) cho SME.
          </div>
        </div>
      </div>
    );
  }

  return null;
}
