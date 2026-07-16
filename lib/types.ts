export interface Project {
  id: string;
  client: string;
  name: string;
  category: "ongoing" | "prospective" | "completed" | "on_hold" | string;
  currency: string;
  total_fee: number;
  paid: number;
  current_phase: string;
  drive_link: string;
  subtitle: string;
  type: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  assignee: string;
  due_date: string;
  status: "open" | "in_progress" | "done" | string;
  scope: "this_week" | "next_week" | "unscheduled" | string;
}

export interface Invoice {
  id: string;
  project_id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  status: "pending" | "paid" | string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface TimelineItem {
  id: string;
  project_id: string;
  label: string;
  start_date: string;
  end_date: string;
}

export interface Achievement {
  id: string;
  project_id: string;
  slot: number;
  member: string;
}

export interface PortalData {
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  team: TeamMember[];
  timeline: TimelineItem[];
  achievements: Achievement[];
}
