import type { TransactionRisk } from '../components/fraudguard-dashboard/types';
export function platformSummary(transactions: TransactionRisk[]) {
 const ai = transactions.filter(t=>t.scoringSource==='AI');
 const fallback = transactions.filter(t=>t.scoringSource==='RULE_FALLBACK');
 const buckets = new Map<string,{time:string;aiRequests:number;fallbackRequests:number}>();
 for(const tx of [...ai,...fallback]) {
  const date=new Date(tx.processedAt); if(!Number.isFinite(date.getTime()))continue;
  const time=date.toISOString().slice(0,13)+':00Z';
  const row=buckets.get(time)??{time,aiRequests:0,fallbackRequests:0};
  if(tx.scoringSource==='AI')row.aiRequests++;else row.fallbackRequests++;
  buckets.set(time,row);
 }
 return {fallbackRate:ai.length+fallback.length ? fallback.length/(ai.length+fallback.length)*100 : null,
 trend:[...buckets.values()].sort((a,b)=>a.time.localeCompare(b.time)),
 feedback:ai.filter(tx=>tx.caseDecision && ['Confirmed Fraud','False Alarm'].includes(tx.caseDecision.status))};
}
