"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Dumbbell } from "lucide-react";
import { loginSchema, type LoginInput } from "@/validators/auth.schema";
import { login } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const result = await login(data.email, data.password);
    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setServerError(result.error ?? "Invalid email or password");
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)]">
          <Dumbbell
            className="h-5 w-5 text-[var(--primary)]"
            strokeWidth={1.75}
          />
        </div>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Log in to continue your fitness journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-sm text-[var(--danger)]">
            {serverError}
          </div>
        )}
        <form method="POST" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-[var(--danger)]">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-[var(--danger)]">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
            )}
            Log in
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
