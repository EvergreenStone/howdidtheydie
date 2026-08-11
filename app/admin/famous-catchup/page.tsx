"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ImportPerson = {
  wikidataId: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  name: string;
  aliases: string[];
  birthDate: string | null;
  deathDate: string;
  occupation: string | null;
  officialCause: string | null;
  officialManner: string | null;
};

type ResultRow = {
  requested: string;
  status: "added" | "exists" | "not-found" | "failed";
  matched?: string;
  message?: string;
};

const STARTER_NAMES = `Michael Jackson
Elvis Presley
Princess Diana
Whitney Houston
Robin Williams
Kobe Bryant
Matthew Perry
Prince
David Bowie
George Michael
Aretha Franklin
Tina Turner
Betty White
Bob Saget
James Gandolfini
Heath Ledger
Paul Walker
Carrie Fisher
Debbie Reynolds
Joan Rivers
Alan Rickman
Chadwick Boseman
Sean Connery
Gene Wilder
Patrick Swayze
Farrah Fawcett
Steve Jobs
Muhammad Ali
John F. Kennedy
John Lennon
Freddie Mercury
Marilyn Monroe
Audrey Hepburn
Lucille Ball
Frank Sinatra
Dean Martin
Johnny Cash
Ray Charles
James Brown
Tupac Shakur
The Notorious B.I.G.
Mac Miller
DMX`;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function FamousCatchupPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [names, setNames] = useState(STARTER_NAMES);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [message, setMessage] = useState("");

  async function verifyAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("You must sign in first.");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      throw new Error("This account does not have administrator access.");
    }

    return user;
  }

  async function insertPerson(person: ImportPerson, userId: string) {
    const { data: existingByQid } = await supabase
      .from("people")
      .select("id, name")
      .eq("wikidata_id", person.wikidataId)
      .maybeSingle();

    if (existingByQid) {
      return { status: "exists" as const, matched: existingByQid.name };
    }

    const { data: existingByName } = await supabase
      .from("people")
      .select("id, name")
      .eq("status", "published")
      .ilike("name", person.name)
      .maybeSingle();

    if (existingByName) {
      return { status: "exists" as const, matched: existingByName.name };
    }

    const baseSlug = slugify(person.name) || person.wikidataId.toLowerCase();

    const { data: slugOwner } = await supabase
      .from("people")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const slug = slugOwner
      ? `${baseSlug}-${person.wikidataId.toLowerCase()}`
      : baseSlug;

    const { error } = await supabase.from("people").insert({
      name: person.name,
      aliases: person.aliases ?? [],
      slug,
      birth_date: person.birthDate,
      death_date: person.deathDate,
      occupation: person.occupation,
      biography: null,
      official_cause: person.officialCause,
      official_manner: person.officialManner,
      profile_type: "public",
      status: "published",
      created_by: userId,
      published_at: new Date().toISOString(),
      wikidata_id: person.wikidataId,
      imported_from: "wikidata-famous-catchup",
      imported_at: new Date().toISOString(),
      source_url: person.wikipediaUrl || person.wikidataUrl,
    });

    if (error) throw error;

    return { status: "added" as const, matched: person.name };
  }

  async function runCatchup() {
    if (running) return;

    const requestedNames = Array.from(
      new Set(
        names
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );

    if (requestedNames.length === 0) {
      setMessage("Enter at least one name.");
      return;
    }

    setRunning(true);
    setResults([]);
    setMessage(`Checking ${requestedNames.length} names…`);

    try {
      const user = await verifyAdmin();
      const nextResults: ResultRow[] = [];

      for (const requested of requestedNames) {
        try {
          const response = await fetch(
            `/api/wikidata-import?name=${encodeURIComponent(requested)}`,
            { cache: "no-store" },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || `Request failed with ${response.status}.`);
          }

          const candidates = (data?.people ?? []) as ImportPerson[];

          if (candidates.length === 0) {
            nextResults.push({
              requested,
              status: "not-found",
              message: "No deceased English-Wikipedia match returned by Wikidata.",
            });
            setResults([...nextResults]);
            continue;
          }

          // wbsearchentities is relevance-ranked. Prefer exact label/alias match,
          // otherwise use its first deceased English-Wikipedia result.
          const requestedLower = requested.toLowerCase();

          const person =
            candidates.find(
              (candidate) =>
                candidate.name.toLowerCase() === requestedLower ||
                candidate.aliases.some(
                  (alias) => alias.toLowerCase() === requestedLower,
                ),
            ) ?? candidates[0];

          const inserted = await insertPerson(person, user.id);

          nextResults.push({
            requested,
            status: inserted.status,
            matched: inserted.matched,
          });
        } catch (error) {
          nextResults.push({
            requested,
            status: "failed",
            message:
              error instanceof Error ? error.message : "Unknown import error.",
          });
        }

        setResults([...nextResults]);

        // Be polite to Wikidata.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      setMessage("Famous-person catch-up finished.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Catch-up import could not start.",
      );
    } finally {
      setRunning(false);
    }
  }

  const added = results.filter((row) => row.status === "added").length;
  const exists = results.filter((row) => row.status === "exists").length;
  const missing = results.filter((row) => row.status === "not-found").length;
  const failed = results.filter((row) => row.status === "failed").length;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs text-[#66706d]">
              Famous-person catch-up importer
            </p>
          </a>

          <a href="/admin" className="text-sm font-semibold text-[#a65336]">
            Admin →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
          Coverage repair
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Catch up famous missing profiles.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#586260]">
          Enter one person per line. This searches Wikidata by name, requires a
          death date and English Wikipedia article, and imports the profile even
          if Wikidata has no structured cause of death.
        </p>

        <div className="mt-8 rounded-[24px] border border-[#d2ccc1] bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold">Names to check/import</span>
            <textarea
              value={names}
              disabled={running}
              onChange={(event) => setNames(event.target.value)}
              className="mt-3 min-h-[360px] w-full rounded-xl border border-[#d9d3c7] p-4 font-mono text-sm leading-6 outline-none focus:border-[#a65336] disabled:opacity-60"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={running}
              onClick={() => void runCatchup()}
              className="rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {running ? "Working…" : "Check & import names"}
            </button>

            <button
              type="button"
              disabled={running}
              onClick={() => setNames(STARTER_NAMES)}
              className="rounded-xl border border-[#d2ccc1] px-5 py-3.5 font-semibold"
            >
              Reset starter list
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-[#66706d]">{message}</p>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Added" value={added} />
          <Stat label="Already existed" value={exists} />
          <Stat label="Not found" value={missing} />
          <Stat label="Failed" value={failed} />
        </div>

        {results.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-[24px] border border-[#d2ccc1] bg-white shadow-sm">
            <div className="divide-y divide-[#e6e0d6]">
              {results.map((row) => (
                <div
                  key={row.requested}
                  className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{row.requested}</p>
                    {row.matched && row.matched !== row.requested && (
                      <p className="mt-1 text-sm text-[#66706d]">
                        Matched: {row.matched}
                      </p>
                    )}
                    {row.message && (
                      <p className="mt-1 text-sm text-[#66706d]">{row.message}</p>
                    )}
                  </div>

                  <Status status={row.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d2ccc1] bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
        {label}
      </p>
    </div>
  );
}

function Status({
  status,
}: {
  status: ResultRow["status"];
}) {
  const labels = {
    added: "Added",
    exists: "Already existed",
    "not-found": "Not found",
    failed: "Failed",
  };

  return (
    <span className="shrink-0 rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#66706d]">
      {labels[status]}
    </span>
  );
}
