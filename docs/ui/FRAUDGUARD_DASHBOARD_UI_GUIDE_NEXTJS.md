# Hướng dẫn xây dựng FraudGuard Dashboard UI với React + Next.js

Tài liệu này chuyển phong cách dashboard mẫu thành giao diện cho **FraudGuard-as-a-Service**: nền tảng SaaS đa tenant phát hiện giao dịch bất thường cho SME. Nội dung bám theo proposal: tiếp nhận transaction qua API hoặc CSV/Excel, chấm điểm bằng Dynamic Rule Engine hoặc AI, chuẩn hóa risk score 0–100 qua Risk Score Gateway, tạo alert/case và hỗ trợ nhân sự điều tra.

> FraudGuard chỉ cảnh báo và hỗ trợ ra quyết định. UI không được diễn đạt risk score như kết luận pháp lý rằng giao dịch chắc chắn là gian lận, và không cung cấp hành động tự động khóa tài khoản hoặc hủy giao dịch.

### Phạm vi dashboard theo proposal

| Khu vực | Nội dung FraudGuard |
|---|---|
| Tổng quan | Giao dịch đã phân tích, phân bố risk, alert mở, case đang xử lý |
| Transactions | Transaction ID, loại giao dịch, project, risk score, risk level, scoring source |
| Alerts | Alert vượt threshold, triggered rules hoặc AI explanation |
| Cases | Phân công, ghi chú và trạng thái Open, Reviewing, Confirmed Fraud, False Alarm, Resolved |
| Rules | Rule template, điều kiện AND/OR, risk point, threshold và enable/disable |
| Reports | Báo cáo theo project, thời gian, transaction type, risk level và case status |
| Platform health | Trạng thái backend, AI Service, queue và số lần dùng rule fallback |

Các vai trò chính gồm `Platform Admin`, `SME Admin`, `Risk/Operation Staff` và `Viewer/Auditor`. Mỗi màn hình phải kiểm tra role cùng phạm vi tenant/project.

## 1. Kết quả cần đạt

Dashboard gồm các vùng chính:

```text
┌──────┬────────────────────────────────────────────────────────────┐
│ Icon │ Product header + navigation + settings                    │
│ rail ├──────────────┬─────────────────────────────────────────────┤
│      │ Secondary    │ Breadcrumb + page title                    │
│      │ navigation   │ Filters + date range                       │
│      │              │ KPI cards                                  │
│      │              │ Main charts                               │
│      │              │ Transactions / alerts table               │
└──────┴──────────────┴─────────────────────────────────────────────┘
```

Nguyên tắc thị giác:

- Nền tổng thể gần đen; card sáng hơn nền khoảng một cấp.
- Border mỏng, tương phản thấp; tránh shadow lớn.
- Màu xanh dùng cho navigation và hành động.
- Tím dùng cho nhận diện sản phẩm và mức độ Medium.
- Đỏ, cam, xanh lá chỉ dùng khi biểu đạt trạng thái.
- Border radius nhỏ, khoảng `4–6px`, để giữ cảm giác của công cụ kỹ thuật.
- Font nhỏ nhưng có phân cấp rõ; nội dung chính không nhỏ hơn `12px`.

## 2. Cấu trúc thư mục đề xuất

Ví dụ này dùng Next.js App Router và CSS Modules.

```text
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── fraud-monitoring/
│       └── page.tsx
├── components/
│   └── fraudguard-dashboard/
│       ├── FraudGuardDashboard.tsx
│       ├── SecurityDashboard.module.css
│       ├── AppRail.tsx
│       ├── ProductHeader.tsx
│       ├── SecondaryNav.tsx
│       ├── DashboardToolbar.tsx
│       ├── StatCard.tsx
│       ├── Panel.tsx
│       ├── RiskLevelBadge.tsx
│       ├── TransactionRiskTable.tsx
│       └── types.ts
└── data/
    └── fraudguard-transactions.ts
```

Quy ước:

- `page.tsx` là Server Component, dùng để lấy dữ liệu ban đầu.
- `FraudGuardDashboard.tsx` là Client Component vì chứa filter, tab, drawer và state tương tác.
- Design tokens và reset đặt trong `globals.css`.
- CSS riêng của dashboard đặt trong `SecurityDashboard.module.css`.

## 3. Design tokens dùng toàn dự án

Thêm vào `src/app/globals.css`:

