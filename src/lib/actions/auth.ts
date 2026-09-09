"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export interface AuthFormState {
  errors?: Record<string, string[]>;
  message?: string;
}

const SignupSchema = z.object({
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters."),
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signup(_prev: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const parsed = SignupSchema.safeParse({
    companyName: formData.get("companyName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { companyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: companyName } });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
        role: "owner",
        color: "#2563eb",
      },
    });
    await tx.companySettings.create({
      data: {
        tenantId: tenant.id,
        companyName,
        aiGreeting: `Thanks for calling ${companyName}, this is the office assistant. How can I help?`,
      },
    });
    return { user, tenant };
  });

  await createSession(user.id, tenant.id);
  redirect("/");
}

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export async function login(_prev: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { message: "Invalid email or password." };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id, user.tenantId);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
