"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ImportPerson = {
  wikidataId: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  name: string;
  birthDate: string | null;
  deathDate: string;
  occupation: string | null;
  officialCause: string | null;
  officialManner: string | null;
};

type ImportResponse = {
  people: ImportPerson[];
  requestedLimit: number;
  offset: number;
  year: number;
  returned: number;
  error?: string;
  details?: string;
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function WikidataImportPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const currentYear = new Date().getFullYear();

  const [batchSize, setBatchSize] = useState(10);
  const [year, setYear] = useState(currentYear);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "importing" | "error"
  >("idle");
  const [preview, setPreview] = useState<ImportPerson[]>([]);
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

  async function loadPreview() {
    setStatus("loading");
    setMessage("");
    setPreview([]);

    try {
      await verifyAdmin();

      const response = await fetch(
        `/api/wikidata-import?limit=${batchSize}&offset=${offset}&year=${year}`,
      );

      const data = (await response.json()) as ImportResponse;

      if (!response.ok) {
        throw new Error(data.error || data.details || "Import preview failed.");
      }

      setPreview(data.people);
      setStatus("idle");

      if (data.people.length === 0) {
        setMessage(
          `No matching profiles were returned for ${year} in this batch.`,
        );
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not load preview.",
      );
    }
  }

  async function importBatch() {
    setStatus("importing");
    setMessage("");

    try {
      const user = await verifyAdmin();

      if (preview.length === 0) {
        throw new Error("Load a preview before importing.");
      }

      const qids = preview.map((person) => person.wikidataId);

      const { data: existingByQid, error: existingError } = await supabase
        .from("people")
        .select("wikidata_id")
        .in("wikidata_id", qids);

      if (existingError) throw existingError;

      const existingQids = new Set(
        (existingByQid ?? [])
          .map((row) => row.wikidata_id)
          .filter(Boolean),
      );

      const { data: allSlugs, error: slugError } = await supabase
        .from("people")
        .select("slug");

      if (slugError) throw slugError;

      const usedSlugs = new Set((allSlugs ?? []).map((row) => row.slug));

      const rows = preview
        .filter((person) => !existingQids.has(person.wikidataId))
        .map((person) => {
          const baseSlug = createSlug(person.name);
          let slug = baseSlug || person.wikidataId.toLowerCase();

          if (usedSlugs.has(slug)) {
            slug = `${slug}-${person.wikidataId.toLowerCase()}`;
          }

          usedSlugs.add(slug);

          return {
            name: person.name,
            slug,
            birth_date: person.birthDate,
            death_date: person.deathDate,
            occupation: person.occupation,
            biography: null,
            official_cause: person.officialCause,
            official_manner: person.officialManner,
            profile_type: "public",
            status: "published",
            created_by: user.id,
            published_at: new Date().toISOString(),
            wikidata_id: person.wikidataId,
            imported_from: "wikidata",
            imported_at: new Date().toISOString(),
            source_url: person.wikipediaUrl || person.wikidataUrl,
          };
        });

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("people")
          .insert(rows);

        if (insertError) throw insertError;
      }

      const skipped = preview.length - rows.length;

      setStatus("idle");
      setMessage(
        `Import complete: ${rows.length} added, ${skipped} skipped as duplicates.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  function nextBatch() {
    setOffset((current) => current + batchSize);
    setPreview([]);
    setMessage("");
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
              Wikidata importer
            </p>
          </a>

          <a
            href="/admin"
            className="rounded-lg border border-[#d2ccc1] px-4 py-2 text-sm font-semibold"
          >
            Back to admin
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Database seeding
        </p>

        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Import notable deaths.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#586260]">
          Import deceased public figures with an English Wikipedia article and a
          structured cause of death in Wikidata. The importer now searches one
          year at a time so Wikidata can respond much faster.
        </p>

        <div className="mt-8 rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <label>
              <span className="text-sm font-semibold">Year</span>
              <input
                type="number"
                min={1900}
                max={currentYear}
                value={year}
                onChange={(event) => {
                  setYear(Number(event.target.value));
                  setOffset(0);
                  setPreview([]);
                }}
                className="mt-2 block w-32 rounded-xl border border-[#d9d3c7] px-4 py-3"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Batch size</span>
              <select
                value={batchSize}
                onChange={(event) => {
                  setBatchSize(Number(event.target.value));
                  setOffset(0);
                  setPreview([]);
                }}
                className="mt-2 block rounded-xl border border-[#d9d3c7] bg-white px-4 py-3"
              >
                <option value={10}>10 people</option>
                <option value={25}>25 people</option>
                <option value={50}>50 people</option>
              </select>
            </label>

            <div>
              <p className="text-sm font-semibold">Batch offset</p>
              <p className="mt-2 rounded-xl bg-[#f4f1ea] px-4 py-3 text-sm">
                {offset}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={status === "loading" || status === "importing"}
              className="rounded-xl bg-[#1d2a2a] px-6 py-3 font-semibold text-white disabled:opacity-60"
            >
              {status === "loading" ? "Loading…" : "Load preview"}
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-xl px-4 py-3 text-sm ${
              status === "error"
                ? "bg-[#f6e7e2] text-[#8a3f2b]"
                : "bg-[#e8efe9] text-[#315a46]"
            }`}
          >
            {message}
          </div>
        )}

        {preview.length > 0 && (
          <>
            <div className="mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-[#66706d]">
                  {year} preview
                </p>
                <h2 className="mt-1 text-3xl font-semibold">
                  {preview.length} profiles ready
                </h2>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={nextBatch}
                  className="rounded-xl border border-[#d2ccc1] bg-white px-5 py-3 font-semibold"
                >
                  Next batch
                </button>

                <button
                  type="button"
                  onClick={() => void importBatch()}
                  disabled={status === "importing"}
                  className="rounded-xl bg-[#a65336] px-6 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {status === "importing"
                    ? "Importing…"
                    : `Import ${preview.length} profiles`}
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[26px] border border-[#d2ccc1] bg-white">
              <div className="max-h-[620px] overflow-y-auto">
                {preview.map((person) => (
                  <div
                    key={person.wikidataId}
                    className="border-b border-[#ece7de] p-5 last:border-b-0"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">
                            {person.name}
                          </h3>
                          <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-semibold text-[#66706d]">
                            {person.wikidataId}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-[#66706d]">
                          {person.birthDate || "Unknown birth date"} –{" "}
                          {person.deathDate}
                        </p>

                        {person.occupation && (
                          <p className="mt-2 text-sm text-[#586260]">
                            {person.occupation}
                          </p>
                        )}
                      </div>

                      <div className="sm:max-w-md sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                          Cause of death
                        </p>
                        <p className="mt-1 font-semibold">
                          {person.officialCause || "Not provided"}
                        </p>

                        {person.officialManner && (
                          <p className="mt-1 text-sm text-[#66706d]">
                            Manner: {person.officialManner}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
