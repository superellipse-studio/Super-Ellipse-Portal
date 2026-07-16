import { getAllData } from "@/lib/sheets";
import type { Task } from "@/lib/types";
import TaskStatusIcon from "../TaskStatusIcon";
import Collapsible from "../Collapsible";
import { cardClass } from "../cardStyles";

function TaskRow({ t }: { t: Task }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <TaskStatusIcon id={t.id} status={t.status} />
      <span className={t.status === "done" ? "line-through text-black/40" : "font-bold"}>
        {t.title}
      </span>
      {t.status === "in_progress" && (
        <span className="rounded-full border border-warn text-warn px-2 py-0.5 text-[10px] uppercase tracking-wide">
          In Progress
        </span>
      )}
    </div>
  );
}

export default async function StudioPage() {
  const { tasks } = await getAllData();
  const studioTasks = tasks.filter((t) => t.project_id === "studio");
  const ongoing = studioTasks.filter((t) => t.status !== "done");
  const archived = studioTasks.filter((t) => t.status === "done");

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Studio</h1>
      <p className="text-gray-500 mb-6">Internal tasks outside of client projects — ops, growth, brand.</p>

      {studioTasks.length === 0 ? (
        <p className="text-gray-600">
          None yet. Try: <span className="text-gray-300">"add studio task: LLC company registration"</span>
        </p>
      ) : (
        <div className="space-y-6">
          <Collapsible title="Ongoing" count={ongoing.length} defaultOpen>
            {ongoing.length === 0 ? (
              <p className="text-gray-600 text-sm">Nothing pending.</p>
            ) : (
              <div className={cardClass}>
                <div className="divide-y divide-black/10">
                  {ongoing.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            )}
          </Collapsible>
          <Collapsible title="Archive" count={archived.length} defaultOpen={false}>
            {archived.length === 0 ? (
              <p className="text-gray-600 text-sm">Nothing archived yet.</p>
            ) : (
              <div className={cardClass}>
                <div className="divide-y divide-black/10">
                  {archived.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            )}
          </Collapsible>
        </div>
      )}
    </div>
  );
}
