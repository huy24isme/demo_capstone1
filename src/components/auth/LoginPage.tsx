"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Eye,
  EyeOff,
  Check,
  Building2,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import styles from "./Login.module.css";

export function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Turnstile mock verification
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(true); // Default true for smooth testing

  // Form states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSSOMode, setIsSSOMode] = useState(false);
  const [ssoDomain, setSsoDomain] = useState("");

  const handleTurnstileClick = () => {
    if (isVerified) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 800);
  };

  const handleQuickFill = () => {
    setEmail("admin@fraudguard.io");
    setPassword("DemoSecurity@2026");
    setIsVerified(true);
    setErrorMsg("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Vui lòng nhập địa chỉ email doanh nghiệp.");
      return;
    }

    if (!isSSOMode && !password) {
      setErrorMsg("Vui lòng nhập mật khẩu.");
      return;
    }

    if (!isVerified) {
      setErrorMsg("Vui lòng tích xác nhận bảo mật chống Bot (Turnstile).");
      return;
    }

    setIsLoading(true);

    // Simulate authentication API call
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to FraudGuard Dashboard
      router.push("/fraud-monitoring");
    }, 900);
  };

  return (
    <div className={styles.loginContainer}>
      {/* Top Header branding */}
      <div className={styles.loginCardWrapper}>
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>
            <div className={styles.logoIcon}>
              <Shield size={20} />
            </div>
            <span className={styles.brandName}>FraudGuard</span>
          </div>
        </div>

        {/* Main Card */}
        <div className={styles.loginCard}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              {isSSOMode ? "Đăng nhập Doanh nghiệp" : "Log in to FraudGuard"}
            </h1>
            <p className={styles.subtitle}>
              {isSSOMode ? (
                <>
                  Nhập domain hoặc email công ty của bạn.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSSOMode(false);
                      setErrorMsg("");
                    }}
                    className={styles.link}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    Quay lại
                  </button>
                </>
              ) : (
                <>
                  Chưa có tài khoản?{" "}
                  <a href="#signup" className={styles.link} onClick={(e) => { e.preventDefault(); handleQuickFill(); }}>
                    Dùng thử ngay
                  </a>
                </>
              )}
            </p>
          </div>

          {errorMsg && (
            <div className={styles.errorAlert} role="alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form}>
            {/* Email / Domain */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="email">
                {isSSOMode ? "Email / Corporate Domain" : "Email address"}
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder={isSSOMode ? "user@yourcompany.com" : "name@company.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password (if not in pure SSO mode) */}
            {!isSSOMode && (
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <a href="#forgot" className={styles.link} style={{ fontSize: 11 }} onClick={(e) => e.preventDefault()}>
                    Forgot password?
                  </a>
                </div>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.togglePasswordBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me */}
            <label className={styles.rememberRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this device for 30 days</span>
            </label>

            {/* Cloudflare Turnstile Mock Widget */}
            <div className={styles.turnstileBox} onClick={handleTurnstileClick}>
              <div className={styles.turnstileLeft}>
                <div
                  className={`${styles.turnstileCheckbox} ${
                    isVerified ? styles.turnstileVerified : ""
                  }`}
                >
                  {isVerifying ? (
                    <div className={styles.spinner} style={{ width: 12, height: 12, borderWidth: 1 }} />
                  ) : isVerified ? (
                    <Check size={14} />
                  ) : null}
                </div>
                <span className={styles.turnstileText}>
                  {isVerified
                    ? "Security verification successful"
                    : isVerifying
                    ? "Verifying..."
                    : "Verify you are human"}
                </span>
              </div>
              <div className={styles.turnstileBrand}>
                <span className={styles.turnstileLogoText}>CLOUDFLARE</span>
                <span className={styles.turnstileSubtext}>Turnstile · Privacy</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner} />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>{isSSOMode ? "Tiếp tục với SSO" : "Log in"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* SSO / Divider */}
          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span>OR</span>
            <div className={styles.dividerLine} />
          </div>

          {!isSSOMode ? (
            <button
              type="button"
              className={styles.ssoBtn}
              onClick={() => {
                setIsSSOMode(true);
                setErrorMsg("");
              }}
            >
              <Building2 size={16} style={{ color: "var(--security-purple)" }} />
              <span>Log in with Single Sign-On (SSO)</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.ssoBtn}
              onClick={() => {
                setIsSSOMode(false);
                setErrorMsg("");
              }}
            >
              <Lock size={16} />
              <span>Log in with Email & Password</span>
            </button>
          )}

          {/* Quick Demo Helper */}
          <div className={styles.demoBanner}>
            <div className={styles.demoText}>
              <strong>Tài khoản Demo có sẵn:</strong>
              <br />
              admin@fraudguard.io
            </div>
            <button
              type="button"
              className={styles.demoBtn}
              onClick={handleQuickFill}
            >
              <Sparkles size={12} style={{ display: "inline", marginRight: 4 }} />
              Tự động điền
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.systemStatus}>
          <span className={styles.statusDot} />
          <span>All Systems Operational</span>
        </div>
        <div className={styles.footerLinks}>
          <a href="#terms" className={styles.footerLink} onClick={(e) => e.preventDefault()}>
            Terms of Use
          </a>
          <span>·</span>
          <a href="#privacy" className={styles.footerLink} onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          <span>·</span>
          <a href="#status" className={styles.footerLink} onClick={(e) => e.preventDefault()}>
            FraudGuard Trust Center
          </a>
        </div>
      </footer>
    </div>
  );
}
