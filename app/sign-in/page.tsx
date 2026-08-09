"use client";

import { FormEvent, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="leading-none">
            <p className="text-2xl font-bold tracking-[-0.045em]">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs font-medium text-[#66706d]">
              Official findings. Community analysis. Visible evidence.
            </p>
          </a>

          <a
            href="/"
            className="rounded-lg border border-[#d2ccc1] px-4 py-2 text-sm font-semibold"
          >
            Back to home
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
            Welcome back
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
            Sign in to participate.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586260]">
            Sign in to vote, submit people, add sources, suggest corrections,
            and participate in community review.
          </p>

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Account access
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• Votes remain anonymous to the public.</li>
              <li>• One account may vote once per analysis.</li>
              <li>• Your email address is never shown publicly.</li>
              <li>• Community rules still apply to all activity.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-8 shadow-[0_20px_55px_rgba(29,42,42,0.08)]"
        >
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            Sign in
          </h2>

          <div className="mt-7 grid gap-5">
            <label>
              <span className="text-sm font-semibold">Email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>
          </div>

          {message && (
            <div className="mt-6 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-7 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white transition hover:bg-[#31413f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-6 text-center text-sm text-[#66706d]">
            Need an account?{" "}
            <a href="/sign-up" className="font-semibold text-[#a65336]">
              Create one
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}