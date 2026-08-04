import { getAllData } from "./sheets";
import type { PortalData, Project, Task, TimelineItem } from "./types";

const BALI_TIME_ZONE = "Asia/Makassar";
const DAY_MS = 86400000;

type StageBrief = { projectId:string; project:string; label:string; startDate:string; endDate:string; status:string; tasks:{title:string;dueDate:string;assignee:string}[] };
type BriefData = { generatedDate:string; windowEndDate:string; stages:StageBrief[]; studioTasks:{title:string;dueDate:string;assignee:string}[]; overdue:{project:string;title:string;dueDate:string}[]; warnings:string[] };

function dateKeyInBali(date=new Date()){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:BALI_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${v.year}-${v.month}-${v.day}`;}
function parseDateKey(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const [y,m,d]=v.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));}
function addDays(v:string,n:number){const d=parseDateKey(v);if(!d)throw new Error('Invalid date');return new Date(d.getTime()+n*DAY_MS).toISOString().slice(0,10);}
function human(v:string){const d=parseDateKey(v);return d?new Intl.DateTimeFormat('en-US',{day:'numeric',month:'short',timeZone:'UTC'}).format(d):v;}
function name(projects:Map<string,Project>,id:string){return id==='studio'?'Studio':projects.get(id)?.name||id;}

function collect(data:PortalData,today=dateKeyInBali()):BriefData{
  const end=addDays(today,3); const projects=new Map(data.projects.map(p=>[p.id,p]));
  const relevant=data.timeline.filter(s=>parseDateKey(s.start_date)&&parseDateKey(s.end_date)&&s.start_date<=end&&s.end_date>=today).sort((a,b)=>a.start_date.localeCompare(b.start_date));
  const open=data.tasks.filter(t=>t.status!=='done');
  const stages=relevant.map((s:TimelineItem)=>({projectId:s.project_id,project:name(projects,s.project_id),label:s.label,startDate:s.start_date,endDate:s.end_date,status:s.status,tasks:open.filter(t=>t.timeline_id===s.id || (!t.timeline_id&&t.project_id===s.project_id&&t.due_date>=today&&t.due_date<=s.end_date)).map(t=>({title:t.title,dueDate:t.due_date,assignee:t.assignee||'Unassigned'}))}));
  const studioTasks=open.filter(t=>t.project_id==='studio'&&(!t.due_date||(t.due_date>=today&&t.due_date<=end))).map(t=>({title:t.title,dueDate:t.due_date,assignee:t.assignee||'Unassigned'}));
  const overdue=open.filter(t=>t.due_date&&t.due_date<today).map(t=>({project:name(projects,t.project_id),title:t.title,dueDate:t.due_date}));
  const warnings:string[]=[]; if(overdue.length)warnings.push(`${overdue.length} overdue task${overdue.length===1?'':'s'}`);
  return {generatedDate:today,windowEndDate:end,stages,studioTasks,overdue,warnings};
}

function deterministic(b:BriefData){const lines=[`SUPER ELLIPSE — ${human(b.generatedDate)} TO ${human(b.windowEndDate)}`,""];
  for(const s of b.stages){lines.push(s.project.toUpperCase(),`${s.label}: ${human(s.startDate)} → due ${human(s.endDate)}`);if(s.tasks.length){for(const t of s.tasks)lines.push(`• ${t.title}${t.dueDate?` — due ${human(t.dueDate)}`:''}`);}else lines.push('• No linked tasks');lines.push('');}
  if(b.studioTasks.length){lines.push('STUDIO');for(const t of b.studioTasks)lines.push(`• ${t.title}${t.dueDate?` — due ${human(t.dueDate)}`:''}`);lines.push('');}
  if(b.overdue.length){lines.push('ATTENTION');for(const t of b.overdue)lines.push(`• Overdue ${human(t.dueDate)} — ${t.project}: ${t.title}`);}
  if(!b.stages.length&&!b.studioTasks.length&&!b.overdue.length)lines.push('Nothing scheduled for the next three days.');return lines.join('\n').trim();}

async function claude(b:BriefData){const key=process.env.ANTHROPIC_API_KEY;if(!key)return null;const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-3-5-haiku-20241022',max_tokens:800,temperature:.1,system:'You are Jarvis, the concise operations assistant for Super Ellipse Studio. Produce a Telegram morning brief using only the supplied verified data. Group by project. For every project stage, always state the stage date range and explicitly write the due date. List linked tasks below it and include each task due date when present. Then list Studio tasks and overdue items. Do not invent anything. Plain text only, no tables, under 1800 characters.',messages:[{role:'user',content:JSON.stringify(b,null,2)}]})});if(!r.ok){console.error(await r.text());return null;}const j=await r.json();return j.content?.find((x:any)=>x.type==='text')?.text?.trim()||null;}

export async function createDailyBrief(){const b=collect(await getAllData());const hasItems=!!(b.stages.length||b.studioTasks.length||b.overdue.length);return {message:(await claude(b))||deterministic(b),hasItems};}
