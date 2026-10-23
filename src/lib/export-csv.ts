import type { TransactionRisk } from "@/components/fraudguard-dashboard/types";

/**
 * Convert an array of transactions into a CSV string and trigger a download.
 */
export function exportTransactionsCSV(
  transactions: TransactionRisk[],
  filename = "fraudguard-transactions.csv",
) {
  const headers = [
    "Detection Result",
    "Transaction Ref",
    "Project",
    "Type",
    "Detection Source",
    "Triggered Rules",
    "Applicable Rules", "Evaluated Rules", "Matched Rules", "Failed Rules", "Processing Status",
    "Explanation",
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
    t.scoringSource,
    t.triggeredRules.join("; "),
    t.ruleEvaluation?.applicable ?? "", t.ruleEvaluation?.evaluated ?? "", t.ruleEvaluation?.matched ?? "", t.ruleEvaluation?.failed ?? "", t.ruleEvaluation?.status ?? "",
    t.explanation ?? "",
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

/**
 * Download a standardized SME Transaction Ingestion CSV template (Module M0 & Review 1 Spec).
 */
export function downloadCSVTemplate() {
  const headers = [
    "transaction_reference",
    "timestamp",
    "amount",
    "currency",
    "transaction_type",
    "user_hash",
    "device_hash",
    "ip_hash",
    "channel",
    "payment_method",
  ];

  const sampleRows = [
    [
      "2026-09-30T10:15:00Z",
      "2500000",
      "VND",
      "subscription",
      "usr_edtech_991",
      "dev_ios_442",
      "113.161.42.18",
      "mobile_app",
      "credit_card",
    ],
    [
      "2026-09-30T10:16:30Z",
      "15000000",
      "VND",
      "refund",
      "usr_edtech_882",
      "dev_win_112",
      "203.113.152.8",
      "web",
      "bank_transfer",
    ],
    [
      "2026-09-30T10:20:15Z",
      "750000",
      "VND",
      "payment",
      "usr_edtech_773",
      "dev_android_901",
      "14.162.180.22",
      "mobile_app",
      "e_wallet",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map((values, index) =>
      ["DEMO-IMPORT-" + (index + 1), ...values]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sme_fraudguard_ingestion_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
