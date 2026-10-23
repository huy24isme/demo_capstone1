"use client";
import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import type { TransactionRisk } from './types';
import { useLanguage } from './i18n/LanguageContext';
import { useDialogFocus } from './useDialogFocus';
import styles from './SecurityDashboard.module.css';
export function NotificationCenter({userId, transactions, onOpen}:{userId:string;transactions:TransactionRisk[];onOpen:(tx:TransactionRisk)=>void}) {
 const {language}=useLanguage(); const vi=language==='vi';
 const [open,setOpen]=useState(false),[read,setRead]=useState<string[]>([]),[error,setError]=useState(false);
 const ref=useDialogFocus(open,()=>setOpen(false));
 const storageKey='fraudguard.notifications.read.'+userId;
 useEffect(()=>{try{const data=JSON.parse(localStorage.getItem(storageKey)||'[]');setRead(Array.isArray(data)?data.filter(id=>typeof id==='string'):[]);}catch{setError(true);}},[storageKey]);
 const entries=transactions.filter(tx=>tx.riskLevel==='Abnormal' && (tx.alertId||tx.caseId)).slice().sort((a,b)=>b.processedAt.localeCompare(a.processedAt));
 const eventId=(tx:TransactionRisk)=>[tx.id,tx.caseStatus,tx.assignedInvestigatorId,tx.caseDecision?.decidedAt,tx.investigationReport?.submittedAt].join(':');
 const unread=entries.filter(tx=>!read.includes(eventId(tx))).length;
 function mark(ids:string[]){const next=[...new Set([...read,...ids])];setRead(next);try{localStorage.setItem(storageKey,JSON.stringify(next));setError(false);}catch{setError(true);}}
 return <><button className={styles.button} aria-label={vi?'Thông báo: '+unread+' chưa đọc':'Notifications: '+unread+' unread'} onClick={()=>setOpen(true)}><Bell size={17}/> {unread||''}</button>{open&&<><div className={styles.drawerOverlay} onClick={()=>setOpen(false)}/><section className={styles.builderModal} ref={ref} role="dialog" aria-modal="true" tabIndex={-1} aria-label={vi?'Thông báo':'Notifications'}><div className={styles.builderHeader}><h2>{vi?'Thông báo':'Notifications'}</h2><button className={styles.button} onClick={()=>setOpen(false)} aria-label={vi?'Đóng':'Close'}><X size={18}/></button></div><div className={styles.builderBody}><button className={styles.button} disabled={!unread} onClick={()=>mark(entries.map(eventId))}>{vi?'Đánh dấu tất cả đã đọc':'Mark all as read'}</button>{!entries.length&&<p>{vi?'Bạn chưa có thông báo.':'You have no notifications.'}</p>}{entries.map(tx=><article className={styles.panel} key={eventId(tx)}><strong>{tx.transactionReference}</strong><p>{tx.scoringSource==='AI' ? (vi?'Cảnh báo AI':'AI alert') : (vi?'Cảnh báo quy tắc':'Rule alert')} · {read.includes(eventId(tx)) ? (vi?'Đã đọc':'Read') : (vi?'Chưa đọc':'Unread')}</p><p>{tx.explanation}</p><button className={styles.button} onClick={()=>{mark([eventId(tx)]);setOpen(false);onOpen(tx);}}>{vi?'Xem chi tiết':'View details'}</button></article>)}{error&&<p role="alert">{vi?'Không lưu được trạng thái đã đọc.':'Unable to save read status.'}</p>}</div></section></>}</>;
}
