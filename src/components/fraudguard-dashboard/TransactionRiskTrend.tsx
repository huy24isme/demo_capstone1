"use client";

import { useMemo } from "react";
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
import styles from "./SecurityDashboard.module.css";

interface TransactionRiskTrendProps {
  transactions?: TransactionRisk[];
  threshold?: number;
}

export function TransactionRiskTrend({
  transactions,
  threshold = 75,
}: TransactionRiskTrendProps) {
  const trendData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Sort transactions chronologically
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime(),
    );

    // Aggregate by date (e.g. "Sep 12", "Sep 13")
    const dateMap = new Map<
      string,
      { date: string; anomaly: number; normal: number; total: number }
    >();

    sorted.forEach((t) => {
      const d = new Date(t.processedAt);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
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

  if (trendData.length === 0) {
    return (
      <div className={styles.chartArea} style={{ display: "grid", placeItems: "center" }}>
        <p className={styles.muted}>Không có dữ liệu xu hướng phù hợp với bộ lọc hiện tại.</p>
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
            name="Bất thường (Anomaly)"
            dataKey="anomaly"
            stroke="#ed6775"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
          <Line
            name="Bình thường (Normal)"
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