```css
:root {
  color-scheme: dark;

  /* Background hierarchy */
  --security-bg: #17181c;
  --security-header: #1f2025;
  --security-panel: #202126;
  --security-panel-hover: #292c35;
  --security-control: #292a32;
  --security-control-hover: #353640;
  --security-rail: #252130;

  /* Borders */
  --security-border: #35363e;
  --security-border-strong: #454752;

  /* Typography */
  --security-text: #e5e5ec;
  --security-text-secondary: #b5b8c4;
  --security-muted: #9799a7;
  --security-subtle: #777b8b;

  /* Accent colors */
  --security-blue: #71b9f4;
  --security-blue-bg: #34546c;
  --security-purple: #ad8af3;
  --security-purple-bg: #594076;
  --security-green: #78c9ac;
  --security-orange: #eda765;
  --security-red: #ed6775;

  /* Severity */
  --critical-text: #f68992;
  --critical-bg: #512d35;
  --critical-border: #7b3d46;
  --high-text: #efb485;
  --high-bg: #443328;
  --high-border: #715139;
  --medium-text: #c5a7f9;
  --medium-bg: #372e49;
  --medium-border: #5c4778;

  /* Layout */
  --app-rail-width: 56px;
  --secondary-nav-width: 200px;
  --product-header-height: 60px;
  --panel-radius: 5px;
  --content-max-width: 1900px;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: var(--security-bg);
  color: var(--security-text);
  font-family: Inter, "Segoe UI", Arial, sans-serif;
  font-size: 14px;
}

button,
input,
select {
  color: inherit;
  font: inherit;
}

button,
select {
  cursor: pointer;
}

a {
  color: var(--security-blue);
  text-decoration: none;
}

:where(button, a, input, select):focus-visible {
  outline: 2px solid var(--security-blue);
  outline-offset: 3px;
}
```

Nếu dự án chưa có font, có thể cấu hình bằng `next/font` trong `layout.tsx`:

```tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

## 4. Kiểu dữ liệu TypeScript

Tạo `src/components/fraudguard-dashboard/types.ts`:

```ts
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
```

## 5. Component tree

```tsx
<FraudGuardDashboard>
  <AppRail />
  <div className={styles.workspace}>
    <ProductHeader />
    <div className={styles.bodyLayout}>
      <SecondaryNav />
      <main className={styles.main}>
        <DashboardHeading />
        <DashboardToolbar />
        <section className={styles.metricsGrid}>
          <StatCard />
        </section>
        <section className={styles.chartGrid}>
          <Panel>{/* risk distribution / trend */}</Panel>
          <Panel>{/* grouped by project / transaction type */}</Panel>
        </section>
        <TransactionRiskTable />
      </main>
    </div>
  </div>
</FraudGuardDashboard>
```

Mỗi component chỉ nên đảm nhiệm một vùng giao diện. Transaction data và filter state được giữ ở `FraudGuardDashboard`, sau đó truyền xuống bằng props. API key chỉ được quản lý ở màn hình project settings; không đưa API key vào dashboard hoặc Client Component.

## 6. CSS layout có thể dùng trực tiếp

Tạo `src/components/fraudguard-dashboard/SecurityDashboard.module.css`:

```css
.root {
  min-height: 100vh;
  background: var(--security-bg);
  color: var(--security-text);
}

/* Left icon rail */
.rail {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  display: flex;
  width: var(--app-rail-width);
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-right: 1px solid #433752;
  background: var(--security-rail);
  padding: 12px 8px 18px;
}

.railLogo {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  margin-bottom: 4px;
  color: var(--security-purple);
  font-weight: 700;
}

.railButton {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #b9b2ca;
}

.railButton:hover,
.railButtonActive {
  background: var(--security-purple-bg);
  color: #fff;
}

.railBottom {
  margin-top: auto;
}

.avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #69479a;
  color: #fff;
  font-size: 11px;
}

/* Main workspace */
.workspace {
  margin-left: var(--app-rail-width);
}

.productHeader {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  height: var(--product-header-height);
  align-items: center;
  gap: 32px;
  border-bottom: 1px solid var(--security-border);
  background: color-mix(in srgb, var(--security-header) 94%, transparent);
  padding: 0 22px;
  backdrop-filter: blur(12px);
}

.productName {
  flex: 0 0 auto;
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
}

.topNav {
  display: flex;
  align-self: stretch;
  gap: 26px;
}

.topNavButton {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--security-muted);
  padding: 0 3px;
}

.topNavButton:hover {
  color: var(--security-text);
}

.topNavButtonActive {
  color: #fff;
}

.topNavButtonActive::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--security-blue);
  content: "";
}

