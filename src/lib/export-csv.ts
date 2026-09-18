import type { TransactionRisk } from "@/components/fraudguard-dashboard/types";

/**
 * Convert an array of transactions into a CSV string and trigger a download.
 */
export function exportTransactionsCSV(
  transactions: TransactionRisk[],
  filename = "fraudguard-transactions.csv",
) {
  const headers = [
    "Risk Level",
    "Transaction Ref",
    "Project",
    "Type",
    "Score",
    "Scoring Source",
    "Entity",
    "Amount",
    "Currency",
    "Case Status",
    "Processed At",
  ];

  const rows = transactions.map((t) => [
    t.riskLevel,
    t.transactionReference,
    t.projectName,
    t.transactionType,
    t.riskScore,
    t.scoringSource,
    t.entityReference,
    t.amount ?? "",
    t.currency ?? "",
    t.caseStatus ?? "",
    t.processedAt,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
