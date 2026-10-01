"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import styles from "./Login.module.css";

// SVG Icons for Social Logins
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
export function LoginPage() {
  const router = useRouter();

  // Theme state (Dark by default, togglable to Light)
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<"vi" | "en">("vi");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSSOMode, setIsSSOMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "vi" ? "en" : "vi"));
  };

  const handleQuickFill = () => {
    setEmail("admin@fraudguard.io");
    setPassword("SecurityEnterprise@2026");
    setErrorMsg("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg(
        lang === "vi"
          ? "Vui lòng nhập email doanh nghiệp."
          : "Please enter your business email."
      );
      return;
    }

    if (!isSSOMode && !password) {
      setErrorMsg(
        lang === "vi" ? "Vui lòng nhập mật khẩu." : "Please enter your password."
      );
      return;
    }

    setIsLoading(true);

    // Simulate authentication API call & redirect to dashboard
    setTimeout(() => {
      setIsLoading(false);
      router.push("/fraud-monitoring");
    }, 850);
  };

  return (
    <div className={styles.wrapper} data-theme={theme}>
      {/* ── Left Column (Authentication Form) ── */}
      <div className={styles.leftPanel}>
        {/* Top bar with Logo + Theme Switcher + Language + Sign up */}
        <header className={styles.topBar}>
          <a href="/login" className={styles.brandLogo}>
            <div className={styles.logoIconWrapper}>
              <Shield size={20} />
            </div>
            <span className={styles.brandTitle}>FraudGuard</span>
          </a>

          <div className={styles.topBarActions}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              className={styles.themeToggleBtn}
              onClick={toggleTheme}
              title={theme === "dark" ? "Chuyển sang Light Theme" : "Chuyển sang Dark Theme"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <>
                  <Sun size={15} style={{ color: "#eda765" }} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} style={{ color: "#ad8af3" }} />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Language & Sign up for Mobile/Tablet (on Desktop, Cloudflare puts these in the right panel) */}
            <div className={styles.mobileOnlyTopActions}>
              <button
                type="button"
                className={styles.langSelectBtn}
                onClick={toggleLang}
                title="Đổi ngôn ngữ"
              >
                <Globe size={14} />
                <span>{lang === "vi" ? "VI" : "EN"}</span>
              </button>

              <a
                href="#signup"
                className={styles.signUpTopBtn}
                onClick={(e) => {
                  e.preventDefault();
                  handleQuickFill();
                }}
              >
                {lang === "vi" ? "Đăng ký" : "Sign up"}
              </a>
            </div>
          </div>
        </header>

        {/* Center Main Form */}
        <main className={styles.mainContent}>
          <h1 className={styles.heading}>
            {isSSOMode
              ? lang === "vi"
                ? "Đăng nhập Single Sign-On"
                : "Sign in with SSO"
              : lang === "vi"
              ? "Sign in to FraudGuard"
              : "Sign in to FraudGuard"}
          </h1>

          {errorMsg && (
            <div className={styles.errorAlert} role="alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isSSOMode ? (
            <>
              {/* 3-Button Social Row (Google, Apple, GitHub) */}
              <div className={styles.socialRow}>
                <button
                  type="button"
                  className={styles.socialBtn}
                  onClick={handleQuickFill}
                  title="Sign in with Google"
                >
                  <GoogleIcon />
                  <span>Google</span>
                </button>
              </div>

              {/* Continue with SSO Button */}
              <button
                type="button"
                className={styles.ssoBtn}
                onClick={() => {
                  setIsSSOMode(true);
                  setErrorMsg("");
                }}
              >
                <Lock size={15} style={{ color: "var(--login-accent)" }} />
                <span>
                  {lang === "vi" ? "Continue with SSO" : "Continue with SSO"}
                </span>
              </button>

              {/* Divider OR */}
              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span>OR</span>
                <div className={styles.dividerLine} />
              </div>
            </>
          ) : null}

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="login-email">
                {isSSOMode
                  ? lang === "vi"
                    ? "Email công ty / Corporate Domain"
                    : "Corporate email or domain"
                  : "Email"}
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="login-email"
                  type="email"
                  className={styles.input}
                  placeholder={
                    isSSOMode
                      ? "name@yourcompany.com"
                      : "name@company.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {!isSSOMode && (
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="login-password">
                    Password
                  </label>
                </div>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-password"
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

            {/* Save login method checkbox */}
            <label className={styles.rememberRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>
                {lang === "vi"
                  ? "Save email and login method on this device"
                  : "Save email and login method on this device"}
              </span>
            </label>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              className={styles.signInBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner} />
                  <span>
                    {lang === "vi" ? "Đang xác thực..." : "Signing in..."}
                  </span>
                </>
              ) : (
                <span>
                  {isSSOMode
                    ? lang === "vi"
                      ? "Tiếp tục với SSO"
                      : "Continue with SSO"
                    : lang === "vi"
                    ? "Sign in"
                    : "Sign in"}
                </span>
              )}
            </button>

            {isSSOMode && (
              <button
                type="button"
                className={styles.ssoBtn}
                style={{ marginTop: 6 }}
                onClick={() => {
                  setIsSSOMode(false);
                  setErrorMsg("");
                }}
              >
                ← {lang === "vi" ? "Quay lại đăng nhập Email" : "Back to standard login"}
              </button>
            )}
          </form>

          {/* Subtext links */}
          <div className={styles.linksSection}>
            <div>
              {lang === "vi" ? "Don't have an account?" : "Don't have an account?"}{" "}
              <a
                href="#signup"
                className={styles.link}
                onClick={(e) => {
                  e.preventDefault();
                  handleQuickFill();
                }}
              >
                Sign up
              </a>
            </div>
            <div>
              Forgot your{" "}
              <a
                href="#forgot-email"
                className={styles.link}
                onClick={(e) => e.preventDefault()}
              >
                email
              </a>{" "}
              or{" "}
              <a
                href="#forgot-password"
                className={styles.link}
                onClick={(e) => e.preventDefault()}
              >
                password
              </a>
              ?
            </div>
          </div>

          {/* Quick Demo Helper Banner */}
          <div className={styles.demoBanner}>
            <div className={styles.demoText}>
              <strong>⚡ Tài khoản Demo:</strong> admin@fraudguard.io
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
        </main>

        {/* Left Panel Terms Footer */}
        <footer className={styles.leftFooter}>
          By continuing, I agree to FraudGuard&apos;s{" "}
          <a href="#terms" onClick={(e) => e.preventDefault()}>
            terms
          </a>
          ,{" "}
          <a href="#privacy" onClick={(e) => e.preventDefault()}>
            privacy policy
          </a>
          , and{" "}
          <a href="#cookies" onClick={(e) => e.preventDefault()}>
            cookie policy
          </a>
          .
        </footer>
      </div>

      {/* ── Right Column (FraudGuard Cyber Security Hero Showcase - Cloudflare Style) ── */}
      <div className={styles.rightPanel}>
        {/* Top-right Language Selector & Sign up button (matching Cloudflare login layout) */}
        <div className={styles.rightTopBar}>
          <button
            type="button"
            className={styles.rightLangBtn}
            onClick={toggleLang}
            title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
          >
            <Globe size={15} />
            <span>{lang === "vi" ? "Tiếng Việt" : "English"}</span>
            <ChevronDown size={14} style={{ opacity: 0.85 }} />
          </button>

          <a
            href="#signup"
            className={styles.rightSignUpBtn}
            onClick={(e) => {
              e.preventDefault();
              handleQuickFill();
            }}
          >
            {lang === "vi" ? "Đăng ký" : "Sign up"}
          </a>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            FraudGuard Connect 2026
          </div>

          <h2 className={styles.heroTitle}>
            Where Enterprise &amp; SME Fraud Defense Connects.
          </h2>

          <p className={styles.heroSubtitle}>
            Hệ thống giám sát rủi ro giao dịch thời gian thực, tự động phát hiện
            bất thường hành vi, Rule Engine không mã code và điều tra case theo
            chuẩn an ninh mạng quốc tế.
          </p>

          <a
            href="#register"
            className={styles.heroCtaBtn}
            onClick={(e) => {
              e.preventDefault();
              handleQuickFill();
            }}
          >
            <ExternalLink size={14} />
            <span>{lang === "vi" ? "Trải nghiệm nền tảng ngay" : "Register now"}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
