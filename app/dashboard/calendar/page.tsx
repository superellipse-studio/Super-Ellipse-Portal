import { getAllData } from "@/lib/sheets";
import CalendarClient from "./CalendarClient";

export default async function CalendarPage() {
  const { timeline, invoices, projects, tasks } = await getAllData();
  return <CalendarClient timeline={timeline} invoices={invoices} projects={projects} tasks={tasks} />;
}
