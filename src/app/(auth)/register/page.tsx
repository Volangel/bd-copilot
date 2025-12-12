"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to register");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false });
    if (!signInResult?.ok) {
      setError("Registration successful but login failed. Please try logging in.");
      setLoading(false);
      return;
    }
    router.push("/projects");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Create your account</h1>
        <p className="text-sm text-slate-400">Free tier includes basic analysis and outreach templates. Upgrade anytime.</p>
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
        <div className="space-y-1">
          <label className="text-sm text-slate-300" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <div className="text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
          Log in
        </Link>
      </div>
    </div>
  );
}
