"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./SecurityDashboard.module.css";
import type { TransactionRisk } from "./types";

const RISK_COLORS: Record<string, string> = {
  Critical: "#ed6775",
  High: "#eda765",
  Medium: "#ad8af3",
  Low: "#78c9ac",
};

interface RiskDistributionChartProps {
  transactions: TransactionRisk[];
}

export function RiskDistributionChart({
  transactions,
}: RiskDistributionChartProps) {
  const distribution = ["Critical", "High", "Medium", "Low"].map((level) => ({
    level,
    count: transactions.filter((t) => t.riskLevel === level).length,
  }));

  return (
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution}>
          <CartesianGrid stroke="var(--security-border)" strokeDasharray="3 3" />
          <XAxis dataKey="level" stroke="var(--security-muted)" fontSize={10} />
          <YAxis stroke="var(--security-muted)" fontSize={10} />
          <Tooltip
            contentStyle={{
              background: "var(--security-panel)",
              border: "1px solid var(--security-border)",
              borderRadius: 4,
              color: "var(--security-text)",
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {distribution.map((entry) => (
              <Cell
                key={entry.level}
                fill={RISK_COLORS[entry.level]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
