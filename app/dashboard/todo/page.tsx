import { getAllData } from "@/lib/sheets";
import TasksClient from "./TasksClient";
export default async function TodoPage(){ const {tasks,projects,timeline,team}=await getAllData(); return <TasksClient tasks={tasks} projects={projects} timeline={timeline} team={team}/>; }
