"use client";

import { useApp } from "@/lib/store";
import { Avatar, Badge, Button } from "./ui";
import { TASK_STATUS_LABEL, TASK_STATUS_STYLE, formatDuration } from "@/lib/format";
import type { JobTask, TaskStatus } from "@/lib/types";
import { Clock, Trash2 } from "lucide-react";

const STATUS_FLOW: TaskStatus[] = ["pending", "in_progress", "completed"];

export function TaskRow({ task, jobTitle }: { task: JobTask; jobTitle?: string }) {
  const { currentUser, users, timeEntries, updateTaskStatus, deleteTask, clockIn, clockOut } = useApp();

  const assignee = users.find((u) => u.id === task.assignedEmployeeId);
  const entries = timeEntries.filter((t) => t.taskId === task.id);
  const totalMs = entries.reduce((sum, t) => {
    const end = t.clockOut ? new Date(t.clockOut).getTime() : Date.now();
    return sum + (end - new Date(t.clockIn).getTime());
  }, 0);

  const myOpenEntry = timeEntries.find((t) => t.employeeId === currentUser.id && t.clockOut === null);
  const isMineActive = myOpenEntry?.taskId === task.id;
  const isOwner = currentUser.role === "owner";
  const canClock = !isOwner && (task.assignedEmployeeId == null || task.assignedEmployeeId === currentUser.id);

  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
          {isOwner ? null : <Badge className={TASK_STATUS_STYLE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {jobTitle && <span>{jobTitle}</span>}
          {assignee && (
            <span className="flex items-center gap-1">
              <Avatar name={assignee.name} color={assignee.color} size={16} /> {assignee.name}
            </span>
          )}
          {!assignee && <span className="italic text-slate-400">Unassigned</span>}
          {task.estimatedMinutes ? <span>est. {task.estimatedMinutes}m</span> : null}
          <span>logged {formatDuration(totalMs)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOwner && (
          <>
            <div className="flex gap-1">
              {STATUS_FLOW.map((s) => (
                <button
                  key={s}
                  onClick={() => updateTaskStatus(task.id, s)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    task.status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {TASK_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              title="Delete task"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
        {canClock &&
          (isMineActive ? (
            <Button variant="danger" onClick={() => clockOut(currentUser.id)}>
              <Clock size={14} /> Clock out
            </Button>
          ) : (
            <Button onClick={() => clockIn(currentUser.id, task.jobId, task.id)}>
              <Clock size={14} /> Clock in
            </Button>
          ))}
      </div>
    </div>
  );
}
