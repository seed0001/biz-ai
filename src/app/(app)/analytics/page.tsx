"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/lib/store";
import { Badge, Card, EmptyState, OwnerOnlyNotice, PageHeader, StatCard } from "@/components/ui";
import {
  dateRange,
  employeeSummary,
  hoursByDay,
  latestDataDate,
  taskDurationTrends,
  tasksCompletedByDay,
  type TaskTrend,
} from "@/lib/analytics";
import { formatDate, formatDuration } from "@/lib/format";

const RANGE_OPTIONS = [7, 14, 21, 28] as const;

const TREND_LABEL: Record<TaskTrend, string> = {
  improving: "Improving",
  steady: "Steady",
  slower: "Slower",
  new: "New",
};

const TREND_STYLE: Record<TaskTrend, string> = {
  improving: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  steady: "bg-slate-100 text-slate-600 ring-slate-600/20",
  slower: "bg-rose-50 text-rose-700 ring-rose-600/20",
  new: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export default function AnalyticsPage() {
  const { currentUser, users, jobs, timeEntries, jobTasks } = useApp();
  const [rangeDays, setRangeDays] = useState<number>(21);

  const employees = users.filter((u) => u.role === "employee");
  const asOf = useMemo(() => latestDataDate(timeEntries, jobTasks), [timeEntries, jobTasks]);
  const days = useMemo(() => dateRange(asOf, rangeDays), [asOf, rangeDays]);

  const hoursData = useMemo(() => hoursByDay(timeEntries, employees, days), [timeEntries, employees, days]);
  const taskCountData = useMemo(() => tasksCompletedByDay(jobTasks, days), [jobTasks, days]);
  const summary = useMemo(
    () => employeeSummary(timeEntries, jobTasks, employees, days),
    [timeEntries, jobTasks, employees, days]
  );

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, { title: j.title }])), [jobs]);
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, { name: u.name }])), [users]);
  const trends = useMemo(
    () => taskDurationTrends(timeEntries, jobTasks, jobsById, usersById),
    [timeEntries, jobTasks, jobsById, usersById]
  );

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const totalHours = hoursData.reduce((sum, d) => sum + d.total, 0);
  const totalTasks = taskCountData.reduce((sum, d) => sum + d.count, 0);
  const activeEmployees = summary.filter((e) => e.totalHours > 0).length;

  // Recharts needs one flat row per x-value with a key per series.
  const hoursChartData = hoursData.map((d) => ({
    date: d.date,
    label: formatDate(d.date).replace(/, \d{4}$/, ""),
    ...d.byEmployee,
  }));
  const taskChartData = taskCountData.map((d) => ({
    date: d.date,
    label: formatDate(d.date).replace(/, \d{4}$/, ""),
    count: d.count,
  }));

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={`Hours, task completions, and pace trends — as of ${formatDate(asOf)}.`}
        action={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {RANGE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setRangeDays(n)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  rangeDays === n ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Hours logged" value={totalHours.toFixed(1)} hint={`last ${rangeDays} days`} />
        <StatCard label="Tasks completed" value={totalTasks} hint={`last ${rangeDays} days`} />
        <StatCard label="Avg hours / day" value={(totalHours / rangeDays).toFixed(1)} />
        <StatCard label="Active employees" value={activeEmployees} hint={`of ${employees.length}`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Hours logged per day</h2>
          <p className="mb-3 text-xs text-slate-500">Stacked by employee.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursChartData} barCategoryGap={4}>
                <CartesianGrid vertical={false} stroke="#e1e0d9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "#f9f9f7" }}
                  formatter={(value, name) => [`${value}h`, employeeLabel(employees, String(name))]}
                />
                <Legend
                  formatter={(name) => employeeLabel(employees, String(name))}
                  wrapperStyle={{ fontSize: 12 }}
                />
                {employees.map((emp) => (
                  <Bar key={emp.id} dataKey={emp.id} stackId="hours" fill={emp.color} radius={[2, 2, 0, 0]} maxBarSize={22} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Tasks completed per day</h2>
          <p className="mb-3 text-xs text-slate-500">Company-wide.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} barCategoryGap={4}>
                <CartesianGrid vertical={false} stroke="#e1e0d9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f9f9f7" }} formatter={(value) => [value, "Tasks completed"]} />
                <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Employee summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Hours</th>
                <th className="px-4 py-2 font-medium">Tasks completed</th>
                <th className="px-4 py-2 font-medium">Avg task time</th>
                <th className="px-4 py-2 font-medium">Days worked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.map((row) => (
                <tr key={row.employeeId}>
                  <td className="flex items-center gap-2 px-4 py-2.5 font-medium text-slate-900">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{row.totalHours}h</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.tasksCompleted}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.avgTaskMinutes ? `${row.avgTaskMinutes}m` : "-"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.daysWorked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Task pace trends</h2>
          <p className="mt-1 text-xs text-slate-500">
            Every completed step, grouped by name across every job it&apos;s appeared on — is it getting faster?
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Occurrences</th>
                <th className="px-4 py-2 font-medium">Avg time</th>
                <th className="px-4 py-2 font-medium">Trend</th>
                <th className="px-4 py-2 font-medium">Last completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trends.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6">
                    <EmptyState text="No completed tasks yet." />
                  </td>
                </tr>
              )}
              {trends.map((row) => {
                const last = row.occurrences[row.occurrences.length - 1];
                return (
                  <tr key={row.title}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.title}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkline values={row.occurrences.map((o) => o.minutes)} />
                        <span className="text-slate-500">{row.occurrences.length}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{formatDuration(row.avgMinutes * 60000)}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={TREND_STYLE[row.trend]}>{TREND_LABEL[row.trend]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDate(last.date)} &middot; {last.employeeName} &middot; {last.jobTitle}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function employeeLabel(employees: { id: string; name: string }[], key: string): string {
  return employees.find((e) => e.id === key)?.name ?? key;
}

// A minimal inline sparkline — single hue, 2px line, no axes. Supplements the
// exact occurrence count next to it rather than standing alone.
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const w = 64;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 2 - ((v - min) / span) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
