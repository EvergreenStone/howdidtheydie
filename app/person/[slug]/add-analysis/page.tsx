"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  slug: string;
};

export default function AddAnalysisPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [person, setPerson] = useState<Person | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPerson() {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, slug")
        .eq("slug", slug)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setStatus("error");
        setMessage("This person could not be found.");
        return;
      }

      setPerson(data as Person);
      setStatus("ready");
    }

    void loadPerson();
  }, [slug, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!person) return;

    setStatus("submitting");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("error");
      setMessage("You must sign in before submitting an analysis.");
      return;
    }

    const { error } = await supabase.from("analyses").insert({
      person_id: person.id,
      title: title.trim(),
      details: details.trim(),
      status: "pending",
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push(
      `/analysis-submission-received?person=${encodeURIComponent(
        person.name,
      )}&slug=${encodeURIComponent(person.slug)}`,
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
              Submit community analysis
            </p>
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <a
            href={person ? `/person/${person.slug}` : "/"}
            className="text-sm font-semibold text-[#a65336]"
          >
            ← Back to profile
          </a>

          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
            Community analysis
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
            Submit an explanation.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586260]">
            {person
              ? `Add a possible explanation or contributing factor for ${person.name}.`
              : "Loading profile…"}
          </p>

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Keep analysis separate from fact
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• State the claim clearly.</li>
              <li>• Explain why you think it may be relevant.</li>
              <li>• Do not present speculation as an official finding.</li>
              <li>• Do not accuse a living person of wrongdoing without a credible source.</li>
              <li>• Sources will be attached in the next feature we build.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-8 shadow-[0_20px_55px_rgba(29,42,42,0.08)]"
        >
          <label>
            <span className="text-sm font-semibold">
              Analysis title <span className="text-red-600">*</span>
            </span>
            <input
              type="text"
              required
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: An underlying medical condition was a major contributing factor"
              className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-semibold">
              Explanation <span className="text-red-600">*</span>
            </span>
            <textarea
              required
              minLength={20}
              maxLength={3000}
              rows={10}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Explain the analysis, what it means, and why it may be relevant. Keep confirmed facts and interpretation clearly separated."
              className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
            />
            <p className="mt-2 text-xs text-[#66706d]">
              {details.length}/3000 characters
            </p>
          </label>

          {message && (
            <div className="mt-6 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
              {message}
            </div>
          )}

          <div className="mt-7 rounded-2xl bg-[#f4f1ea] p-5">
            <p className="text-sm font-semibold">What happens next?</p>
            <p className="mt-2 text-sm leading-6 text-[#66706d]">
              Your analysis is saved as pending. An administrator reviews it
              before it appears publicly on the profile.
            </p>
          </div>

          <button
            type="submit"
            disabled={status !== "ready" && status !== "error"}
            className="mt-7 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white transition hover:bg-[#31413f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting…" : "Submit analysis for review"}
          </button>
        </form>
      </section>
    </main>
  );
}
