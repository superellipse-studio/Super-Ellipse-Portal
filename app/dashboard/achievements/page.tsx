import { getAllData } from "@/lib/sheets";
import AchievementCircle from "../AchievementCircle";
import { cardClass, cardLabel } from "../cardStyles";

const SLOTS = [1, 2, 3, 4, 5];

export default async function AchievementsPage() {
  const { projects, achievements, team } = await getAllData();
  const teamNames = team.map((m) => m.name);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Achievements</h1>
      <p className="text-gray-500 mb-8">
        Up to 5 per project — mark whoever stood out at each phase.
      </p>

      {projects.length === 0 ? (
        <p className="text-gray-600">No projects yet.</p>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const bySlot: Record<number, string> = {};
            achievements
              .filter((a) => a.project_id === p.id)
              .forEach((a) => (bySlot[a.slot] = a.member));

            return (
              <div key={p.id} className={cardClass}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className={cardLabel}>{p.client}</p>
                    <h3 className="text-xl font-bold mt-0.5">{p.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {SLOTS.map((slot) => (
                      <AchievementCircle
                        key={slot}
                        projectId={p.id}
                        slot={slot}
                        member={bySlot[slot] || ""}
                        teamNames={teamNames}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
