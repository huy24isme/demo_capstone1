import type { TransactionRisk, UserProfile } from '../components/fraudguard-dashboard/types';
export interface DeploymentSpecification { requirements: string; fields: string; conditions: string; sampleJson: string; updatedAt: string; confirmedAt?: string; confirmedBy?: string }
export type ServicePlan = "Free" | "Subscription";
export interface Enterprise { plan?: ServicePlan; specification?: DeploymentSpecification; id: string; name: string; projectIds: string[]; deploymentStaffId: string }
// Synthetic ownership and staff assignments used by the local demo.
export const demoEnterprises: Enterprise[] = [
 { id: 'tenant-techpay', name: 'TechPay Solution JSC', projectIds: ['proj-checkout', 'proj-wallet'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-fastretail', name: 'FastRetail Commerce SME', projectIds: ['proj-market'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-edulearn', name: 'EduLearn EdTech Academy', projectIds: ['proj-edtech'], deploymentStaffId: 'usr-deployment-2' },
 { id: 'tenant-abc', name: 'ABC Fashion', projectIds: ['proj-abc-cod'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-greenmart', name: 'GreenMart Global Online', projectIds: [], deploymentStaffId: 'usr-deployment-2' },
];
export function canDeploy(user: UserProfile, enterprise: Enterprise) { return user.role === 'Implementation Staff' && user.id === enterprise.deploymentStaffId; }
export function transactionsForEnterprise(transactions: TransactionRisk[], user: UserProfile, enterprises: Enterprise[]) {
 const projects = enterprises.find(e => e.id === user.enterpriseId)?.projectIds ?? [];
 return transactions.filter(tx => projects.includes(tx.projectId));
}
export function visibleEnterprises(user: UserProfile, enterprises: Enterprise[]) {
 if (user.role === 'Platform Admin') return enterprises;
 if (user.role === 'Implementation Staff') return enterprises.filter(e => canDeploy(user, e));
 return enterprises.filter(e => e.id === user.enterpriseId);
}

export function enterpriseUsage(enterprise: Enterprise, transactions: TransactionRisk[]) {
 const scoped = transactions.filter(tx => enterprise.projectIds.includes(tx.projectId));
 return { total: scoped.length, ai: scoped.filter(tx => tx.scoringSource === 'AI').length, rule: scoped.filter(tx => tx.scoringSource === 'RULE').length, fallback: scoped.filter(tx => tx.scoringSource === 'RULE_FALLBACK').length };
}
export function enterprisePlan(enterprise: Enterprise): ServicePlan | undefined {
 if (enterprise.plan) return enterprise.plan;
 // Preserve plans previously shown for these demo enterprises; no default for new customers.
 if (enterprise.id === 'tenant-greenmart') return 'Free';
 if (['tenant-techpay','tenant-fastretail','tenant-edulearn'].includes(enterprise.id)) return 'Subscription';
 return undefined;
}
