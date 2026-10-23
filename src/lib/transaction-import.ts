import type { RuleTemplate, TransactionRisk } from '../components/fraudguard-dashboard/types';
import { parseIngestionRows, normalizeFields, type DataField } from './ingestion-validation';
import { parseRuleSetSamples, evaluateRuleSet, detectionTransaction } from './rule-set';
export function previewTransactionImport(text: string, filename: string, projectId: string, projectName: string, rules: RuleTemplate[], existing: TransactionRisk[], schema: DataField[] = [], plan: 'Free' | 'Subscription' = 'Free') {
 if (!projectId || !rules.length) throw new Error('Chưa có tập quy tắc đang hoạt động cho phạm vi này.');
 const rows=parseIngestionRows(text,filename);
 if(rows.length>1000)throw new Error('Mỗi lần nhập tối đa 1.000 giao dịch.');
 const refs=new Set(existing.filter(t=>t.projectId===projectId).map(t=>t.transactionReference));
 return rows.map((row,index)=>{
  try {
   if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Dòng dữ liệu không hợp lệ.');
   if(row.projectId!==undefined&&row.projectId!==projectId)throw Error('Dữ liệu thuộc phạm vi khác.');
   const rawRef=row.ref??row.transaction_reference??row.id;
   if(typeof rawRef!=='string')throw Error('Mã giao dịch phải là chuỗi văn bản.');
   const ref=rawRef.trim();
   if(!ref)throw Error('Thiếu mã giao dịch: ref hoặc transaction_reference.');
   if(refs.has(ref))throw Error('Mã giao dịch bị trùng: '+ref);refs.add(ref);
   const rawType=row.transactionType??row.transaction_type;
   if(typeof rawType!=='string')throw Error('Loại giao dịch phải là chuỗi văn bản.');
   const transactionType=rawType.trim();
   let fields=row.fields;
   if(fields===undefined){fields=Object.fromEntries(Object.entries(row).filter(([key])=>!['ref','id','projectId','transactionType','transaction_type','transaction_reference','expected'].includes(key)).map(([key,value])=>{
    if(schema.some(field => field.name === key) || typeof value!=='string')return [key,value];
    if(/(hash|id|reference|name|phone|code)/i.test(key))return [key,value];
    const trimmed=value.trim();
    if(trimmed==='true'||trimmed==='false')return [key,trimmed==='true'];
    if(!/(hash|id|reference|name|phone|code)/i.test(key)&&/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed))return [key,Number(trimmed)];
    return [key,value];
   }));}
   if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw Error('Dữ liệu đánh giá phải là một đối tượng.');
   fields = normalizeFields(fields as Record<string, unknown>, schema, row.fields === undefined);
   const sample=parseRuleSetSamples(JSON.stringify([{id:ref,ref,projectId,transactionType,fields}]))[0];
   const evaluation=evaluateRuleSet(rules,sample);
   if(evaluation.status!=='Complete')throw Error(evaluation.rules.filter(r=>r.error).map(r=>r.name+': '+r.error).join('; ')||'Không có quy tắc áp dụng cho loại giao dịch này.');
   const transaction=detectionTransaction(sample,evaluation,projectName,'import:'+encodeURIComponent(projectId)+':'+encodeURIComponent(ref));
   transaction.scoringSource = plan === 'Subscription' ? 'RULE_FALLBACK' : 'RULE';
   transaction.explanation = (plan === 'Subscription' ? 'AI chưa khả dụng. Đánh giá bằng quy tắc dự phòng: ' : 'Đánh giá bằng quy tắc: ') + evaluation.matched+'/'+evaluation.evaluated+' quy tắc phát hiện bất thường.';
   return {row:index+1,ref,transaction,error:''};
  }catch(error){return {row:index+1,ref:String(row?.ref??row?.transaction_reference??row?.id??''),error:error instanceof Error?error.message:String(error),transaction:undefined};}
 });
}
