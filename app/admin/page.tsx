"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type PendingPerson = {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  official_cause: string | null;
  official_manner: string | null;
  profile_type: string;
  created_at: string;
};

type PendingAnalysis = {
  id: string;
  title: string;
  details: string;
  created_at: string;
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

function getAnalysisPerson(
  value: PendingAnalysis["people"],
): { name: string; slug: string } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AdminPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [people, setPeople] = useState<PendingPerson[]>([]);
  const [analyses, setAnalyses] = useState<PendingAnalysis[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "unauthorized" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  const loadPending = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("unauthorized");
      setMessage("You must sign in before opening the admin dashboard.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      setStatus("unauthorized");
      setMessage("This account does not have administrator access.");
      return;
    }

    const [
      { data: peopleData, error: peopleError },
      { data: analysisData, error: analysisError },
    ] = await Promise.all([
      supabase
        .from("people")
        .select(
          "id, name, slug, birth_date, death_date, occupation, official_cause, official_manner, profile_type, created_at",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true }),

      supabase
        .from("analyses")
        .select("id, title, details, created_at, people(name, slug)")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);

    if (peopleError || analysisError) {
      setStatus("error");
      setMessage(peopleError?.message || analysisError?.message || "Could not load pending items.");
      return;
    }

    setPeople((peopleData ?? []) as PendingPerson[]);
    setAnalyses((analysisData ?? []) as PendingAnalysis[]);
    setStatus("ready");
  }, [supabase]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  async function updatePerson(
    person: PendingPerson,
    nextStatus: "published" | "rejected",
  ) {
    setMessage("");

    const { error } = await supabase
      .from("people")
      .update({
        status: nextStatus,
        published_at:
          nextStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", person.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPeople((current) => current.filter((item) => item.id !== person.id));
    setMessage(
      nextStatus === "published"
        ? `${person.name} is now published.`
        : `${person.name} was rejected.`,
    );
  }

  async function updateAnalysis(
    analysis: PendingAnalysis,
    nextStatus: "published" | "rejected",
  ) {
    setMessage("");

    const { error } = await supabase
      .from("analyses")
      .update({
        status: nextStatus,
        published_at:
          nextStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", analysis.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAnalyses((current) => current.filter((item) => item.id !== analysis.id));
    setMessage(
      nextStatus === "published"
        ? `Analysis “${analysis.title}” is now published.`
        : `Analysis “${analysis.title}” was rejected.`,
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
              Administrator dashboard
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

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Moderation
        </p>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-5xl font-semibold tracking-[-0.05em]">
              Pending review
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-[#66706d]">
              Approve or reject new people and community analyses.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPending()}
            className="rounded-xl border border-[#d2ccc1] bg-white px-5 py-3 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {message && (
          <div className="mt-7 rounded-xl border border-[#d9d3c7] bg-white px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {status === "loading" && (
          <div className="mt-8 rounded-[26px] border border-[#d2ccc1] bg-white p-8">
            Loading submissions…
          </div>
        )}

        {(status === "unauthorized" || status === "error") && (
          <div className="mt-8 rounded-[26px] border border-[#d2ccc1] bg-white p-8">
            <h2 className="text-2xl font-semibold">Dashboard unavailable</h2>
            <p className="mt-3 text-[#66706d]">{message}</p>
          </div>
        )}

        {status === "ready" && (
          <div className="mt-10 space-y-12">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-semibold">People</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold">
                  {people.length} pending
                </span>
              </div>

              {people.length === 0 ? (
                <div className="mt-5 rounded-[26px] border border-[#d2ccc1] bg-white p-7 text-center">
                  No people are waiting.
                </div>
              ) : (
                <div className="mt-5 grid gap-5">
                  {people.map((person) => (
                    <article
                      key={person.id}
                      className="rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                        <div>
                          <h3 className="text-2xl font-semibold">{person.name}</h3>
                          <p className="mt-2 text-sm text-[#66706d]">
                            /person/{person.slug}
                          </p>
                          <p className="mt-4 text-sm text-[#586260]">
                            {person.occupation || "No occupation provided"} ·{" "}
                            {person.official_cause || "No official cause provided"}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => void updatePerson(person, "published")}
                            className="rounded-xl bg-[#315a46] px-5 py-3 font-semibold text-white"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void updatePerson(person, "rejected")}
                            className="rounded-xl border border-[#c8a79a] px-5 py-3 font-semibold text-[#8a3f2b]"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Community analyses</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold">
                  {analyses.length} pending
                </span>
              </div>

              {analyses.length === 0 ? (
                <div className="mt-5 rounded-[26px] border border-[#d2ccc1] bg-white p-7 text-center">
                  No analyses are waiting.
                </div>
              ) : (
                <div className="mt-5 grid gap-5">
                  {analyses.map((analysis) => {
                    const person = getAnalysisPerson(analysis.people);

                    return (
                      <article
                        key={analysis.id}
                        className="rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                          <div className="max-w-3xl">
                            <p className="text-sm font-semibold text-[#a65336]">
                              {person?.name || "Unknown person"}
                            </p>
                            <h3 className="mt-2 text-2xl font-semibold">
                              {analysis.title}
                            </h3>
                            <p className="mt-4 leading-7 text-[#586260]">
                              {analysis.details}
                            </p>

                            {person && (
                              <a
                                href={`/person/${person.slug}`}
                                className="mt-4 inline-flex text-sm font-semibold text-[#a65336]"
                              >
                                View profile →
                              </a>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-3">
                            <button
                              onClick={() => void updateAnalysis(analysis, "published")}
                              className="rounded-xl bg-[#315a46] px-5 py-3 font-semibold text-white"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => void updateAnalysis(analysis, "rejected")}
                              className="rounded-xl border border-[#c8a79a] px-5 py-3 font-semibold text-[#8a3f2b]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
