"use client";

import { useApp } from "@/lib/store";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { Clock } from "lucide-react";

export default function TimePage() {
  const { currentUser } = useApp();
  return currentUser.role === "owner" ? <OwnerTimesheets /> : <MyTime />;
}

function MyTime() {
  const { currentUser, jobs, timeEntries, clockIn, clockOut } = useApp();
  const mine = [...timeEntries]
    .filter((t) => t.employeeId === currentUser.id)
    .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1));
  const open = mine.find((t) => t.clockOut === null);
  const jobTitle = (id: string | null) => (id ? jobs.find((j) => j.id === id)?.title ?? "Unassigned" : "Unassigned");

  return (
    <div>
      <PageHeader title="Time" description="Clock in and out and review your hours." />

      <Card className="mb-6 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-500">{open ? "Clocked in since" : "Not clocked in"}</p>
            <p className="text-2xl font-semibold text-slate-900">{open ? formatTime(open.clockIn) : "--:--"}</p>
            {open && <p className="text-xs text-slate-500">on {jobTitle(open.jobId)}</p>}
          </div>
          {open ? (
            <Button variant="danger" onClick={() => clockOut(currentUser.id)}>
              <Clock size={16} /> Clock out
            </Button>
          ) : (
            <Button onClick={() => clockIn(currentUser.id, null)}>
              <Clock size={16} /> Clock in
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">My time entries</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {mine.length === 0 && (
            <li className="p-4">
              <EmptyState text="No time entries yet." />
            </li>
          )}
          {mine.map((t) => {
            const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
            const dur = end - new Date(t.clockIn).getTime();
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{jobTitle(t.jobId)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(t.date)} &middot; {formatTime(t.clockIn)} -{" "}
                    {t.clockOut ? formatTime(t.clockOut) : "in progress"}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-700">{formatDuration(dur)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function OwnerTimesheets() {
  const { users, jobs, timeEntries } = useApp();
  const employees = users.filter((u) => u.role === "employee");
  const jobTitle = (id: string | null) => (id ? jobs.find((j) => j.id === id)?.title ?? "Unassigned" : "Unassigned");

  return (
    <div>
      <PageHeader title="Team time" description="Who's clocked in and recent timesheets." />

      <Card className="mb-6">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Team status</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {employees.map((u) => {
            const open = timeEntries.find((t) => t.employeeId === u.id && t.clockOut === null);
            return (
              <li key={u.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} color={u.color} size={32} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.title}</p>
                  </div>
                </div>
                {open ? (
                  <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                    Clocked in since {formatTime(open.clockIn)}
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-600/20">Off the clock</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">All time entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">In</th>
                <th className="px-4 py-2 font-medium">Out</th>
                <th className="px-4 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...timeEntries]
                .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1))
                .map((t) => {
                  const emp = users.find((u) => u.id === t.employeeId);
                  const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
                  const dur = end - new Date(t.clockIn).getTime();
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">{emp?.name ?? "Unknown"}</td>
                      <td className="px-4 py-2 text-slate-600">{jobTitle(t.jobId)}</td>
                      <td className="px-4 py-2 text-slate-600">{formatDate(t.date)}</td>
                      <td className="px-4 py-2 text-slate-600">{formatTime(t.clockIn)}</td>
                      <td className="px-4 py-2 text-slate-600">{t.clockOut ? formatTime(t.clockOut) : "-"}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{formatDuration(dur)}</td>
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