.settingsButton {
  margin-left: auto;
}

.bodyLayout {
  display: flex;
  align-items: stretch;
}

/* Secondary navigation */
.secondaryNav {
  position: sticky;
  top: var(--product-header-height);
  display: flex;
  width: var(--secondary-nav-width);
  height: calc(100vh - var(--product-header-height));
  flex: 0 0 auto;
  flex-direction: column;
  align-items: stretch;
  border-right: 1px solid var(--security-border);
  background: var(--security-panel);
  padding: 28px 12px 18px;
}

.sectionLabel {
  margin: 0 10px 16px;
  color: var(--security-subtle);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.secondaryNavButton {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #b9bbc6;
  padding: 10px;
  text-align: left;
}

.secondaryNavButton:hover {
  background: #30313b;
}

.secondaryNavButtonActive {
  background: var(--security-blue-bg);
  box-shadow: inset 2px 0 var(--security-blue);
  color: #b9e1ff;
}

.systemStatus {
  margin: 36px 10px 0;
  color: #a8abb5;
  font-size: 12px;
  line-height: 1.8;
}

.statusDot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  background: var(--security-green);
}

/* Content */
.main {
  width: 100%;
  min-width: 0;
  max-width: var(--content-max-width);
  padding: 24px 28px 0;
}

.breadcrumb {
  margin-bottom: 18px;
  color: #818695;
  font-size: 12px;
}

.pageHeading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.pageHeading h1 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.pageHeading p {
  margin: 0;
  color: var(--security-muted);
  font-size: 13px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 24px 0 20px;
}

.toolbarGroup {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.control,
.button {
  min-height: 34px;
  border: 1px solid var(--security-border-strong);
  border-radius: 4px;
  background: var(--security-control);
  color: #d7d9e3;
  padding: 7px 10px;
  font-size: 12px;
}

.button:hover,
.control:hover {
  background: var(--security-control-hover);
}

.searchInput {
  width: min(280px, 100%);
  min-height: 34px;
  border: 1px solid var(--security-border-strong);
  border-radius: 4px;
  background: #191b21;
  color: var(--security-text);
  padding: 7px 10px;
}

/* KPI cards */
.metricsGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.statCard,
.panel {
  min-width: 0;
  border: 1px solid var(--security-border);
  border-radius: var(--panel-radius);
  background: var(--security-panel);
}

.statCard {
  position: relative;
  min-height: 115px;
  overflow: hidden;
  padding: 15px 17px;
}

.statLabel {
  margin-bottom: 10px;
  color: var(--security-text-secondary);
  font-size: 12px;
}

.statValue {
  font-size: 31px;
  font-weight: 600;
  line-height: 1.1;
}

.statDescription {
  display: block;
  margin-top: 9px;
  color: #838896;
  font-size: 11px;
}

.statCritical .statValue {
  color: var(--security-red);
}

.statWarning .statValue {
  color: var(--security-orange);
}

/* Panels and charts */
.chartGrid,
.secondaryGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 1fr);
  gap: 14px;
}

.secondaryGrid {
  margin: 14px 0 20px;
}

.panel {
  padding: 17px;
}

.panelHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panelHeader h2,
.panelHeader h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.muted {
  color: var(--security-muted);
  font-size: 11px;
  line-height: 1.6;
}

.chartArea {
  width: 100%;
  height: 230px;
  margin-top: 12px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  color: #a4a8b5;
  font-size: 10px;
}

.legendDot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 1px;
}

/* Status and severity */
.badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.critical {
  border-color: var(--critical-border);
  background: var(--critical-bg);
  color: var(--critical-text);
}

.high {
  border-color: var(--high-border);
  background: var(--high-bg);
  color: var(--high-text);
}

.medium {
  border-color: var(--medium-border);
  background: var(--medium-bg);
  color: var(--medium-text);
}

.low {
  border-color: #3f665a;
  background: #263c36;
  color: #8cd5bc;
}

/* Table */
.tablePanel {
  overflow: hidden;
  padding: 17px 0 0;
}

.tablePanelHeader {
  padding: 0 17px;
}

.tableControls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--security-border);
  padding: 14px 17px 8px;
}

.tabs {
  display: flex;
  gap: 20px;
}

.tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #9fa4b4;
  padding: 10px 0;
  font-size: 12px;
}

.tabActive {
  border-bottom-color: var(--security-blue);
  color: var(--security-blue);
}

.tableScroll {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  white-space: nowrap;
}

