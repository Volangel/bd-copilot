"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error"));
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
      setLoading(false);
      return;
    }

    router.push("/projects");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <p className="text-sm text-slate-400">Use your work email to get started.</p>
      </div>
      {error ? (
        <div className="rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-slate-600 focus:ring-slate-700"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-slate-600 focus:ring-slate-700"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 shadow-md transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300">
          Create one
        </Link>
      </div>
    </div>
  );
}
