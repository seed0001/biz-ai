"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import type { AiAction, AiActionResult } from "@/lib/ai-actions";
import { Button, Modal } from "./ui";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";

interface LogEntry {
  role: "user" | "assistant" | "error";
  text: string;
  results?: AiActionResult[];
}

export function AiAssistant() {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  if (app.currentUser.role !== "owner") return null;

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setLog((l) => [...l, { role: "user", text: message }]);
    setLoading(true);

    // A compact, read-only snapshot of the data the assistant is allowed to
    // reference — mirrors quote-ai's buildContext(). Kept small on purpose:
    // ids + the fields needed to answer, not full records.
    const context = {
      businessProfile: {
        companyName: app.settings.companyName,
        businessType: app.settings.businessType,
      },
      currentDate: new Date().toISOString().slice(0, 10),
      customers: app.customers.map((c) => ({ id: c.id, name: c.name })),
      employees: app.users.filter((u) => u.role === "employee").map((u) => ({ id: u.id, name: u.name, title: u.title })),
      catalog: app.catalog.map((c) => ({ id: c.id, name: c.name, category: c.category, unit: c.unit, price: c.price })),
      quotes: app.quotes.map((q) => ({ id: q.id, title: q.title, customerId: q.customerId, status: q.status })),
      jobs: app.jobs.map((j) => ({ id: j.id, title: j.title, customerId: j.customerId, status: j.status, scheduledDate: j.scheduledDate })),
      jobTasks: app.jobTasks.map((t) => ({ id: t.id, jobId: t.jobId, title: t.title, status: t.status, assignedEmployeeId: t.assignedEmployeeId })),
    };

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context, model: app.settings.openRouterModel }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLog((l) => [...l, { role: "error", text: data.error || "The AI request failed." }]);
        return;
      }

      const actions: AiAction[] = Array.isArray(data.actions) ? data.actions : [];
      const results: AiActionResult[] = actions.map((action) => app.runAiAction(action));

      setLog((l) => [...l, { role: "assistant", text: data.reply || "(no reply)", results }]);
    } catch (e) {
      setLog((l) => [...l, { role: "error", text: `Request failed: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-shadow duration-150 hover:bg-slate-50 hover:shadow-md"
        title="Ask the AI assistant"
      >
        <Sparkles size={16} className="text-blue-600" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      {open && (
        <Modal title="AI Assistant" onClose={() => setOpen(false)}>
          <div className="flex h-[60vh] max-h-[520px] flex-col">
            <div className="mb-3 flex-1 space-y-3 overflow-y-auto pr-1">
              {log.length === 0 && (
                <p className="text-sm text-slate-500">
                  Try: &quot;Add a $150 bathroom fan install quote item to q-1004&quot; or &quot;What&apos;s the status of the
                  deck job?&quot; Runs on OpenRouter — needs an API key in .env.local.
                </p>
              )}
              {log.map((entry, i) => (
                <div key={i}>
                  {entry.role === "user" && (
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white">
                      {entry.text}
                    </div>
                  )}
                  {entry.role === "assistant" && (
                    <div className="max-w-[90%] space-y-2">
                      <div className="flex items-start gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                        <Bot size={16} className="mt-0.5 shrink-0 text-blue-600" />
                        <span>{entry.text}</span>
                      </div>
                      {entry.results && entry.results.length > 0 && (
                        <ul className="space-y-1 pl-6 text-xs">
                          {entry.results.map((r, j) => (
                            <li key={j} className={r.ok ? "text-emerald-600" : "text-rose-600"}>
                              {r.ok ? "✓" : "✗"} {r.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {entry.role === "error" && (
                    <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{entry.text}</div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <input
                autoFocus
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ask the assistant to do something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button onClick={send} disabled={loading || !input.trim()}>
                <Send size={16} />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
