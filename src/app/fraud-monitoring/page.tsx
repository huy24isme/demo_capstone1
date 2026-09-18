import { FraudGuardDashboard } from "@/components/fraudguard-dashboard/FraudGuardDashboard";
import { fraudGuardTransactions } from "@/data/fraudguard-transactions";
import { fraudGuardRules } from "@/data/fraudguard-rules";

export default function FraudMonitoringPage() {
  return (
    <FraudGuardDashboard
      initialTransactions={fraudGuardTransactions}
      initialRules={fraudGuardRules}
    />
  );
}
