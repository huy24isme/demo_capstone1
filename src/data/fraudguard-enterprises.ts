import type { UserProfile } from '../components/fraudguard-dashboard/types';
export interface Enterprise { id: string; name: string; projectIds: string[]; deploymentStaffId: string }
// Synthetic ownership and staff assignments used by the local demo.
export const demoEnterprises: Enterprise[] = [
 { id: 'tenant-techpay', name: 'TechPay Solution JSC', projectIds: ['proj-checkout', 'proj-wallet'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-fastretail', name: 'FastRetail Commerce SME', projectIds: ['proj-market'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-edulearn', name: 'EduLearn EdTech Academy', projectIds: ['proj-edtech'], deploymentStaffId: 'usr-deployment-2' },
 { id: 'tenant-abc', name: 'ABC Fashion', projectIds: ['proj-abc-cod'], deploymentStaffId: 'usr-deployment' },
 { id: 'tenant-greenmart', name: 'GreenMart Global Online', projectIds: [], deploymentStaffId: 'usr-deployment-2' },
];
export function canDeploy(user: UserProfile, enterprise: Enterprise) { return user.role === 'Deployment Staff' && user.id === enterprise.deploymentStaffId; }
export function visibleEnterprises(user: UserProfile, enterprises: Enterprise[]) {
 if (user.role === 'Platform Admin') return enterprises;
 if (user.role === 'Deployment Staff') return enterprises.filter(e => canDeploy(user, e));
 return enterprises.filter(e => e.id === user.enterpriseId);
}
