"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { Avatar, Badge, Card, EmptyState, OwnerOnlyNotice } from "@/components/ui";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE, formatDate, formatDuration, formatTime } from "@/lib/format";
import { ArrowLeft, Mail, Phone } from "lucide-react";

export default function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser, users, jobs, timeEntries } = useApp();

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const member = users.find((u) => u.id === id);
  if (!member) return notFound();

  const myJobs = jobs.filter((j) => j.assignedEmployeeIds.includes(member.id));
  const myEntries = [...timeEntries]
    .filter((t) => t.employeeId === member.id)
    .sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1));

  return (
    <div>
      <Link href="/team" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to team
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={member.name} color={member.color} size={56} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{member.name}</h1>
          <p className="text-sm text-slate-500">{member.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Assigned jobs</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {myJobs.length === 0 && (
                <li className="p-4">
                  <EmptyState text="No jobs assigned." />
                </li>
              )}
              {myJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/jobs/${job.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">{job.title}</p>
                    <Badge className={JOB_STATUS_STYLE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent time entries</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {myEntries.length === 0 && (
                <li className="p-4">
                  <EmptyState text="No time entries yet." />
                </li>
              )}
              {myEntries.map((t) => {
                const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
                const dur = end - new Date(t.clockIn).getTime();
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <p className="text-sm text-slate-600">
                      {formatDate(t.date)} &middot; {formatTime(t.clockIn)} -{" "}
                      {t.clockOut ? formatTime(t.clockOut) : "in progress"}
                    </p>
                    <span className="text-sm font-medium text-slate-900">{formatDuration(dur)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Contact</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Phone size={15} /> {member.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} /> {member.email}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
