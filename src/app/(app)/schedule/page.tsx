"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE, formatDate } from "@/lib/format";

export default function SchedulePage() {
  const { currentUser, jobs, customers, users } = useApp();
  const isOwner = currentUser.role === "owner";
  const scoped = isOwner ? jobs : jobs.filter((j) => j.assignedEmployeeIds.includes(currentUser.id));

  const grouped = new Map<string, typeof scoped>();
  for (const job of [...scoped].sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1))) {
    const list = grouped.get(job.scheduledDate) ?? [];
    list.push(job);
    grouped.set(job.scheduledDate, list);
  }

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  return (
    <div>
      <PageHeader
        title="Schedule"
        description={isOwner ? "Upcoming jobs across the whole crew." : "Your upcoming jobs."}
      />

      {grouped.size === 0 && <EmptyState text="Nothing on the schedule." />}

      <div className="space-y-6">
        {[...grouped.entries()].map(([date, dayJobs]) => (
          <div key={date}>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">{formatDate(date)}</h2>
            <Card>
              <ul className="divide-y divide-slate-100">
                {dayJobs.map((job) => {
                  const crew = users.filter((u) => job.assignedEmployeeIds.includes(u.id));
                  return (
                    <li key={job.id}>
                      <Link href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{job.title}</p>
                          <p className="truncate text-xs text-slate-500">{customerName(job.customerId)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="hidden -space-x-2 sm:flex">
                            {crew.map((u) => (
                              <Avatar key={u.id} name={u.name} color={u.color} size={26} />
                            ))}
                          </div>
                          <Badge className={JOB_STATUS_STYLE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
