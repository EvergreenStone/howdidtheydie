"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";

type AnalysisContext = {
  id: string;
  title: string;
  people:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
};

function getPerson(
  value: AnalysisContext["people"],
): { name: string; slug: string } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AddSourcePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const analysisId = params.id;

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [analysis, setAnalysis] = useState<AnalysisContext | null>(null);
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("news");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "submitting" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAnalysis() {
      const { data, error } = await supabase
        .from("analyses")
        .select("id, title, people(name, slug)")
        .eq("id", analysisId)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setStatus("error");
        setMessage("This published analysis could not be found.");
        return;
      }

      setAnalysis(data as AnalysisContext);
      setStatus("ready");
    }

    void loadAnalysis();
  }, [analysisId, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!analysis) return;

    let normalizedUrl = url.trim();

if (
  !normalizedUrl.startsWith("http://") &&
  !normalizedUrl.startsWith("https://")
) {
  normalizedUrl = `https://${normalizedUrl}`;
}

let parsedUrl: URL;

try {
  parsedUrl = new URL(normalizedUrl);
} catch {
  setStatus("error");
  setMessage("Enter a valid website address.");
  return;
}

    setStatus("submitting");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("error");
      setMessage("You must sign in before submitting a source.");
      return;
    }

    const { error } = await supabase.from("sources").insert({
      analysis_id: analysis.id,
      title: title.trim(),
      publisher: publisher.trim() || null,
      url: parsedUrl.toString(),
      source_type: sourceType,
      notes: notes.trim() || null,
      status: "pending",
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const person = getPerson(analysis.people);

    router.push(
      `/source-submission-received?analysis=${encodeURIComponent(
        analysis.title,
      )}&slug=${encodeURIComponent(person?.slug ?? "")}`,
    );
  }

  const person = analysis ? getPerson(analysis.people) : null;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="leading-none">
            <p className="text-2xl font-bold tracking-[-0.045em]">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs font-medium text-[#66706d]">
              Add supporting evidence
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
            Evidence
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
            Add a source.
          </h1>

          {analysis && (
            <div className="mt-6 rounded-2xl border border-[#d9d3c7] bg-white p-5">
              <p className="text-sm text-[#66706d]">Supporting analysis</p>
              <p className="mt-2 font-semibold">{analysis.title}</p>
              {person && (
                <p className="mt-1 text-sm text-[#66706d]">{person.name}</p>
              )}
            </div>
          )}

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Source standards
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• Link directly to the source whenever possible.</li>
              <li>• Describe what the source actually supports.</li>
              <li>• Do not misrepresent headlines or quotations.</li>
              <li>• Prefer primary records and reputable reporting.</li>
              <li>• Sources are reviewed before becoming public.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-8 shadow-[0_20px_55px_rgba(29,42,42,0.08)]"
        >
          <div className="grid gap-6">
            <label>
              <span className="text-sm font-semibold">
                Source title <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                required
                maxLength={250}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: County medical examiner report"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Publisher / organization</span>
              <input
                type="text"
                maxLength={200}
                value={publisher}
                onChange={(event) => setPublisher(event.target.value)}
                placeholder="Example: Los Angeles County Medical Examiner"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">
                Source URL <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">
                Source type <span className="text-red-600">*</span>
              </span>
              <select
                required
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
              >
                <option value="official_record">Official record</option>
                <option value="medical">Medical source</option>
                <option value="court_record">Court record</option>
                <option value="law_enforcement">Law enforcement</option>
                <option value="news">News reporting</option>
                <option value="interview">Interview</option>
                <option value="book_documentary">Book / documentary</option>
                <option value="academic">Academic source</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-semibold">
                What does this source support?
              </span>
              <textarea
                rows={6}
                maxLength={1500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Briefly explain what information in the source is relevant to this analysis."
                className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
              <p className="mt-2 text-xs text-[#66706d]">
                {notes.length}/1500 characters
              </p>
            </label>
          </div>

          {message && (
            <div className="mt-6 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
              {message}
            </div>
          )}

          <div className="mt-7 rounded-2xl bg-[#f4f1ea] p-5">
            <p className="text-sm font-semibold">What happens next?</p>
            <p className="mt-2 text-sm leading-6 text-[#66706d]">
              The source is saved as pending. An administrator reviews it before
              it appears underneath the analysis.
            </p>
          </div>

          <button
            type="submit"
            disabled={status !== "ready"}
            className="mt-7 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white transition hover:bg-[#31413f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting…" : "Submit source for review"}
          </button>
        </form>
      </section>
    </main>
  );
}
