"use client";

import { FormEvent, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const rules = [
  "Clearly separate confirmed facts from community analysis or speculation.",
  "Do not post private identifying information, confidential records, or information identifying minors.",
  "Do not accuse a living person of criminal conduct or serious wrongdoing without a credible published source.",
  "Represent every source honestly. Do not fabricate evidence, alter quotations, or misstate what a source says.",
  "Do not harass grieving families, mock the deceased, threaten users, or post graphic content.",
  "Do not create duplicate accounts, use bots, coordinate fraudulent voting, or manipulate confidence scores.",
  "Understand that community confidence reflects user opinion and does not establish factual accuracy.",
  "Accept that moderators may edit, label, restrict, archive, or remove content that violates these rules.",
];

export default function SignUpPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accepted) {
      setStatus("error");
      setMessage("You must read and agree to the community rules.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          rules_version: "1.0",
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage(
      "Account created. Check your email and click the confirmation link before signing in.",
    );
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

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
            Create an account
          </p>

          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.05em]">
            Join the community.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586260]">
            Accounts are required to vote, submit people, add sources, suggest
            corrections, and participate in community review.
          </p>

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Your privacy
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• Your votes are anonymous to the public.</li>
              <li>• One account may cast one vote per analysis.</li>
              <li>• Your email address is never displayed publicly.</li>
              <li>• Moderation records remain private.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-7 shadow-[0_20px_55px_rgba(29,42,42,0.08)] md:p-9"
        >
          <div className="grid gap-5">
            <label>
              <span className="text-sm font-semibold">Display name</span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="The name other users will see"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Email address</span>
              <input
                type="email"
                required
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
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>
          </div>

          <div className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a65336]">
                  Community rules
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Read these before creating an account
                </h2>
              </div>

              <span className="shrink-0 rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-semibold text-[#66706d]">
                Version 1.0
              </span>
            </div>

            <div className="mt-5 max-h-80 space-y-4 overflow-y-auto rounded-2xl border border-[#ded8ce] bg-[#f8f6f1] p-5">
              {rules.map((rule, index) => (
                <div key={rule} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a65336]/10 text-xs font-bold text-[#a65336]">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-[#586260]">{rule}</p>
                </div>
              ))}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d9d3c7] p-4">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-5 w-5 accent-[#a65336]"
              />

              <span className="text-sm leading-6 text-[#586260]">
                I have read and agree to Community Rules version 1.0. I
                understand that my acceptance date and rules version will be
                stored with my account.
              </span>
            </label>
          </div>

          {message && (
            <div
              className={`mt-6 rounded-xl px-4 py-3 text-sm ${
                status === "success"
                  ? "bg-[#e8efe9] text-[#315a46]"
                  : "bg-[#f6e7e2] text-[#8a3f2b]"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-6 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white transition hover:bg-[#31413f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-5 text-center text-sm text-[#66706d]">
            Already have an account?{" "}
            <span className="font-semibold text-[#a65336]">
              Sign-in page coming next
            </span>
          </p>
        </form>
      </section>
    </main>
  );
}