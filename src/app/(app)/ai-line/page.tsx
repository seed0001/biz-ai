"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Badge, Card, Modal, OwnerOnlyNotice, PageHeader } from "@/components/ui";
import { CALL_OUTCOME_LABEL, CALL_OUTCOME_STYLE, formatDate, formatTime } from "@/lib/format";
import type { CallLog } from "@/lib/types";
import { MessageSquare, Phone, PhoneCall } from "lucide-react";

export default function AiLinePage() {
  const { currentUser, callLogs } = useApp();
  const [selected, setSelected] = useState<CallLog | null>(null);

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const sorted = [...callLogs].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const bookedCount = callLogs.filter((c) => c.outcome === "booked").length;

  return (
    <div>
      <PageHeader
        title="AI Line"
        description="Every call and text your AI front desk has handled."
      />

      <Card className="mb-6 flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <PhoneCall size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">
            (555) 010-2200 &middot; {bookedCount} booked this week
          </p>
          <p className="text-xs text-slate-500">Your AI agent answers this number 24/7 for calls and texts.</p>
        </div>
      </Card>

      <Card>
        <ul className="divide-y divide-slate-100">
          {sorted.map((call) => (
            <li key={call.id}>
              <button
                onClick={() => setSelected(call)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    {call.channel === "call" ? <Phone size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{call.customerName}</p>
                    <p className="truncate text-xs text-slate-500">{call.summary}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge className={CALL_OUTCOME_STYLE[call.outcome]}>{CALL_OUTCOME_LABEL[call.outcome]}</Badge>
                  <span className="text-xs text-slate-400">
                    {formatDate(call.startedAt)} {formatTime(call.startedAt)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {selected && (
        <Modal title={`${selected.customerName} - ${selected.customerPhone}`} onClose={() => setSelected(null)}>
          <div className="mb-3 flex items-center gap-2">
            <Badge className={CALL_OUTCOME_STYLE[selected.outcome]}>{CALL_OUTCOME_LABEL[selected.outcome]}</Badge>
            <span className="text-xs text-slate-400">
              {formatDate(selected.startedAt)} {formatTime(selected.startedAt)}
            </span>
          </div>
          <p className="mb-4 text-sm text-slate-600">{selected.summary}</p>
          <div className="space-y-3">
            {selected.transcript.map((line, i) => (
              <div key={i} className={`flex ${line.from === "ai" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    line.from === "ai" ? "bg-blue-50 text-blue-900" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
