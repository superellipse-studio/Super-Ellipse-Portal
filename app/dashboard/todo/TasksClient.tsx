"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Task, TeamMember, TimelineItem } from "@/lib/types";
import TaskStatusIcon from "../TaskStatusIcon";
import { cardClass, cardLabel } from "../cardStyles";

type Filter = "all" | "projects" | "studio";

function TaskRow({ task }: { task: Task }) {
  return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-3">
    <div className="flex items-center gap-3 min-w-0"><TaskStatusIcon id={task.id} status={task.status}/><span className={task.status === "done" ? "line-through text-black/40" : ""}>{task.title}</span></div>
    <div className="flex gap-3 pl-7 sm:pl-0 text-sm text-black/45">{task.due_date && <span>Due {task.due_date}</span>}<span className={cardLabel}>{task.assignee}</span></div>
  </div>;
}

export default function TasksClient({ tasks, projects, timeline, team }: { tasks: Task[]; projects: Project[]; timeline: TimelineItem[]; team: TeamMember[] }) {
  const router = useRouter();
  const [filter,setFilter]=useState<Filter>("all"); const [show,setShow]=useState(false); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const [form,setForm]=useState({title:"",project_id:"",timeline_id:"",due_date:"",assignee:"You"});
  const ongoing=projects.filter(p=>p.category==="ongoing");
  const stages=timeline.filter(t=>t.project_id===form.project_id).sort((a,b)=>a.sort_order-b.sort_order);
  const visible=tasks.filter(t=>filter==="all" || (filter==="studio" ? t.project_id==="studio" : t.project_id!=="studio"));
  const grouped=useMemo(()=>{ const map:Record<string,Task[]>={}; visible.forEach(t=>(map[t.project_id] ||= []).push(t)); return map;},[visible]);
  const names=Object.fromEntries(projects.map(p=>[p.id,p.name])); const stageNames=Object.fromEntries(timeline.map(t=>[t.id,t.label]));
  async function submit(e:React.FormEvent){e.preventDefault();setSaving(true);setError(""); const r=await fetch('/api/tasks/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,scope:'this_week'})}); const j=await r.json(); setSaving(false); if(!r.ok){setError(j.error||'Could not create task');return;} setShow(false);setForm({title:"",project_id:"",timeline_id:"",due_date:"",assignee:"You"});router.refresh();}
  return <>
    <div className="flex items-center justify-between gap-4 mb-8"><h1 className="text-4xl font-bold">Tasks</h1><button onClick={()=>setShow(true)} className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white hover:text-black">+ New Task</button></div>
    <div className="flex gap-2 mb-8">{([['all','All'],['projects','Projects'],['studio','Studio']] as const).map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`rounded-full px-4 py-2 text-sm border ${filter===v?'bg-white text-black border-white':'border-white/20 text-gray-400'}`}>{l}</button>)}</div>
    <div className="space-y-4">{Object.entries(grouped).map(([pid,list])=><div className={cardClass} key={pid}><h2 className="font-bold text-lg mb-1">{pid==='studio'?'Studio':names[pid]||pid}</h2><div className="divide-y divide-black/10">{list.sort((a,b)=>(a.status==='done'?1:0)-(b.status==='done'?1:0)).map(t=><div key={t.id}>{t.timeline_id && <div className="label text-black/40 pt-3 pl-7">{stageNames[t.timeline_id]||'Project stage'}</div>}<TaskRow task={t}/></div>)}</div></div>)}</div>
    {visible.length===0&&<p className="text-gray-600">No tasks in this section.</p>}
    {show&&<div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-card text-black p-6 space-y-5"><div className="flex justify-between"><h2 className="text-2xl font-bold">New Task</h2><button type="button" onClick={()=>setShow(false)}>✕</button></div>
      <label className="block"><span className="label text-black/50">Description</span><textarea required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-2 w-full rounded-xl border border-black/20 bg-transparent p-3" rows={3}/></label>
      <label className="block"><span className="label text-black/50">Project</span><select required value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value,timeline_id:""})} className="mt-2 w-full rounded-xl border border-black/20 bg-transparent p-3"><option value="">Choose project</option>{ongoing.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="studio">Studio / Internal</option></select></label>
      {form.project_id&&form.project_id!=="studio"&&<label className="block"><span className="label text-black/50">Project Stage</span><select value={form.timeline_id} onChange={e=>{const selected=stages.find(s=>s.id===e.target.value);setForm({...form,timeline_id:e.target.value,due_date:selected?.end_date||form.due_date})}} className="mt-2 w-full rounded-xl border border-black/20 bg-transparent p-3"><option value="">No stage</option>{stages.map(s=><option key={s.id} value={s.id}>{s.label} ({s.start_date} → {s.end_date})</option>)}</select></label>}
      <div className="grid sm:grid-cols-2 gap-4"><label><span className="label text-black/50">Due Date</span><input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="mt-2 w-full rounded-xl border border-black/20 bg-transparent p-3"/></label><label><span className="label text-black/50">Assignee</span><select value={form.assignee} onChange={e=>setForm({...form,assignee:e.target.value})} className="mt-2 w-full rounded-xl border border-black/20 bg-transparent p-3"><option>You</option>{team.map(m=><option key={m.id}>{m.name}</option>)}</select></label></div>
      {error&&<p className="text-red-700 text-sm">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2">Cancel</button><button disabled={saving} className="rounded-full bg-black text-white px-5 py-2">{saving?'Creating…':'Create Task'}</button></div>
    </form></div>}
  </>;
}
