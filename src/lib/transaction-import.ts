import type { RuleTemplate, TransactionRisk } from '../components/fraudguard-dashboard/types';
import { parseIngestionRows } from './ingestion-validation';
import { parseRuleSetSamples, evaluateRuleSet, detectionTransaction } from './rule-set';
export function previewTransactionImport(text: string, filename: string, projectId: string, projectName: string, rules: RuleTemplate[], existing: TransactionRisk[]) {
 if (!projectId || !rules.length) throw new Error('Chưa có tập quy tắc đang hoạt động cho phạm vi này.');
 const rows=parseIngestionRows(text,filename);
 if(rows.length>1000)throw new Error('Mỗi lần nhập tối đa 1.000 giao dịch.');
 const refs=new Set(existing.filter(t=>t.projectId===projectId).map(t=>t.transactionReference));
 return rows.map((row,index)=>{
  try {
   if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Dòng dữ liệu không hợp lệ.');
   if(row.projectId!==undefined&&row.projectId!==projectId)throw Error('Dữ liệu thuộc phạm vi khác.');
   const ref=String(row.ref??row.transaction_reference??row.id??'').trim();
   if(!ref)throw Error('Thiếu mã giao dịch: ref hoặc transaction_reference.');
   if(refs.has(ref))throw Error('Mã giao dịch bị trùng: '+ref);refs.add(ref);
   const transactionType=String(row.transactionType??row.transaction_type??'').trim();
   let fields=row.fields;
   if(fields===undefined){fields=Object.fromEntries(Object.entries(row).filter(([key])=>!['ref','id','projectId','transactionType','transaction_type','transaction_reference','expected'].includes(key)).map(([key,value])=>{
    if(typeof value!=='string')return [key,value];
    const trimmed=value.trim();
    if(trimmed==='true'||trimmed==='false')return [key,trimmed==='true'];
    if(!/(hash|id|reference|name|phone|code)/i.test(key)&&/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed))return [key,Number(trimmed)];
    return [key,value];
   }));}
   const sample=parseRuleSetSamples(JSON.stringify([{id:ref,ref,projectId,transactionType,fields}]))[0];
   const evaluation=evaluateRuleSet(rules,sample);
   if(evaluation.status!=='Complete')throw Error(evaluation.rules.filter(r=>r.error).map(r=>r.name+': '+r.error).join('; ')||'Không có quy tắc áp dụng cho loại giao dịch này.');
   const transaction=detectionTransaction(sample,evaluation,projectName,'import:'+encodeURIComponent(projectId)+':'+encodeURIComponent(ref));
   transaction.explanation='Kiểm tra file demo: '+evaluation.matched+'/'+evaluation.evaluated+' quy tắc phát hiện bất thường.';
   return {row:index+1,ref,transaction,error:''};
  }catch(error){return {row:index+1,ref:String(row?.ref??row?.transaction_reference??row?.id??''),error:error instanceof Error?error.message:String(error),transaction:undefined};}
 });
}
