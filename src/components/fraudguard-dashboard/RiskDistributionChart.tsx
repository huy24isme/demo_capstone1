"use client";

import { useEffect, useState } from "react";
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

const BINARY_COLORS: Record<string, string> = {
  "Bình thường (Normal)": "#78c9ac",
  "Bất thường (Anomaly)": "#ed6775",
};

interface RiskDistributionChartProps {
  transactions: TransactionRisk[];
  threshold?: number;
}

export function RiskDistributionChart({
  transactions,
  threshold = 75,
}: RiskDistributionChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const anomalies = transactions.filter((t) => t.riskScore >= threshold).length;
  const normals = transactions.length - anomalies;

  const distribution = [
    {
      level: "Bình thường (Normal)",
      count: normals,
      percentage: transactions.length > 0 ? ((normals / transactions.length) * 100).toFixed(1) : "0",
    },
    {
      level: "Bất thường (Anomaly)",
      count: anomalies,
      percentage: transactions.length > 0 ? ((anomalies / transactions.length) * 100).toFixed(1) : "0",
    },
  ];

  if (!mounted) {
    return <div className={styles.chartArea} />;
  }

  return (
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--security-border)" strokeDasharray="3 3" />
          <XAxis dataKey="level" stroke="var(--security-muted)" fontSize={11} />
          <YAxis stroke="var(--security-muted)" fontSize={10} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--security-panel)",
              border: "1px solid var(--security-border)",
              borderRadius: 4,
              color: "var(--security-text)",
            }}
            formatter={(value: any, name: any, item: any) => [
              `${value} giao dịch (${item.payload.percentage}%)`,
              "Số lượng",
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distribution.map((entry) => (
              <Cell
                key={entry.level}
                fill={BINARY_COLORS[entry.level]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
