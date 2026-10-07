"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, ShieldAlert } from "lucide-react";
import { PERMISSION_MATRIX_DATA } from "../../data/fraudguard-roles";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

interface PermissionMatrixModalProps {
  open: boolean;
  onClose: () => void;
}

export function PermissionMatrixModal({ open, onClose }: PermissionMatrixModalProps) {
  const { t, language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const renderBadge = (val: string) => {
    if (val.startsWith("Có")) {
      const displayVal = language === "en" ? val.replace("Có", "Yes") : val;
      return (
        <span className={styles.matrixBadgeYes}>
          <Check size={12} /> {displayVal}
        </span>
      );
    }
    if (val.startsWith("Không")) {
      const displayVal = language === "en" ? val.replace("Không", "No") : val;
      return (
        <span className={styles.matrixBadgeNo}>
          <ShieldAlert size={12} /> {displayVal}
        </span>
      );
    }
    return <span className={styles.matrixBadgeScope}>{val}</span>;
  };

  return createPortal(
    <div className={styles.matrixModalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.matrixModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.matrixModalHeader}>
          <div>
            <h2>{t.permissionMatrixModal.title}</h2>
            <p>{t.permissionMatrixModal.subtitle}</p>
          </div>
          <button
            className={styles.button}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
            style={{ width: 32, height: 32, padding: 0, display: "grid", placeItems: "center" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.matrixModalBody}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>{t.permissionMatrixModal.colCapability}</th>
                <th style={{ width: "14%" }}>Platform Admin</th>
                <th style={{ width: "14%" }}>SME Admin</th>
                <th style={{ width: "14%" }}>Operation</th>
                <th style={{ width: "14%" }}>Investigator</th>
                <th style={{ width: "14%" }}>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX_DATA.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.capability}</div>
                    <div style={{ fontSize: 10, color: "var(--security-subtle)" }}>
                      {t.permissionMatrixModal.groupPrefix} {item.category}
                    </div>
                  </td>
                  <td>{renderBadge(item.platformAdmin)}</td>
                  <td>{renderBadge(item.smeAdmin)}</td>
                  <td>{renderBadge(item.operation)}</td>
                  <td>{renderBadge(item.investigator)}</td>
                  <td>{renderBadge(item.viewer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
