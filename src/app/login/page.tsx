"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-6" shadow="xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-md">
            IC
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back to your business portal.</p>
        </div>

        <form action={action}>
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} autoComplete="email" />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required className={inputClass} autoComplete="current-password" />
          </Field>

          {state?.message && <p className="mb-3 text-sm text-rose-600">{state.message}</p>}

          <Button type="submit" disabled={pending} className="w-full justify-center">
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
