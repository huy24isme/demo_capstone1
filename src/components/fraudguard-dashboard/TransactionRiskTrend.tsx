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
}

export function TransactionRiskTrend({ transactions }: TransactionRiskTrendProps) {
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
      { date: string; critical: number; high: number; medium: number; low: number }
    >();

    sorted.forEach((t) => {
      const d = new Date(t.processedAt);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      if (!dateMap.has(label)) {
        dateMap.set(label, { date: label, critical: 0, high: 0, medium: 0, low: 0 });
      }
      const entry = dateMap.get(label)!;
      if (t.riskLevel === "Critical") entry.critical += 1;
      else if (t.riskLevel === "High") entry.high += 1;
      else if (t.riskLevel === "Medium") entry.medium += 1;
      else if (t.riskLevel === "Low") entry.low += 1;
    });

    return Array.from(dateMap.values());
  }, [transactions]);

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
        <LineChart data={trendData}>
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
            name="Critical"
            dataKey="critical"
            stroke="#ed6775"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
          <Line
            name="High"
            dataKey="high"
            stroke="#eda765"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
          <Line
            name="Medium"
            dataKey="medium"
            stroke="#ad8af3"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
          <Line
            name="Low"
            dataKey="low"
            stroke="#78c9ac"
            dot={{ r: 3 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
