"use client";
import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
  isValid,
} from "date-fns";
import type { Project, TimelineItem, Invoice, Task } from "@/lib/types";
import TaskStatusIcon from "../TaskStatusIcon";

function safeDate(s: string): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

export default function CalendarClient({
  timeline,
  invoices,
  projects,
  tasks,
}: {
  timeline: TimelineItem[];
  invoices: Invoice[];
  projects: Project[];
  tasks: Task[];
}) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const projectNames: Record<string, string> = {};
  projects.forEach((p) => (projectNames[p.id] = p.name));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const timelineWithDates = timeline
    .map((t) => ({ ...t, start: safeDate(t.start_date), end: safeDate(t.end_date) }))
    .filter((t) => t.start && t.end) as (TimelineItem & { start: Date; end: Date })[];

  const invoicesWithDates = invoices
    .map((i) => ({ ...i, due: safeDate(i.due_date) }))
    .filter((i) => i.due) as (Invoice & { due: Date })[];

  const tasksWithDates = tasks
    .map((t) => ({ ...t, due: safeDate(t.due_date) }))
    .filter((t) => t.due) as (Task & { due: Date })[];

  const selectedTimelines = selectedDay
    ? timelineWithDates.filter((t) => isWithinInterval(selectedDay, { start: t.start, end: t.end }))
    : [];
  const selectedInvoices = selectedDay
    ? invoicesWithDates.filter((i) => isSameDay(i.due, selectedDay))
    : [];
  const selectedTasks = selectedDay
    ? tasksWithDates.filter((t) => isSameDay(t.due, selectedDay))
    : [];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Calendar</h1>

      <div className="bg-sage text-black rounded-3xl p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-black/20 hover:border-black transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-xl font-bold min-w-[140px]">{format(viewDate, "MMMM yyyy")}</h2>
          <button
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-black/20 hover:border-black transition-colors"
            aria-label="Next month"
          >
            ›
          </button>
          {!isSameMonth(viewDate, new Date()) && (
            <button
              onClick={() => setViewDate(new Date())}
              className="rounded-full border border-black/20 px-3 py-1 text-xs hover:border-black transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-px bg-black/10 rounded-2xl overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-sage px-2 py-1 text-[10px] uppercase tracking-wide text-black/45">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = isSameMonth(day, viewDate);
            const today = isToday(day);
            const dayTimelines = timelineWithDates.filter((t) =>
              isWithinInterval(day, { start: t.start, end: t.end })
            );
            const dayInvoices = invoicesWithDates.filter((i) => isSameDay(i.due, day));
            const dayTasks = tasksWithDates.filter((t) => isSameDay(t.due, day));
            const hasContent = dayTimelines.length > 0 || dayInvoices.length > 0 || dayTasks.length > 0;
            return (
              <button
                key={day.toISOString()}
                onClick={() => hasContent && setSelectedDay(day)}
                className={`bg-sage min-h-[90px] p-1 text-left align-top relative ${
                  inMonth ? "" : "opacity-30"
                } ${today ? "ring-1 ring-inset ring-black/40" : ""} ${
                  hasContent ? "cursor-pointer hover:bg-black/5" : "cursor-default"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${today ? "text-black font-bold" : "text-black/70"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayTasks.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-black/50" title={`${dayTasks.length} task(s) due`} />
                    )}
                    {dayInvoices.length > 0 && <span className="text-[10px] font-bold">$</span>}
                  </div>
                </div>
                <div className="space-y-1 mt-1">
                  {dayTimelines.slice(0, 2).map((t) => (
                    <div key={t.id} title={t.label} className="bg-black/10 text-black text-[10px] px-1 py-0.5 rounded truncate">
                      {t.label}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      title={t.title}
                      className={`text-[10px] px-1 py-0.5 truncate border-l-2 ${
                        t.status === "done" ? "border-black/20 text-black/35 line-through" : "border-black/40 text-black/70"
                      }`}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm text-black/50">
          {projects
            .filter((p) => timeline.some((t) => t.project_id === p.id))
            .map((p) => (
              <span key={p.id}>■ {p.name}</span>
            ))}
          <span className="font-medium text-black">$ Invoice due</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-black/50 inline-block" /> Task due
          </span>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedDay(null)} />
          <div className="relative z-10 bg-sage text-black rounded-3xl w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 sticky top-0 bg-sage rounded-t-3xl">
              <div>
                <p className="text-base font-medium">{format(selectedDay, "d MMM yyyy")}</p>
                <p className="text-[10px] uppercase tracking-wide text-black/45">{format(selectedDay, "EEEE")}</p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-black/40 hover:text-black transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {selectedTasks.length > 0 && (
              <div className="border-b border-black/10">
                <p className="text-[10px] uppercase tracking-wide text-black/45 px-5 pt-3 pb-1">To-Do</p>
                {selectedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <TaskStatusIcon id={t.id} status={t.status} />
                    <span className={`flex-1 text-sm ${t.status === "done" ? "line-through text-black/40" : ""}`}>
                      {t.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-black/45">{t.assignee}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedInvoices.length > 0 && (
              <div className="px-5 py-3 border-b border-black/10 bg-warn/15">
                {selectedInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-black bg-black/10 px-1 rounded">$</span>
                    <p className="text-sm text-black">
                      {inv.label} — {projectNames[inv.project_id] || inv.project_id}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedTimelines.length > 0 && (
              <div className="divide-y divide-black/10">
                {selectedTimelines.map((t) => {
                  const isStart = isSameDay(t.start, selectedDay);
                  return (
                    <div key={t.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="w-2.5 h-2.5 mt-1 shrink-0 rounded-full bg-black/20" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{t.label}</p>
                        <p className="text-[10px] uppercase tracking-wide text-black/45 mt-0.5">
                          {projectNames[t.project_id] || t.project_id}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-black/45">
                          {format(t.start, "d MMM yyyy")} → {format(t.end, "d MMM yyyy")}
                          {isStart && <span className="text-black font-medium ml-1">· Starts today</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedTasks.length === 0 && selectedInvoices.length === 0 && selectedTimelines.length === 0 && (
              <div className="px-5 py-6">
                <p className="text-sm text-black/50">Nothing scheduled.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
