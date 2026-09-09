"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Badge, Button, Card, EmptyState, Field, Modal, OwnerOnlyNotice, PageHeader, inputClass } from "@/components/ui";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_STYLE, calculateQuoteTotals, formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuotesPage() {
  const { currentUser, quotes, customers, settings, addQuote } = useApp();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const sorted = [...quotes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Every estimate you've sent, accepted, or drafted."
        action={
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> New quote
          </Button>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-100">
          {sorted.length === 0 && (
            <li className="p-6">
              <EmptyState text="No quotes yet." />
            </li>
          )}
          {sorted.map((q) => (
            <li key={q.id}>
              <Link href={`/quotes/${q.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{q.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {customerName(q.customerId)} &middot; {formatDate(q.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(calculateQuoteTotals(q, settings).total)}</span>
                  <Badge className={QUOTE_STATUS_STYLE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {showNew && (
        <NewQuoteModal
          customers={customers}
          onClose={() => setShowNew(false)}
          onCreate={(input) => {
            const id = addQuote(input);
            setShowNew(false);
            router.push(`/quotes/${id}`);
          }}
        />
      )}
    </div>
  );
}

function NewQuoteModal({
  onClose,
  onCreate,
  customers,
}: {
  onClose: () => void;
  onCreate: (input: { title: string; customerId: string }) => void;
  customers: { id: string; name: string }[];
}) {
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");

  return (
    <Modal title="New quote" onClose={onClose}>
      <Field label="Quote title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bathroom remodel" />
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
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!title || !customerId} onClick={() => onCreate({ title, customerId })}>
          Create draft
        </Button>
      </div>
    </Modal>
  );
}
