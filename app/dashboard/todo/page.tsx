import { getAllData } from "@/lib/sheets";
import type { Task } from "@/lib/types";
import TaskStatusIcon from "../TaskStatusIcon";
import Collapsible from "../Collapsible";
import { cardClass, cardLabel } from "../cardStyles";

function TaskRow({ t }: { t: Task }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <TaskStatusIcon id={t.id} status={t.status} />
        <span className={`truncate ${t.status === "done" ? "line-through text-black/40" : ""}`}>
          {t.title}
        </span>
        {t.status === "in_progress" && (
          <span className="shrink-0 whitespace-nowrap rounded-full border border-warn text-warn px-2 py-0.5 text-[10px] uppercase tracking-wide">
            In Progress
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-black/40 text-sm pl-7 sm:pl-0 whitespace-nowrap">
        {t.due_date && <span>{t.due_date}</span>}
        <span className={cardLabel}>{t.assignee}</span>
      </div>
    </div>
  );
}

function ProjectTaskCards({ list, projectNames }: { list: Task[]; projectNames: Record<string, string> }) {
  const byProject: Record<string, Task[]> = {};
  list.forEach((t) => {
    const key = t.project_id;
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(t);
  });

  return (
    <div className="space-y-4">
      {Object.entries(byProject).map(([projectId, plist]) => (
        <div key={projectId} className={cardClass}>
          <h3 className="font-bold mb-1">
            {projectId === "studio" ? "Studio" : projectNames[projectId] || projectId}
          </h3>
          <div className="divide-y divide-black/10">
            {plist.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupSection({ title, tasks, projectNames }: { title: string; tasks: Task[]; projectNames: Record<string, string> }) {
  if (tasks.length === 0) return null;
  const ongoing = tasks.filter((t) => t.status !== "done");
  const archived = tasks.filter((t) => t.status === "done");

  return (
    <section className="mb-10">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="label">
          {archived.length} / {tasks.length} DONE
        </span>
      </div>
      <div className="space-y-6">
        <Collapsible title="Ongoing" count={ongoing.length} defaultOpen>
          {ongoing.length === 0 ? (
            <p className="text-gray-600 text-sm">Nothing pending.</p>
          ) : (
            <ProjectTaskCards list={ongoing} projectNames={projectNames} />
          )}
        </Collapsible>
        <Collapsible title="Archive" count={archived.length} defaultOpen={false}>
          {archived.length === 0 ? (
            <p className="text-gray-600 text-sm">Nothing archived yet.</p>
          ) : (
            <ProjectTaskCards list={archived} projectNames={projectNames} />
          )}
        </Collapsible>
      </div>
    </section>
  );
}

export default async function TodoPage() {
  const { tasks, projects } = await getAllData();
  const projectNames: Record<string, string> = {};
  projects.forEach((p) => (projectNames[p.id] = p.name));

  const nonStudio = tasks.filter((t) => t.project_id !== "studio");
  const thisWeek = nonStudio.filter((t) => t.scope === "this_week");
  const nextWeek = nonStudio.filter((t) => t.scope === "next_week");
  const unscheduled = nonStudio.filter((t) => t.scope === "unscheduled");

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">To-Do</h1>
      <GroupSection title="This Week" tasks={thisWeek} projectNames={projectNames} />
      <GroupSection title="Next Week" tasks={nextWeek} projectNames={projectNames} />
      <GroupSection title="Unscheduled" tasks={unscheduled} projectNames={projectNames} />
      {thisWeek.length + nextWeek.length + unscheduled.length === 0 && (
        <p className="text-gray-600">No tasks yet. Try the command bar below to add one.</p>
      )}
    </div>
  );
}
