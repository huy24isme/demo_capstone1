"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { TransactionRisk } from "./types";
import { useLanguage } from "./i18n/LanguageContext";
import styles from "./SecurityDashboard.module.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TransactionRiskTrendProps {
  transactions?: TransactionRisk[];
  threshold?: number;
}

export function TransactionRiskTrend({
  transactions,
  threshold = 75,
}: TransactionRiskTrendProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trendData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Sort transactions chronologically
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime(),
    );

    // Aggregate by date (deterministic UTC to avoid SSR timezone hydration mismatch)
    const dateMap = new Map<
      string,
      { date: string; anomaly: number; normal: number; total: number }
    >();

    sorted.forEach((t) => {
      const d = new Date(t.processedAt);
      const label = `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
      if (!dateMap.has(label)) {
        dateMap.set(label, { date: label, anomaly: 0, normal: 0, total: 0 });
      }
      const entry = dateMap.get(label)!;
      entry.total += 1;
      if (t.riskScore >= threshold) {
        entry.anomaly += 1;
      } else {
        entry.normal += 1;
      }
    });

    return Array.from(dateMap.values());
  }, [transactions, threshold]);

  if (!mounted) {
    return <div className={styles.chartArea} />;
  }

  if (trendData.length === 0) {
    return (
      <div className={styles.chartArea} style={{ display: "grid", placeItems: "center" }}>
        <p className={styles.muted}>{t.riskOverview.charts.trendEmpty}</p>
      </div>
    );
  }

  return (
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--security-border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--security-muted)" fontSize={10} />
          <YAxis stroke="var(--security-muted)" fontSize={10} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--security-panel)",
              border: "1px solid var(--security-border)",
              borderRadius: 4,
              color: "var(--security-text)",
            }}
          />
          <Legend />
          <Line
            name={t.risk.anomaly}
            dataKey="anomaly"
            stroke="#ed6775"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
          <Line
            name={t.risk.normal}
            dataKey="normal"
            stroke="#78c9ac"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
