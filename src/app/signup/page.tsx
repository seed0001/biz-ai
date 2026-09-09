"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/actions/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-sm p-6" shadow="xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-md">
            IC
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Create your company</h1>
          <p className="mt-1 text-sm text-slate-500">You&apos;ll be set up as the owner/admin.</p>
        </div>

        <form action={action}>
          <Field label="Company name">
            <input name="companyName" required className={inputClass} placeholder="Ironclad Contracting" />
          </Field>
          {state?.errors?.companyName && <p className="-mt-2 mb-3 text-xs text-rose-600">{state.errors.companyName[0]}</p>}

          <Field label="Your name">
            <input name="name" required className={inputClass} autoComplete="name" />
          </Field>
          {state?.errors?.name && <p className="-mt-2 mb-3 text-xs text-rose-600">{state.errors.name[0]}</p>}

          <Field label="Email">
            <input name="email" type="email" required className={inputClass} autoComplete="email" />
          </Field>
          {state?.errors?.email && <p className="-mt-2 mb-3 text-xs text-rose-600">{state.errors.email[0]}</p>}

          <Field label="Password">
            <input name="password" type="password" required className={inputClass} autoComplete="new-password" />
          </Field>
          {state?.errors?.password && <p className="-mt-2 mb-3 text-xs text-rose-600">{state.errors.password[0]}</p>}

          {state?.message && <p className="mb-3 text-sm text-rose-600">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-full justify-center">
            {pending ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
