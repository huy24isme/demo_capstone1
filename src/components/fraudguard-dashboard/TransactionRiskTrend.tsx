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
import styles from "./SecurityDashboard.module.css";

interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
}

const mockTrendData: TrendDataPoint[] = [
  { date: "Sep 01", critical: 3, high: 8, medium: 15 },
  { date: "Sep 03", critical: 5, high: 12, medium: 18 },
  { date: "Sep 05", critical: 2, high: 9, medium: 14 },
  { date: "Sep 07", critical: 7, high: 15, medium: 22 },
  { date: "Sep 09", critical: 4, high: 11, medium: 16 },
  { date: "Sep 11", critical: 6, high: 14, medium: 20 },
  { date: "Sep 13", critical: 3, high: 10, medium: 17 },
  { date: "Sep 15", critical: 8, high: 16, medium: 25 },
  { date: "Sep 17", critical: 5, high: 13, medium: 19 },
];

export function TransactionRiskTrend() {
  return (
    <div className={styles.chartArea}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mockTrendData}>
          <CartesianGrid stroke="#383a44" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#81889a" fontSize={10} />
          <YAxis stroke="#81889a" fontSize={10} />
          <Tooltip
            contentStyle={{
              background: "#25272e",
              border: "1px solid #454752",
              borderRadius: 4,
              color: "#e5e5ec",
            }}
          />
          <Legend />
          <Line
            name="Critical"
            dataKey="critical"
            stroke="#ed6775"
            dot={false}
            strokeWidth={2}
          />
          <Line
            name="High"
            dataKey="high"
            stroke="#eda765"
            dot={false}
            strokeWidth={2}
          />
          <Line
            name="Medium"
            dataKey="medium"
            stroke="#ad8af3"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
