"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  slug: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export default function AddProfileSourcePage() {
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
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("news");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">("loading");
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
        setMessage("This published profile could not be found.");
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
      setMessage("Please sign in before adding a source.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizeUrl(url));
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setStatus("error");
      setMessage("Enter a valid source URL.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    const { error } = await supabase.from("sources").insert({
      person_id: person.id,
      analysis_id: null,
      title: title.trim(),
      publisher: publisher.trim() || null,
      url: parsedUrl.toString(),
      source_type: sourceType,
      notes: notes.trim() || null,
      status: isAdmin ? "published" : "pending",
      published_at: isAdmin ? new Date().toISOString() : null,
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    if (isAdmin) {
      router.push(`/person/${person.slug}`);
      router.refresh();
    } else {
      router.push(
        `/profile-source-submission-received?name=${encodeURIComponent(person.name)}&slug=${encodeURIComponent(person.slug)}`,
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold tracking-[-0.045em] sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs text-[#66706d]">Add a reported-fact source</p>
          </a>

          <a
            href={person ? `/person/${person.slug}` : "/"}
            className="rounded-lg border border-[#d2ccc1] px-4 py-2 text-sm font-semibold"
          >
            Back
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
            Reported facts
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Add a source.
          </h1>

          {person && <p className="mt-4 text-lg text-[#66706d]">{person.name}</p>}

          <div className="mt-7 rounded-[24px] bg-[#1d2a2a] p-6 text-white">
            <p className="font-semibold">Use this for factual reporting.</p>
            <p className="mt-3 text-sm leading-6 text-[#d6dddb]">
              Add sources that document the death itself, a reported cause or
              manner, or another basic fact. Do not use this form for a theory or
              competing explanation — those belong under Community Analysis.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-[#d2ccc1] bg-white p-5 shadow-[0_20px_55px_rgba(29,42,42,0.08)] sm:p-7"
        >
          <div className="grid gap-5">
            <label>
              <span className="text-sm font-semibold">Source title *</span>
              <input
                required
                maxLength={250}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: Representative confirms death at age 36"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Publisher / organization</span>
              <input
                maxLength={200}
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Example: Reuters, People, County Medical Examiner"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Source URL *</span>
              <input
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="reuters.com/..."
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Source type *</span>
              <select
                required
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
              >
                <option value="news">News reporting</option>
                <option value="family_statement">Family / representative statement</option>
                <option value="obituary">Obituary / death notice</option>
                <option value="official_record">Official record</option>
                <option value="government_record">Government record</option>
                <option value="medical">Medical / medical examiner source</option>
                <option value="law_enforcement">Law enforcement</option>
                <option value="court_record">Court record</option>
                <option value="interview">Interview</option>
                <option value="academic">Academic source</option>
                <option value="book_documentary">Book / documentary</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-semibold">What does this source establish?</span>
              <textarea
                rows={5}
                maxLength={1500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: Confirms the death. The article states that a cause of death has not yet been publicly disclosed."
                className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>
          </div>

          {message && (
            <div className="mt-5 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
              {message}
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-[#f4f1ea] p-4">
            <p className="text-sm leading-6 text-[#66706d]">
              Administrator submissions publish immediately. Other submissions
              go to moderation before appearing publicly.
            </p>
          </div>

          <button
            type="submit"
            disabled={status !== "ready"}
            className="mt-6 w-full rounded-xl bg-[#a65336] px-6 py-4 font-semibold text-white disabled:opacity-60"
          >
            {status === "submitting" ? "Adding source…" : "Add source"}
          </button>
        </form>
      </section>
    </main>
  );
}
