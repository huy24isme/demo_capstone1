"use client";
import { useState } from 'react';
import type { UserProfile, UserRole } from './types';
import { useLanguage } from './i18n/LanguageContext';
import styles from './SecurityDashboard.module.css';

export function MembersView({ users, currentUser, onSave }: { users: UserProfile[]; currentUser: UserProfile; onSave: (user: UserProfile) => boolean }) {
  const { language } = useLanguage(); const vi = language === 'vi';
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Operator'); const [message, setMessage] = useState('');
  const roles: UserRole[] = ['SME Admin', 'Operator', 'Investigator'];
  const labels = { 'SME Admin': vi ? 'Quản trị doanh nghiệp' : 'Enterprise administrator', Operator: vi ? 'Nhân viên vận hành' : 'Operator', Investigator: vi ? 'Điều tra viên' : 'Investigator' };
  if (currentUser.role !== 'SME Admin' || !currentUser.enterpriseId) return <p>{vi ? 'Chỉ quản trị doanh nghiệp được quản lý thành viên.' : 'Only enterprise administrators can manage members.'}</p>;
  const members = users.filter(u => u.enterpriseId === currentUser.enterpriseId);
  return <>
    <div className={styles.pageHeading}><div><h1>{vi ? 'Thành viên doanh nghiệp' : 'Enterprise members'}</h1><p>{vi ? 'Thêm người và phân quyền trong doanh nghiệp của bạn. Tài khoản demo được lưu trên trình duyệt; chưa gửi lời mời hoặc cấp quyền trên máy chủ.' : 'Manage members in your enterprise. Demo accounts are stored in this browser; no invitations or server access are issued.'}</p></div></div>
    <section className={styles.panel}><div className={styles.panelHeader}><h2>{vi ? 'Thêm thành viên demo' : 'Add demo member'}</h2></div>
      <form onSubmit={e => { e.preventDefault(); const cleanName=name.trim(), cleanEmail=email.trim().toLowerCase(); if (!cleanName || users.some(u=>u.email.toLowerCase()===cleanEmail) || members.some(u=>u.name.toLowerCase()===cleanName.toLowerCase())) { setMessage(vi ? 'Tên trong doanh nghiệp hoặc email đã được sử dụng. Vui lòng kiểm tra lại.' : 'Name or email is already used. Please check the details.'); return; } const ok=onSave({id:crypto.randomUUID(),enterpriseId:currentUser.enterpriseId,name:cleanName,email:cleanEmail,role,title:labels[role as keyof typeof labels],avatarLetter:cleanName.slice(0,1).toUpperCase(),avatarBg:'#2563eb',description:labels[role as keyof typeof labels]}); if(ok){setName('');setEmail('');setMessage(vi?'Đã thêm thành viên demo.':'Demo member added.');} }} className={styles.toolbarGroup}>
        <label>{vi?'Họ tên':'Name'}<input className={styles.control} required value={name} onChange={e=>setName(e.target.value)} /></label>
        <label>Email<input className={styles.control} type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>{vi?'Vai trò':'Role'}<select className={styles.control} value={role} onChange={e=>setRole(e.target.value as UserRole)}>{roles.map(r=><option key={r} value={r}>{labels[r as keyof typeof labels]}</option>)}</select></label>
        <button type="submit" className={styles.button}>{vi?'Thêm thành viên':'Add member'}</button>
      </form><p role="status">{message}</p>
    </section>
    <section className={styles.panel}><div className={styles.panelHeader}><h2>{vi?'Danh sách thành viên':'Members'} ({members.length})</h2></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{vi?'Họ tên':'Name'}</th><th>Email</th><th>{vi?'Vai trò':'Role'}</th></tr></thead><tbody>{members.map(user=><tr key={user.id}><td>{user.name}{user.id===currentUser.id ? (vi?' (Bạn)':' (You)'):''}</td><td>{user.email}</td><td><select className={styles.control} aria-label={(vi?'Vai trò của ':'Role for ')+user.name} disabled={user.id===currentUser.id} value={user.role} onChange={e=>{setMessage(onSave({...user,role:e.target.value as UserRole}) ? (vi?'Đã cập nhật vai trò.':'Role updated.') : (vi?'Chưa thể đổi vai trò. Hãy hoàn tất hoặc phân công lại hồ sơ đang xử lý.':'Complete or reassign active cases before changing this role.'));}}>{roles.map(r=><option key={r} value={r}>{labels[r as keyof typeof labels]}</option>)}</select></td></tr>)}</tbody></table></div><p className={styles.muted}>{vi?'Bạn không thể tự đổi vai trò của mình trên trang này.':'You cannot change your own role here.'}</p></section>
  </>;
}
