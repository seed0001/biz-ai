"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, inputClass } from "@/components/ui";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE, formatDate } from "@/lib/format";
import type { JobStatus } from "@/lib/types";
import { Plus } from "lucide-react";

const STATUS_FILTERS: (JobStatus | "all")[] = [
  "all",
  "quoted",
  "scheduled",
  "in_progress",
  "completed",
  "invoiced",
];

export default function JobsPage() {
  const { currentUser, jobs, customers, users, addJob } = useApp();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [showNewJob, setShowNewJob] = useState(false);

  const isOwner = currentUser.role === "owner";
  const scoped = isOwner ? jobs : jobs.filter((j) => j.assignedEmployeeIds.includes(currentUser.id));
  const visible = useMemo(
    () => scoped.filter((j) => statusFilter === "all" || j.status === statusFilter),
    [scoped, statusFilter]
  );

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";

  return (
    <div>
      <PageHeader
        title={isOwner ? "Jobs" : "My Jobs"}
        description={isOwner ? "Every job across the company." : "Jobs assigned to you."}
        action={
          isOwner && (
            <Button onClick={() => setShowNewJob(true)}>
              <Plus size={16} /> New job
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s === "all" ? "All" : JOB_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <Card>
        <ul className="divide-y divide-slate-100">
          {visible.length === 0 && (
            <li className="p-6">
              <EmptyState text="No jobs match this filter." />
            </li>
          )}
          {visible.map((job) => (
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

      {showNewJob && (
        <NewJobModal
          onClose={() => setShowNewJob(false)}
          customers={customers}
          employees={users.filter((u) => u.role === "employee")}
          onCreate={(input) => {
            addJob(input);
            setShowNewJob(false);
          }}
        />
      )}
    </div>
  );
}

function NewJobModal({
  onClose,
  onCreate,
  customers,
  employees,
}: {
  onClose: () => void;
  onCreate: (input: {
    title: string;
    customerId: string;
    scheduledDate: string;
    assignedEmployeeIds: string[];
    notes: string;
  }) => void;
  customers: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState("2026-09-15");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  return (
    <Modal title="New job" onClose={onClose}>
      <Field label="Job title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Roof leak repair" />
      </Field>
      <Field label="Customer">
        <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Scheduled date">
        <input
          type="date"
          className={inputClass}
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </Field>
      <Field label="Assign employees">
        <div className="flex flex-wrap gap-2">
          {employees.map((e) => {
            const active = assigned.includes(e.id);
            return (
              <button
                type="button"
                key={e.id}
                onClick={() =>
                  setAssigned((prev) =>
                    active ? prev.filter((id) => id !== e.id) : [...prev, e.id]
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {e.name}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Notes">
        <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!title || !customerId}
          onClick={() => onCreate({ title, customerId, scheduledDate, assignedEmployeeIds: assigned, notes })}
        >
          Create job
        </Button>
      </div>
    </Modal>
  );
}
