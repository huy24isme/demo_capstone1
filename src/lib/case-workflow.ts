import type { TransactionRisk, UserProfile } from "../components/fraudguard-dashboard/types";
export function canUpdateCase(previous: TransactionRisk, updated: TransactionRisk, user: UserProfile): boolean {
  if (user.role === 'Viewer' || user.role === 'Platform Admin') return false;
  if (['Confirmed Fraud', 'False Alarm', 'Resolved'].includes(previous.caseStatus ?? '')) return false;
  if (user.role === 'Investigator') {
    if (previous.assignedInvestigator !== user.name || updated.assignedInvestigator !== previous.assignedInvestigator) return false;
    if (previous.caseStatus === 'Assigned') return updated.caseStatus === 'Investigating';
    if (previous.caseStatus !== 'Investigating') return false;
    if (updated.caseStatus === 'Reported') return !!updated.investigationReport?.notes.trim() && updated.investigationReport.submittedBy === user.name;
    return updated.caseStatus === 'Investigating';
  }
  if (user.role !== 'Operation' && user.role !== 'SME Admin') return false;
  if (!previous.caseId) return previous.riskLevel === 'Abnormal' && !!updated.caseId && (updated.caseStatus === 'Open' || updated.caseStatus === 'Assigned');
  if (updated.caseStatus === 'Assigned') return !!updated.assignedInvestigator;
  if (['Confirmed Fraud', 'False Alarm', 'Resolved'].includes(updated.caseStatus ?? '')) return !!updated.caseDecision?.directive?.trim();
  if (updated.caseStatus === 'Investigating') return previous.caseStatus === 'Reported';
  return false;
}
