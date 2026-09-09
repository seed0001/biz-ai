"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { Badge, Card, PageHeader, StatCard, EmptyState, Avatar, Button } from "@/components/ui";
import {
  JOB_STATUS_LABEL,
  JOB_STATUS_STYLE,
  CALL_OUTCOME_LABEL,
  CALL_OUTCOME_STYLE,
  calculateQuoteTotals,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/format";
import { PhoneCall, Clock } from "lucide-react";

export default function DashboardPage() {
  const { currentUser } = useApp();
  return currentUser.role === "owner" ? <OwnerDashboard /> : <EmployeeDashboard />;
}

function OwnerDashboard() {
  const { currentUser, jobs, quotes, customers, callLogs, timeEntries, users, settings } = useApp();

  const activeJobs = jobs.filter((j) => j.status === "scheduled" || j.status === "in_progress");
  const openQuoteValue = quotes
    .filter((q) => q.status === "sent")
    .reduce((sum, q) => sum + calculateQuoteTotals(q, settings).total, 0);
  const clockedIn = timeEntries.filter((t) => t.clockOut === null);
  const callsToday = callLogs.filter((c) => c.startedAt.startsWith("2026-09-08"));
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unassigned";

  return (
    <div>
      <PageHeader title={`Good morning, ${currentUser.name.split(" ")[0]}`} description="Here's what's happening across the company today." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active jobs" value={activeJobs.length} hint="scheduled or in progress" />
        <StatCard label="Open quotes" value={formatCurrency(openQuoteValue)} hint="sent, awaiting response" />
        <StatCard label="Clocked in now" value={clockedIn.length} hint="employees on the clock" />
        <StatCard label="AI conversations today" value={callsToday.length} hint="calls & texts handled" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Today &amp; upcoming jobs</h2>
            <Link href="/jobs" className="text-xs font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {activeJobs.length === 0 && (
              <li className="p-4">
                <EmptyState text="No active jobs right now." />
              </li>
            )}
            {activeJobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{job.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {customerName(job.customerId)} &middot; {formatDate(job.scheduledDate)}
                    </p>
                  </div>
                  <Badge className={JOB_STATUS_STYLE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">On the clock</h2>
            <Link href="/time" className="text-xs font-medium text-blue-600 hover:underline">
              Timesheets
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {clockedIn.length === 0 && (
              <li className="p-4">
                <EmptyState text="No one is clocked in." />
              </li>
            )}
            {clockedIn.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <Clock size={16} className="text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{userName(t.employeeId)}</p>
                  <p className="truncate text-xs text-slate-500">since {formatTime(t.clockIn)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <PhoneCall size={16} className="text-blue-600" />
            Recent AI front-desk activity
          </h2>
          <Link href="/ai-line" className="text-xs font-medium text-blue-600 hover:underline">
            View AI line
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {callLogs.slice(0, 4).map((call) => (
            <li key={call.id}>
              <Link href="/ai-line" className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{call.customerName}</p>
                  <p className="truncate text-xs text-slate-500">{call.summary}</p>
                </div>
                <Badge className={CALL_OUTCOME_STYLE[call.outcome]}>{CALL_OUTCOME_LABEL[call.outcome]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EmployeeDashboard() {
  const { currentUser, jobs, customers, timeEntries, clockIn, clockOut } = useApp();

  const myJobs = jobs.filter((j) => j.assignedEmployeeIds.includes(currentUser.id));
  const activeMyJobs = myJobs.filter((j) => j.status === "scheduled" || j.status === "in_progress");
  const myOpenEntry = timeEntries.find((t) => t.employeeId === currentUser.id && t.clockOut === null);
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  const myWeekEntries = timeEntries.filter((t) => t.employeeId === currentUser.id);
  const totalMs = myWeekEntries.reduce((sum, t) => {
    const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
    return sum + (end - new Date(t.clockIn).getTime());
  }, 0);
  const totalHours = (totalMs / 3600000).toFixed(1);

  return (
    <div>
      <PageHeader title={`Hey, ${currentUser.name.split(" ")[0]}`} description="Here's your day." />

      <Card className="mb-6 p-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {myOpenEntry ? "Clocked in since" : "Not clocked in"}
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {myOpenEntry ? formatTime(myOpenEntry.clockIn) : "--:--"}
            </p>
          </div>
          {myOpenEntry ? (
            <Button variant="danger" onClick={() => clockOut(currentUser.id)}>
              <Clock size={16} /> Clock out
            </Button>
          ) : (
            <Button onClick={() => clockIn(currentUser.id, activeMyJobs[0]?.id ?? null)}>
              <Clock size={16} /> Clock in
            </Button>
          )}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <StatCard label="My jobs today" value={activeMyJobs.length} />
        <StatCard label="Hours logged (all time, demo)" value={`${totalHours}h`} />
      </div>

      <Card>
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">My jobs</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {myJobs.length === 0 && (
            <li className="p-4">
              <EmptyState text="No jobs assigned to you yet." />
            </li>
          )}
          {myJobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={customerName(job.customerId)} color="#64748b" size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{job.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {customerName(job.customerId)} &middot; {formatDate(job.scheduledDate)}
                    </p>
                  </div>
                </div>
                <Badge className={JOB_STATUS_STYLE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
