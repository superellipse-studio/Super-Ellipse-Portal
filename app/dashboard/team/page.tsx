import { getAllData } from "@/lib/sheets";
import { cardClass, cardLabel } from "../cardStyles";

export default async function TeamPage() {
  const { team, tasks, projects } = await getAllData();
  const projectNames: Record<string, string> = {};
  projects.forEach((p) => (projectNames[p.id] = p.name));

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Team</h1>

      {team.length === 0 ? (
        <p className="text-gray-600">
          No team members yet. Add rows to the Team tab in your Google Sheet.
        </p>
      ) : (
        <div className="space-y-12">
          {team.map((member) => {
            const memberTasks = tasks.filter(
              (t) => t.assignee.toLowerCase() === member.name.toLowerCase()
            );
            const active = memberTasks.filter((t) => t.status !== "done");
            const completed = memberTasks.filter((t) => t.status === "done");

            return (
              <section key={member.id}>
                <h2 className="text-2xl font-bold">{member.name}</h2>
                <p className="label mb-4">{member.role}</p>

                {active.length > 0 && (
                  <div className={`${cardClass} mb-4 space-y-3`}>
                    {active.map((t) => (
                      <div key={t.id} className="flex items-center justify-between">
                        <div>
                          <p className={cardLabel}>Active</p>
                          <p className="text-xl font-bold">{t.title}</p>
                        </div>
                        <span className="rounded-full border border-black/20 px-3 py-1 text-xs text-black/60">
                          {projectNames[t.project_id] || t.project_id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="label mb-2">COMPLETED — {completed.length}</p>
                <div className="divide-y divide-line border-t border-line">
                  {completed.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2">
                      <span className="line-through text-gray-500">{t.title}</span>
                      <span className="label">{projectNames[t.project_id] || t.project_id}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
