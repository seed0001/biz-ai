"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Avatar, Button, Card, Field, Modal, OwnerOnlyNotice, PageHeader, inputClass } from "@/components/ui";
import { Plus } from "lucide-react";

export default function TeamPage() {
  const { currentUser, users, timeEntries, addEmployee } = useApp();
  const [showNew, setShowNew] = useState(false);

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const employees = users.filter((u) => u.role === "employee");

  return (
    <div>
      <PageHeader
        title="Team"
        description="Everyone with portal access."
        action={
          <Button onClick={() => setShowNew(true)}>
            <Plus size={16} /> Add employee
          </Button>
        }
      />

      <Card>
        <ul className="divide-y divide-slate-100">
          {employees.map((u) => {
            const open = timeEntries.find((t) => t.employeeId === u.id && t.clockOut === null);
            return (
              <li key={u.id}>
                <Link href={`/team/${u.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} color={u.color} size={36} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">
                        {u.title} &middot; {u.phone}
                      </p>
                    </div>
                  </div>
                  {open && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      On the clock
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      {showNew && (
        <NewEmployeeModal
          onClose={() => setShowNew(false)}
          onCreate={(input) => {
            addEmployee(input);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewEmployeeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; title: string; phone: string; email: string }) => void;
}) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Modal title="Add employee" onClose={onClose}>
      <Field label="Full name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Blake" />
      </Field>
      <Field label="Title / role">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Carpenter" />
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" />
      </Field>
      <Field label="Email">
        <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!name || !title} onClick={() => onCreate({ name, title, phone, email })}>
          Add to team
        </Button>
      </div>
    </Modal>
  );
}
