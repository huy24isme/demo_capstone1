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
import { useLanguage } from "./i18n/LanguageContext";

interface RiskDistributionChartProps {
  transactions: TransactionRisk[];

}

export function RiskDistributionChart({
  transactions,

}: RiskDistributionChartProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const anomalies = transactions.filter((t) => t.riskLevel === "Abnormal").length;
  const normals = transactions.filter(transaction => transaction.riskLevel === "Normal").length;

  const normalLabel = t.riskOverview.charts.distNormal;
  const anomalyLabel = t.riskOverview.charts.distAnomaly;

  const distribution = [
    { level: 'Undetermined', color: '#eda765', count: transactions.filter(transaction => transaction.riskLevel === 'Undetermined').length, percentage: transactions.length ? (transactions.filter(transaction => transaction.riskLevel === 'Undetermined').length / transactions.length * 100).toFixed(1) : '0' },
    {
      level: normalLabel,
      color: "#78c9ac",
      count: normals,
      percentage:
        transactions.length > 0
          ? ((normals / transactions.length) * 100).toFixed(1)
          : "0",
    },
    {
      level: anomalyLabel,
      color: "#ed6775",
      count: anomalies,
      percentage:
        transactions.length > 0
          ? ((anomalies / transactions.length) * 100).toFixed(1)
          : "0",
    },
  ];

  if (!mounted) {
    return <div className={styles.chartArea} />;
  }

  return (
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={distribution}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--security-border)" strokeDasharray="3 3" />
          <XAxis dataKey="level" stroke="var(--security-muted)" fontSize={11} />
          <YAxis
            stroke="var(--security-muted)"
            fontSize={10}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--security-panel)",
              border: "1px solid var(--security-border)",
              borderRadius: 4,
              color: "var(--security-text)",
            }}
            formatter={(value: any, _name: any, item: any) => [
              t.riskOverview.charts.distTooltip
                .replace("{count}", String(value))
                .replace("{percent}", item.payload.percentage),
              t.riskOverview.charts.distQuantity,
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distribution.map((entry) => (
              <Cell key={entry.level} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
