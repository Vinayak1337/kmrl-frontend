'use client';
import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Person } from '@/types/docsetu';
import { listPeople, createPerson } from '@/services/people';
import { VALID_TEAMS } from '@/adapters/documentAdapter';
import { Modal } from '@/components/workspace/Modal';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

export default function PeoplePage() {
  const [people,setPeople] = useState<Person[]>([]);
  const [loading,setLoading] = useState(true);
  const [query,setQuery] = useState('');
  const [open,setOpen] = useState(false);
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [team,setTeam] = useState('Legal');
  const [role,setRole] = useState<'ADMIN'|'MANAGER'|'MEMBER'>('MANAGER');
  const [submitting,setSubmitting] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const load = async () => { setLoading(true); try { setPeople(await listPeople()); } catch { setError('Could not load the directory. Refresh to try again.'); } finally { setLoading(false); } };
  useEffect(()=>{ void load(); },[]);
  const create = async(event:React.FormEvent) => { event.preventDefault(); setError(''); setSubmitting(true); try { await createPerson({name:name.trim(),email:email.trim(),password:password || undefined,team,role}); setOpen(false); setNotice(`${name.trim()} was added to the workspace.`); setName('');setEmail('');setPassword(''); await load(); } catch(error) { setError(error instanceof Error?error.message:'Could not add this person. Try again.'); } finally { setSubmitting(false); } };
  const filtered = people.filter(p=>[p.name,p.email,p.team].some(v=>v.toLowerCase().includes(query.toLowerCase())));
  return <div className="desk-page"><header className="page-heading"><div><p className="eyebrow">The organization</p><h1>People</h1><p>Find the people and teams who work with your documents.</p></div><button className="button button-primary" onClick={()=>{setError('');setOpen(true);}}><Plus size={16}/>Add team member</button></header><div className="directory-toolbar"><label className="collection-search"><Search size={17}/><span className="sr-only">Search people</span><input name="people-search" autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email, or team…"/></label><span className="muted" role="status">{loading?'Loading…':`${filtered.length} people`}</span></div>{notice&&<p className="notice" role="status">{notice}</p>}{error&&!open&&<p className="notice error" role="alert">{error}</p>}{loading?<div className="skeleton-list" role="status" aria-label="Loading people"><div/><div/><div/></div>:!filtered.length?<DocSetuEmptyState title="No matching people" description="Try another name, email address, or team."/>:<div className="people-directory"><div className="directory-labels"><span>Person</span><span>Team</span><span>Role & access</span></div>{filtered.map(person=><article key={person.id} className="person-record"><div className="person-identity"><span className="person-initial" aria-hidden="true">{person.name.charAt(0)}</span><div><h2>{person.name}</h2><p>{person.email}</p>{person.id.startsWith('usr-')&&<small>Sample person</small>}</div></div><div><span className="mobile-field-label">Team</span><p>{person.team}</p></div><div><span className="role-name">{person.role==='ADMIN'?'Administrator':person.role==='MANAGER'?'Manager':'Member'}</span><p className="access-description">{person.accessSummary}</p></div></article>)}</div>}
    <Modal open={open} onClose={()=>setOpen(false)} title="Add team member" description="Create an account for someone in your organization." busy={submitting}><form className="form-stack" onSubmit={create}>{error&&<p className="notice error" role="alert">{error}</p>}<label>Name<input name="name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required/></label><label>Work email<input name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Temporary password<input name="new-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)}/><span className="field-help">Leave blank to use the workspace’s default temporary password.</span></label><div className="form-columns"><label>Team<select value={team} onChange={e=>setTeam(e.target.value)}>{VALID_TEAMS.map(t=><option key={t}>{t}</option>)}</select></label><label>Role<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="MANAGER">Manager</option><option value="ADMIN">Administrator</option></select></label></div><div className="modal-actions"><button className="button" type="button" onClick={()=>setOpen(false)} disabled={submitting}>Cancel</button><button className="button button-primary" type="submit" disabled={submitting}>{submitting?'Adding person…':'Add team member'}</button></div></form></Modal>
  </div>;
}