.table th {
  border-bottom: 1px solid #3a3c46;
  background: #25272e;
  color: #a4aab9;
  padding: 10px 17px;
  font-size: 10px;
  font-weight: 500;
}

.table td {
  border-bottom: 1px solid #30323b;
  color: #aeb4c2;
  padding: 13px 17px;
  font-size: 11px;
}

.table tbody tr:hover {
  background: var(--security-panel-hover);
}

.findingName {
  color: #c5cae0;
  font-size: 12px;
  font-weight: 500;
}

.findingMeta {
  display: block;
  margin-top: 4px;
  color: #818899;
  font-size: 10px;
}

.emptyState {
  color: var(--security-muted);
  padding: 36px 20px !important;
  text-align: center;
}

/* Responsive */
@media (max-width: 1150px) {
  :root {
    --secondary-nav-width: 175px;
  }

  .main {
    padding-inline: 18px;
  }

  .productHeader {
    gap: 18px;
  }

  .topNav {
    gap: 18px;
  }
}

@media (max-width: 900px) {
  .secondaryNav {
    display: none;
  }

  .chartGrid,
  .secondaryGrid {
    grid-template-columns: minmax(0, 1.3fr) minmax(260px, 1fr);
  }
}

@media (max-width: 680px) {
  :root {
    --app-rail-width: 44px;
  }

  .productHeader {
    height: auto;
    min-height: var(--product-header-height);
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px;
  }

  .topNav {
    order: 3;
    width: 100%;
    height: 36px;
    justify-content: space-between;
    gap: 4px;
  }

  .topNavButton {
    font-size: 12px;
  }

  .main {
    padding: 20px 14px 0;
  }

  .toolbar,
  .tableControls {
    align-items: stretch;
    flex-direction: column;
  }

  .metricsGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .chartGrid,
  .secondaryGrid {
    grid-template-columns: 1fr;
  }

  .pageHeading h1 {
    font-size: 23px;
  }

  .chartArea {
    height: 210px;
  }
}

@media (max-width: 420px) {
  .metricsGrid {
    grid-template-columns: 1fr;
  }
}
```

## 7. Các component nền tảng

### `Panel.tsx`

```tsx
import type { ReactNode } from "react";
import styles from "./SecurityDashboard.module.css";

interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  description,
  action,
  className = "",
  children,
}: PanelProps) {
  return (
    <article className={`${styles.panel} ${className}`}>
      <header className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          {description ? <p className={styles.muted}>{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </article>
  );
}
```

### `StatCard.tsx`

```tsx
import styles from "./SecurityDashboard.module.css";

interface StatCardProps {
  label: string;
  value: number | string;
  description: string;
  tone?: "default" | "critical" | "warning";
}

export function StatCard({
  label,
  value,
  description,
  tone = "default",
}: StatCardProps) {
  const toneClass =
    tone === "critical"
      ? styles.statCritical
      : tone === "warning"
        ? styles.statWarning
        : "";

  return (
    <article className={`${styles.statCard} ${toneClass}`}>
      <div className={styles.statLabel}>{label}</div>
      <strong className={styles.statValue}>{value}</strong>
      <span className={styles.statDescription}>{description}</span>
    </article>
  );
}
```

### `RiskLevelBadge.tsx`

```tsx
import type { RiskLevel } from "./types";
import styles from "./SecurityDashboard.module.css";

const riskLevelClass: Record<RiskLevel, string> = {
  Critical: styles.critical,
  High: styles.high,
  Medium: styles.medium,
  Low: styles.low,
};

export function RiskLevelBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  return (
    <span className={`${styles.badge} ${riskLevelClass[riskLevel]}`}>
      {riskLevel}
    </span>
  );
}
```

Không tạo class CSS bằng chuỗi động như `styles[riskLevel]` nếu dữ liệu API chưa được chuẩn hóa. Mapping tường minh giúp TypeScript kiểm tra đủ bốn mức `Low`, `Medium`, `High`, `Critical` do Risk Score Gateway trả về.

## 8. Dashboard container và filter state

Tạo `FraudGuardDashboard.tsx`:

```tsx
"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { FraudGuardFilters, TransactionRisk } from "./types";
import { StatCard } from "./StatCard";
import { TransactionRiskTable } from "./TransactionRiskTable";
import styles from "./SecurityDashboard.module.css";

interface FraudGuardDashboardProps {
  initialTransactions: TransactionRisk[];
}

const initialFilters: FraudGuardFilters = {
  query: "",
  projectId: "all",
  transactionType: "all",
  riskLevel: "all",
  scoringSource: "all",
  caseStatus: "all",
  range: 30,
};

export function FraudGuardDashboard({
  initialTransactions,
}: FraudGuardDashboardProps) {
  const [filters, setFilters] = useState(initialFilters);
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  const visibleTransactions = useMemo(() => {
    return initialTransactions.filter((transaction) => {
      const searchTarget = [
        transaction.transactionReference,
        transaction.entityReference,
        transaction.projectName,
        transaction.transactionType,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!deferredQuery || searchTarget.includes(deferredQuery)) &&
        (filters.projectId === "all" ||
          transaction.projectId === filters.projectId) &&
        (filters.transactionType === "all" ||
          transaction.transactionType === filters.transactionType) &&
        (filters.riskLevel === "all" ||
          transaction.riskLevel === filters.riskLevel) &&
        (filters.scoringSource === "all" ||
          transaction.scoringSource === filters.scoringSource) &&
        (filters.caseStatus === "all" ||
          transaction.caseStatus === filters.caseStatus)
      );
    });
  }, [deferredQuery, filters, initialTransactions]);

  const metrics = useMemo(() => {
    const highRisk = initialTransactions.filter(
      (transaction) =>
        transaction.riskLevel === "High" ||
        transaction.riskLevel === "Critical",
    );

    return {
      analyzed: initialTransactions.length,
      highRisk: highRisk.length,
      openAlerts: initialTransactions.filter(
        (transaction) => transaction.alertId && !transaction.caseId,
      ).length,
      activeCases: initialTransactions.filter(
        (transaction) =>
          transaction.caseStatus === "Open" ||
          transaction.caseStatus === "Reviewing",
      ).length,
    };
  }, [initialTransactions]);

  return (
    <div className={styles.root}>
      {/* <AppRail /> */}
      <div className={styles.workspace}>
        {/* <ProductHeader /> */}
        <div className={styles.bodyLayout}>
          {/* <SecondaryNav /> */}
          <main className={styles.main}>
            <div className={styles.breadcrumb}>
              FraudGuard / Monitoring / Risk overview
            </div>

            <div className={styles.pageHeading}>
              <div>
                <h1>Transaction risk overview</h1>
                <p>
                  Theo dõi risk score, cảnh báo và case cần nhân sự kiểm tra.
                </p>
              </div>
            </div>

            {/* <DashboardToolbar filters={filters} onChange={setFilters} /> */}

            <section className={styles.metricsGrid}>
              <StatCard
                label="Transactions analyzed"
                value={metrics.analyzed}
                description="Trong khoảng thời gian đã chọn"
              />
              <StatCard
                label="High-risk transactions"
                value={metrics.highRisk}
                description="High hoặc Critical"
                tone="critical"
              />
              <StatCard
                label="Open alerts"
                value={metrics.openAlerts}
                description="Chưa chuyển thành case"
              />
              <StatCard
                label="Active cases"
                value={metrics.activeCases}
                description="Open hoặc Reviewing"
                tone="warning"
              />
            </section>

            {/* Chart panels đặt ở đây */}

            <TransactionRiskTable
              transactions={visibleTransactions}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
```

`useDeferredValue` giúp nhập từ khóa mượt hơn khi bảng lớn. Với dữ liệu giao dịch thực tế, filter, sort và pagination nên được thực hiện ở API. Tenant và project phải được xác thực phía server; không dựa vào filter phía client để bảo đảm tenant isolation.

## 9. Toolbar có kiểm soát bằng React

```tsx
import type { Dispatch, SetStateAction } from "react";
import type { FraudGuardFilters } from "./types";
import styles from "./SecurityDashboard.module.css";

interface ToolbarProps {
  filters: FraudGuardFilters;
  projects: Array<{ id: string; name: string }>;
  transactionTypes: string[];
  onChange: Dispatch<SetStateAction<FraudGuardFilters>>;
}

export function DashboardToolbar({
  filters,
  projects,
  transactionTypes,
  onChange,
}: ToolbarProps) {
  const patch = (next: Partial<FraudGuardFilters>) =>
    onChange((current) => ({ ...current, ...next }));

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <select
          className={styles.control}
          aria-label="Project"
          value={filters.projectId}
          onChange={(event) =>
            patch({ projectId: event.target.value })
          }
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          className={styles.control}
          aria-label="Transaction type"
          value={filters.transactionType}
          onChange={(event) =>
            patch({ transactionType: event.target.value })
          }
        >
          <option value="all">All transaction types</option>
          {transactionTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <select
          className={styles.control}
          aria-label="Scoring source"
          value={filters.scoringSource}
          onChange={(event) =>
            patch({
              scoringSource:
                event.target.value as FraudGuardFilters["scoringSource"],
            })
          }
        >
          <option value="all">All scoring sources</option>
          <option value="AI">AI</option>
          <option value="RULE">Rule Engine</option>
          <option value="RULE_FALLBACK">Rule fallback</option>
        </select>
      </div>

      <div className={styles.toolbarGroup}>
        <select
          className={styles.control}
          aria-label="Time range"
          value={filters.range}
          onChange={(event) =>
            patch({ range: Number(event.target.value) as 7 | 30 | 90 })
          }
        >
          <option value={7}>Past 7 days</option>
          <option value={30}>Past 30 days</option>
          <option value={90}>Past 90 days</option>
        </select>

        <button className={styles.button} type="button">
          Export report
        </button>
      </div>
    </div>
  );
}
```

## 10. Bảng giao dịch và rủi ro

```tsx
"use client";

import type { Dispatch, SetStateAction } from "react";
import type { FraudGuardFilters, TransactionRisk } from "./types";
import { RiskLevelBadge } from "./RiskLevelBadge";
import styles from "./SecurityDashboard.module.css";

interface TransactionRiskTableProps {
  transactions: TransactionRisk[];
  filters: FraudGuardFilters;
  onFiltersChange: Dispatch<SetStateAction<FraudGuardFilters>>;
}

export function TransactionRiskTable({
  transactions,
  filters,
  onFiltersChange,
}: TransactionRiskTableProps) {
  const patch = (next: Partial<FraudGuardFilters>) =>
    onFiltersChange((current) => ({ ...current, ...next }));

  return (
    <section className={`${styles.panel} ${styles.tablePanel}`}>
      <div className={`${styles.panelHeader} ${styles.tablePanelHeader}`}>
        <div>
          <h2>Scored transactions</h2>
          <p className={styles.muted}>
            Kết quả do Risk Score Gateway chuẩn hóa trên thang 0–100
          </p>
        </div>
        <span className={styles.muted}>{transactions.length} transactions</span>
      </div>

      <div className={styles.tableControls}>
        <div className={styles.tabs} aria-label="Transaction view">
          <button className={`${styles.tab} ${styles.tabActive}`} type="button">
            All transactions
          </button>
          <button className={styles.tab} type="button">
            Alerts only
          </button>
          <button className={styles.tab} type="button">
            Cases
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <input
            className={styles.searchInput}
            type="search"
            aria-label="Search transactions"
            placeholder="Search transaction, entity, or project…"
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
          />

          <select
            className={styles.control}
            aria-label="Risk level"
            value={filters.riskLevel}
            onChange={(event) =>
              patch({
                riskLevel:
                  event.target.value as FraudGuardFilters["riskLevel"],
              })
            }
          >
            <option value="all">All risk levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Risk</th>
              <th>Transaction</th>
              <th>Project / Type</th>
              <th>Score</th>
              <th>Scoring source</th>
              <th>Processed at</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td className={styles.emptyState} colSpan={7}>
                  Không có kết quả phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>
                    <RiskLevelBadge riskLevel={transaction.riskLevel} />
                  </td>
                  <td>
                    <span className={styles.findingName}>
                      {transaction.transactionReference}
                    </span>
                    <span className={styles.findingMeta}>
                      Entity: {transaction.entityReference}
                    </span>
                  </td>
                  <td>
                    {transaction.projectName}
                    <span className={styles.findingMeta}>
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td>{transaction.riskScore}/100</td>
                  <td>{transaction.scoringSource}</td>
                  <td>{transaction.processedAt}</td>
                  <td>
                    <button className={styles.button} type="button">
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

Không gắn `onClick` lên toàn bộ `<tr>` nếu row bên trong có button hoặc link. Nút `Review` mở drawer gồm dữ liệu giao dịch, risk score, scoring source, triggered rules hoặc AI explanation. Giao diện chỉ cho phép tạo/phân công case và cập nhật kết luận của nhân sự; không cung cấp hành động tự động hủy giao dịch hoặc khóa tài khoản.

## 11. Gắn vào route Next.js

`src/app/fraud-monitoring/page.tsx`:

```tsx
import { FraudGuardDashboard } from "@/components/fraudguard-dashboard/FraudGuardDashboard";
import { fraudGuardTransactions } from "@/data/fraudguard-transactions";

export default function FraudMonitoringPage() {
  return (
    <FraudGuardDashboard initialTransactions={fraudGuardTransactions} />
  );
}
```

Khi nối API thật:

```tsx
import { FraudGuardDashboard } from "@/components/fraudguard-dashboard/FraudGuardDashboard";
import type { TransactionRisk } from "@/components/fraudguard-dashboard/types";

async function getTransactions(): Promise<TransactionRisk[]> {
  const response = await fetch(`${process.env.API_URL}/transactions/scored`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error("Không thể tải dữ liệu giao dịch đã chấm điểm");
  }

  return response.json();
}

export default async function FraudMonitoringPage() {
  const transactions = await getTransactions();
  return <FraudGuardDashboard initialTransactions={transactions} />;
}
```

Không đưa token bí mật hoặc API key ingestion vào Client Component. Server phải kiểm tra session, role, tenant và project trước khi trả transaction data. API key của project chỉ xuất hiện trong luồng quản lý key với cơ chế mask, regenerate và revoke.

## 12. Biểu đồ

Có ba hướng triển khai:

1. **SVG thuần**: phù hợp funnel đơn giản, sparkline nhỏ và ít dependency.
2. **Recharts**: phù hợp dashboard đồ án, dễ tạo line chart, area chart, tooltip và responsive container.
3. **ECharts**: phù hợp dữ liệu lớn và biểu đồ phức tạp hơn.

Nếu dùng Recharts, component biểu đồ phải là Client Component:

```tsx
"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TransactionRiskTrend({
  data,
}: {
  data: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
  }>;
}) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#383a44" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#81889a" fontSize={10} />
          <YAxis stroke="#81889a" fontSize={10} />
          <Tooltip
            contentStyle={{
              background: "#25272e",
              border: "1px solid #454752",
              borderRadius: 4,
            }}
          />
          <Legend />
          <Line dataKey="critical" stroke="#ed6775" dot={false} />
          <Line dataKey="high" stroke="#eda765" dot={false} />
          <Line dataKey="medium" stroke="#ad8af3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Các chart chính của FraudGuard nên gồm: số transaction theo thời gian, phân bố risk level, tỷ lệ scoring source `AI/RULE/RULE_FALLBACK`, alert/case theo trạng thái và top triggered rules. Không đặt màu trực tiếp ở nhiều component. Nếu thư viện chart không đọc được CSS variable, tạo một file `chart-colors.ts` để giữ màu tập trung.

## 13. Quy tắc responsive

| Breakpoint | Thay đổi |
|---|---|
| `> 1150px` | Hiển thị đầy đủ rail, subnav, 4 KPI và chart 2 cột |
| `901–1150px` | Thu hẹp subnav và khoảng cách nội dung |
| `681–900px` | Ẩn subnav, giữ rail và chart 2 cột hẹp |
| `421–680px` | Header xuống 2 hàng, chart thành 1 cột, KPI 2 cột |
| `≤ 420px` | KPI thành 1 cột nếu nội dung dài |

Với bảng, giữ `overflow-x: auto`; không ép tất cả cột co lại vì sẽ làm mất khả năng đọc. Trên mobile có thể thay table bằng card list nếu luồng sử dụng mobile quan trọng.

## 14. Trạng thái bắt buộc

Dashboard hoàn chỉnh cần có:

- `loading.tsx`: skeleton cho KPI, chart và bảng.
- `error.tsx`: thông báo lỗi cùng nút thử lại.
- Empty state khi bộ lọc không có kết quả.
- Trạng thái disabled/loading khi export hoặc thay đổi status.
- Toast sau thao tác thành công.
- Drawer cho chi tiết transaction/alert/case.

Ví dụ skeleton:

```css
.skeleton {
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    #25262c 25%,
    #303139 50%,
    #25262c 75%
  );
  background-size: 200% 100%;
  animation: dashboardShimmer 1.3s linear infinite;
}

@keyframes dashboardShimmer {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
```

## 15. Accessibility checklist

- Dùng `<button>` cho hành động và `<a>`/`Link` cho điều hướng.
- Mỗi `<select>` và `<input>` cần label hoặc `aria-label`.
- Tab cần `role="tablist"`, `role="tab"` và `aria-selected`.
- Icon-only button phải có `aria-label` hoặc tooltip truy cập được.
- Không chỉ dùng màu để truyền đạt risk level; luôn có chữ `Critical`, `High`, v.v.
- Modal cần focus trap, nút đóng và hỗ trợ phím `Escape`. Nên dùng Radix Dialog hoặc component dialog sẵn có của hệ thống UI.
- Chart cần phần mô tả chữ hoặc bảng dữ liệu tương đương cho screen reader.
- Giữ focus ring rõ ràng; không dùng `outline: none`.

## 16. Quy ước khi nối backend

Đề xuất response của API:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 182,
    "generatedAt": "2026-09-17T10:00:00Z"
  },
  "summary": {
    "transactionsAnalyzed": 12480,
    "highRiskTransactions": 186,
    "openAlerts": 42,
    "activeCases": 17,
    "ruleFallbackCount": 23
  }
}
```

Khi filter được thực hiện ở server, đồng bộ filter với URL:

```text
/fraud-monitoring?project=checkout&riskLevel=critical&source=ai&page=1
```

Ưu điểm:

- Reload không làm mất bộ lọc.
- Có thể chia sẻ đường dẫn đang xem.
- Back/forward của trình duyệt hoạt động đúng.
- Server có thể cache từng bộ lọc.

Trong Next.js, dùng `useSearchParams()` để đọc query và `router.replace()` để cập nhật URL. Debounce ô search khoảng `250–400ms` trước khi thay URL.

## 17. Các màn hình cần triển khai cho FraudGuard

| Route | Mục đích | Actor chính |
|---|---|---|
| `/fraud-monitoring` | Tổng quan transaction, risk distribution, scoring source | SME Admin, Risk Staff, Viewer |
| `/transactions` | Danh sách và chi tiết giao dịch đã validate/scoring | SME Admin, Risk Staff, Viewer |
| `/alerts` | Cảnh báo vượt threshold và evidence | Risk Staff |
| `/cases` | Điều tra, phân công, ghi chú và kết luận | Risk Staff, SME Admin |
| `/rules` | Rule, AND/OR conditions, risk point, threshold, publish history | SME Admin, Platform/Technical Staff |
| `/projects` | Project, đặc tả, custom field đã xác nhận, quota, API key | SME Admin |
| `/reports` | Xuất CSV/PDF theo phạm vi quyền | SME Admin, Risk Staff, Viewer |
| `/platform` | SME accounts, plan, system health, queue, AI health, audit | Platform Admin |

Free Plan dùng Rule Engine làm scoring source chính. Subscription Plan dùng AI làm đường chính và hiển thị `RULE_FALLBACK` rõ ràng khi AI timeout hoặc unavailable. UI phải giữ cùng thang điểm 0–100 và cùng risk level cho cả hai đường xử lý.

## 18. Thứ tự triển khai nhanh

1. Thêm tokens vào `globals.css`.
2. Tạo `types.ts` và dữ liệu mock đúng shape API.
3. Dựng `AppRail`, `ProductHeader`, `SecondaryNav` và responsive layout.
4. Tạo `Panel`, `StatCard`, `RiskLevelBadge`.
5. Thêm toolbar và filter state.
6. Thêm bảng, empty state và drawer chi tiết.
7. Thêm chart sau khi layout và data flow đã ổn định.
8. Thay mock data bằng API.
9. Kiểm tra keyboard, mobile, loading, error và empty state.

## 19. Definition of Done

- Giao diện đúng dark theme và hierarchy của dashboard.
- Không có horizontal scroll toàn trang ở desktop/mobile.
- Chỉ vùng bảng được scroll ngang khi cần.
- Filter, search, tab và sort hoạt động bằng state React.
- URL lưu filter nếu dữ liệu được filter từ backend.
- Component không chứa màu rải rác ngoài hệ thống token.
- Có loading, error và empty state.
- Có focus ring, label và keyboard navigation.
- Không đưa secret vào Client Component.
- Dữ liệu mock có thể thay bằng Transaction Ingestion, Risk Score Gateway và Case API mà không phải sửa cấu trúc UI.
- Mọi màn hình kiểm tra role cùng tenant/project; không dựa vào việc ẩn button để bảo vệ quyền.
- Chi tiết alert luôn hiển thị scoring source và triggered rules hoặc AI explanation.
- Không có action tự động hủy giao dịch hoặc khóa tài khoản khách hàng.

## 20. Tài liệu Next.js liên quan

- CSS và CSS Modules: <https://nextjs.org/docs/app/getting-started/css>
- Server và Client Components: <https://nextjs.org/docs/app/getting-started/server-and-client-components>
- Data fetching: <https://nextjs.org/docs/app/getting-started/fetching-data>
- Route handlers: <https://nextjs.org/docs/app/building-your-application/routing/route-handlers>
