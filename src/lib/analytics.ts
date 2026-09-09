import type { JobTask, TimeEntry, User } from "./types";

function entryMinutes(entry: TimeEntry): number {
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
  return Math.max(0, (end - new Date(entry.clockIn).getTime()) / 60000);
}

function isoDaysAgo(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// The demo data has a fixed "as of" date baked in (see mock-data.ts), while
// the real clock keeps moving — so range filters anchor to the latest date
// actually present in the data rather than Date.now().
export function latestDataDate(timeEntries: TimeEntry[], jobTasks: JobTask[]): string {
  const dates = [
    ...timeEntries.map((t) => t.date),
    ...jobTasks.filter((t) => t.completedAt).map((t) => t.completedAt as string),
  ];
  return dates.length ? dates.reduce((max, d) => (d > max ? d : max)) : new Date().toISOString().slice(0, 10);
}

// Every date in [asOf - (days-1), asOf], oldest first.
export function dateRange(asOf: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => isoDaysAgo(asOf, days - 1 - i));
}

export interface DayHours {
  date: string;
  total: number;
  byEmployee: Record<string, number>;
}

// Hours logged per day, broken out per employee (minutes -> hours, one decimal).
export function hoursByDay(timeEntries: TimeEntry[], employees: User[], days: string[]): DayHours[] {
  const dateSet = new Set(days);
  return days.map((date) => {
    const byEmployee: Record<string, number> = {};
    for (const emp of employees) byEmployee[emp.id] = 0;
    let total = 0;
    for (const entry of timeEntries) {
      if (entry.date !== date || !dateSet.has(entry.date)) continue;
      const hours = entryMinutes(entry) / 60;
      byEmployee[entry.employeeId] = (byEmployee[entry.employeeId] ?? 0) + hours;
      total += hours;
    }
    for (const id of Object.keys(byEmployee)) byEmployee[id] = Math.round(byEmployee[id] * 10) / 10;
    return { date, total: Math.round(total * 10) / 10, byEmployee };
  });
}

export interface DayTaskCount {
  date: string;
  count: number;
}

export function tasksCompletedByDay(jobTasks: JobTask[], days: string[]): DayTaskCount[] {
  const dateSet = new Set(days);
  const counts = new Map<string, number>();
  for (const task of jobTasks) {
    if (task.status !== "completed" || !task.completedAt || !dateSet.has(task.completedAt)) continue;
    counts.set(task.completedAt, (counts.get(task.completedAt) ?? 0) + 1);
  }
  return days.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export interface EmployeeSummaryRow {
  employeeId: string;
  name: string;
  color: string;
  totalHours: number;
  tasksCompleted: number;
  avgTaskMinutes: number;
  daysWorked: number;
}

export function employeeSummary(
  timeEntries: TimeEntry[],
  jobTasks: JobTask[],
  employees: User[],
  days: string[]
): EmployeeSummaryRow[] {
  const dateSet = new Set(days);
  return employees.map((emp) => {
    const entries = timeEntries.filter((t) => t.employeeId === emp.id && dateSet.has(t.date));
    const totalMinutes = entries.reduce((sum, t) => sum + entryMinutes(t), 0);
    const completed = jobTasks.filter(
      (t) => t.assignedEmployeeId === emp.id && t.status === "completed" && t.completedAt && dateSet.has(t.completedAt)
    );
    const taskMinutes = completed.map((task) => {
      const taskEntries = timeEntries.filter((t) => t.taskId === task.id);
      return taskEntries.reduce((sum, t) => sum + entryMinutes(t), 0);
    });
    const avgTaskMinutes = taskMinutes.length
      ? Math.round(taskMinutes.reduce((a, b) => a + b, 0) / taskMinutes.length)
      : 0;
    return {
      employeeId: emp.id,
      name: emp.name,
      color: emp.color,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      tasksCompleted: completed.length,
      avgTaskMinutes,
      daysWorked: new Set(entries.map((t) => t.date)).size,
    };
  });
}

export type TaskTrend = "improving" | "steady" | "slower" | "new";

export interface TaskTrendOccurrence {
  date: string;
  minutes: number;
  jobTitle: string;
  employeeName: string;
}

export interface TaskTrendRow {
  title: string;
  occurrences: TaskTrendOccurrence[];
  avgMinutes: number;
  trend: TaskTrend;
}

// Groups every completed task by its title (title is the stable identity a
// step template produces, e.g. "Paint - coat 1", regardless of which job it
// came from) so the same step can be compared across jobs over time.
export function taskDurationTrends(
  timeEntries: TimeEntry[],
  jobTasks: JobTask[],
  jobsById: Map<string, { title: string }>,
  usersById: Map<string, { name: string }>
): TaskTrendRow[] {
  const groups = new Map<string, TaskTrendOccurrence[]>();

  for (const task of jobTasks) {
    if (task.status !== "completed" || !task.completedAt) continue;
    const minutes = timeEntries.filter((t) => t.taskId === task.id).reduce((sum, t) => sum + entryMinutes(t), 0);
    if (minutes <= 0) continue;
    const occurrence: TaskTrendOccurrence = {
      date: task.completedAt,
      minutes: Math.round(minutes),
      jobTitle: jobsById.get(task.jobId)?.title ?? "Unknown job",
      employeeName: (task.assignedEmployeeId && usersById.get(task.assignedEmployeeId)?.name) || "Unassigned",
    };
    const list = groups.get(task.title) ?? [];
    list.push(occurrence);
    groups.set(task.title, list);
  }

  const rows: TaskTrendRow[] = [];
  for (const [title, occurrences] of groups) {
    occurrences.sort((a, b) => (a.date < b.date ? -1 : 1));
    const avgMinutes = Math.round(occurrences.reduce((sum, o) => sum + o.minutes, 0) / occurrences.length);
    let trend: TaskTrend = "new";
    if (occurrences.length >= 2) {
      const first = occurrences[0].minutes;
      const last = occurrences[occurrences.length - 1].minutes;
      if (last <= first * 0.9) trend = "improving";
      else if (last >= first * 1.1) trend = "slower";
      else trend = "steady";
    }
    rows.push({ title, occurrences, avgMinutes, trend });
  }

  return rows.sort((a, b) => b.occurrences.length - a.occurrences.length || a.title.localeCompare(b.title));
}
