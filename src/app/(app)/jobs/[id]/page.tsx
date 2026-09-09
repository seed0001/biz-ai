"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { Avatar, Badge, Button, Card, EmptyState, Field, Modal, inputClass } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import {
  JOB_STATUS_LABEL,
  JOB_STATUS_STYLE,
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_STYLE,
  calculateQuoteTotals,
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
} from "@/lib/format";
import type { JobStatus } from "@/lib/types";
import { ArrowLeft, ListChecks, MapPin, Phone, Plus, Sparkles } from "lucide-react";

const STATUS_FLOW: JobStatus[] = ["quoted", "scheduled", "in_progress", "completed", "invoiced"];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    currentUser,
    jobs,
    customers,
    users,
    quotes,
    timeEntries,
    jobTasks,
    settings,
    updateJobStatus,
    generateTasksFromQuote,
  } = useApp();
  const [showAddTask, setShowAddTask] = useState(false);

  const job = jobs.find((j) => j.id === id);
  if (!job) return notFound();

  const customer = customers.find((c) => c.id === job.customerId);
  const quote = quotes.find((q) => q.id === job.quoteId);
  const assigned = users.filter((u) => job.assignedEmployeeIds.includes(u.id));
  const jobTimeEntries = timeEntries.filter((t) => t.jobId === job.id);
  const tasks = jobTasks.filter((t) => t.jobId === job.id).sort((a, b) => a.order - b.order);
  const doneCount = tasks.filter((t) => t.status === "completed").length;
  const isOwner = currentUser.role === "owner";

  return (
    <div>
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to jobs
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {customer?.name} &middot; scheduled {formatDate(job.scheduledDate)}
          </p>
        </div>
        <Badge className={JOB_STATUS_STYLE[job.status]}>{JOB_STATUS_LABEL[job.status]}</Badge>
      </div>

      {isOwner && (
        <Card className="mb-6 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Update status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                onClick={() => updateJobStatus(job.id, s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  job.status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {JOB_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks size={16} className="text-blue-600" />
                Tasks {tasks.length > 0 && <span className="text-slate-400">({doneCount}/{tasks.length})</span>}
              </h2>
              {isOwner && (
                <div className="flex flex-wrap gap-2">
                  {quote && (
                    <Button variant="secondary" onClick={() => generateTasksFromQuote(job.id, quote.id)}>
                      <Sparkles size={14} /> Generate from quote
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setShowAddTask(true)}>
                    <Plus size={14} /> Add task
                  </Button>
                </div>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {tasks.length === 0 && (
                <li className="p-4">
                  <EmptyState text="No tasks yet. Break this job into the steps a crew member actually needs to complete, then they can clock in on each one." />
                </li>
              )}
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Notes</h2>
            <p className="text-sm text-slate-600">{job.notes || "No notes yet."}</p>
          </Card>

          <Card>
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Time logged on this job</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {jobTimeEntries.length === 0 && (
                <li className="p-4">
                  <EmptyState text="No time logged yet." />
                </li>
              )}
              {jobTimeEntries.map((t) => {
                const emp = users.find((u) => u.id === t.employeeId);
                const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
                const durMs = end - new Date(t.clockIn).getTime();
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      {emp && <Avatar name={emp.name} color={emp.color} size={28} />}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{emp?.name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(t.date)} &middot; {formatTime(t.clockIn)} -{" "}
                          {t.clockOut ? formatTime(t.clockOut) : "in progress"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{formatDuration(durMs)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {quote && (
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h2 className="text-sm font-semibold text-slate-900">Linked quote</h2>
                <Badge className={QUOTE_STATUS_STYLE[quote.status]}>{QUOTE_STATUS_LABEL[quote.status]}</Badge>
              </div>
              <Link href={`/quotes/${quote.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{quote.title}</p>
                  <p className="text-xs text-slate-500">{quote.lineItems.length} line items</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(calculateQuoteTotals(quote, settings).total)}</span>
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Customer</h2>
            {customer ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-slate-900">{customer.name}</p>
                <p className="flex items-start gap-2 text-slate-600">
                  <MapPin size={15} className="mt-0.5 shrink-0" /> {customer.address}
                </p>
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone size={15} className="shrink-0" /> {customer.phone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No customer on file.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Assigned crew</h2>
            {assigned.length === 0 ? (
              <p className="text-sm text-slate-500">No one assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {assigned.map((u) => (
                  <li key={u.id} className="flex items-center gap-3">
                    <Avatar name={u.name} color={u.color} size={32} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.title}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {showAddTask && (
        <AddTaskModal jobId={job.id} crew={assigned} onClose={() => setShowAddTask(false)} />
      )}
    </div>
  );
}

function AddTaskModal({
  jobId,
  crew,
  onClose,
}: {
  jobId: string;
  crew: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { addTask } = useApp();
  const [title, setTitle] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");

  return (
    <Modal title="Add task" onClose={onClose}>
      <Field label="Task">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fill nail holes & caulk gaps"
        />
      </Field>
      <Field label="Estimated minutes (optional)">
        <input
          type="number"
          min={0}
          className={inputClass}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
        />
      </Field>
      <Field label="Assign to">
        <select className={inputClass} value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)}>
          <option value="">Unassigned</option>
          {crew.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!title.trim()}
          onClick={() => {
            addTask(jobId, {
              title: title.trim(),
              estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
              assignedEmployeeId: assignedEmployeeId || null,
            });
            onClose();
          }}
        >
          Add task
        </Button>
      </div>
    </Modal>
  );
}
