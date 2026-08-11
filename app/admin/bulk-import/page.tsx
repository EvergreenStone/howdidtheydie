"use client";

import { useMemo, useRef, useState } from "react";
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

type ImportResponse = {
  people: ImportPerson[];
  requestedLimit: number;
  offset: number;
  year: number;
  returned: number;
  error?: string;
  details?: string;
};

type LogItem = {
  id: number;
  text: string;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function BulkImportPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const currentYear = new Date().getFullYear();

  const [startYear, setStartYear] = useState(1850);
  const [endYear, setEndYear] = useState(currentYear);
  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(1500);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const [currentYearValue, setCurrentYearValue] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);

  const [added, setAdded] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [failedProfiles, setFailedProfiles] = useState(0);
  const [failedRequests, setFailedRequests] = useState(0);
  const [batches, setBatches] = useState(0);

  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([]);

  const pauseRef = useRef(false);
  const stopRef = useRef(false);
  const logIdRef = useRef(0);

  function addLog(text: string) {
    logIdRef.current += 1;
    setLogs((current) => [
      { id: logIdRef.current, text },
      ...current.slice(0, 199),
    ]);
  }

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

  async function waitWhilePaused() {
    while (pauseRef.current && !stopRef.current) {
      await sleep(500);
    }
  }

  async function personAlreadyExists(wikidataId: string) {
    const { data, error } = await supabase
      .from("people")
      .select("id")
      .eq("wikidata_id", wikidataId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function slugExists(slug: string) {
    const { data, error } = await supabase
      .from("people")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function insertOnePerson(
    person: ImportPerson,
    userId: string,
  ): Promise<"added" | "skipped" | "failed"> {
    try {
      if (await personAlreadyExists(person.wikidataId)) {
        addLog(`${person.name}: duplicate Wikidata ID skipped.`);
        return "skipped";
      }

      const baseSlug =
        createSlug(person.name) || person.wikidataId.toLowerCase();

      let slug = baseSlug;

      if (await slugExists(slug)) {
        slug = `${baseSlug}-${person.wikidataId.toLowerCase()}`;
      }

      const row = {
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
        imported_from: "wikidata",
        imported_at: new Date().toISOString(),
        source_url: person.wikipediaUrl || person.wikidataUrl,
      };

      const { error } = await supabase.from("people").insert(row);

      if (!error) {
        return "added";
      }

      // If the first insert collided on the slug despite our check,
      // retry once with an always-unique Wikidata-based slug.
      const fallbackSlug = `${baseSlug}-${person.wikidataId.toLowerCase()}`;

      if (
        error.code === "23505" ||
        error.message.toLowerCase().includes("duplicate")
      ) {
        const { error: retryError } = await supabase.from("people").insert({
          ...row,
          slug: fallbackSlug,
        });

        if (!retryError) {
          addLog(`${person.name}: inserted using fallback slug.`);
          return "added";
        }

        addLog(
          `${person.name} (${person.wikidataId}) FAILED — ${retryError.message} [${retryError.code ?? "no-code"}]`,
        );
        return "failed";
      }

      addLog(
        `${person.name} (${person.wikidataId}) FAILED — ${error.message} [${error.code ?? "no-code"}]`,
      );
      return "failed";
    } catch (error) {
      addLog(
        `${person.name} (${person.wikidataId}) FAILED — ${
          error instanceof Error ? error.message : "Unknown insert error."
        }`,
      );
      return "failed";
    }
  }

  async function importPeople(
    people: ImportPerson[],
    userId: string,
  ): Promise<{
    addedCount: number;
    skippedCount: number;
    failedCount: number;
  }> {
    let addedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const person of people) {
      if (stopRef.current) break;

      await waitWhilePaused();

      const result = await insertOnePerson(person, userId);

      if (result === "added") addedCount += 1;
      if (result === "skipped") skippedCount += 1;
      if (result === "failed") failedCount += 1;
    }

    return { addedCount, skippedCount, failedCount };
  }

  async function runBulkImport() {
    if (running) return;

    if (startYear > endYear) {
      setMessage("Start year must be earlier than or equal to end year.");
      return;
    }

    setRunning(true);
    setPaused(false);
    pauseRef.current = false;
    stopRef.current = false;

    setAdded(0);
    setSkipped(0);
    setFailedProfiles(0);
    setFailedRequests(0);
    setBatches(0);
    setLogs([]);
    setMessage("Bulk import started.");

    try {
      const user = await verifyAdmin();

      for (let year = endYear; year >= startYear; year--) {
        if (stopRef.current) break;

        setCurrentYearValue(year);
        setCurrentOffset(0);
        addLog(`Starting ${year}.`);

        let offset = 0;

        while (!stopRef.current) {
          await waitWhilePaused();
          if (stopRef.current) break;

          setCurrentOffset(offset);

          let data: ImportResponse | null = null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const response = await fetch(
                `/api/wikidata-import?limit=${batchSize}&offset=${offset}&year=${year}`,
                { cache: "no-store" },
              );

              const parsed = (await response.json()) as ImportResponse;

              if (!response.ok) {
                throw new Error(
                  parsed.error ||
                    parsed.details ||
                    `Request failed with ${response.status}.`,
                );
              }

              data = parsed;
              break;
            } catch (error) {
              const text =
                error instanceof Error
                  ? error.message
                  : "Unknown request error.";

              addLog(
                `${year} offset ${offset}: request attempt ${attempt} failed — ${text}`,
              );

              if (attempt === 3) {
                setFailedRequests((current) => current + 1);
                addLog(
                  `${year} offset ${offset}: request skipped after 3 attempts.`,
                );
              } else {
                await sleep(3000 * attempt);
              }
            }
          }

          setBatches((current) => current + 1);

          if (!data) {
            // Important: do not terminate the year just because one request failed.
            offset += batchSize;
            await sleep(delayMs);
            continue;
          }

          if (data.people.length === 0) {
            addLog(`${year} offset ${offset}: no profiles returned; year complete.`);
            break;
          }

          const result = await importPeople(data.people, user.id);

          setAdded((current) => current + result.addedCount);
          setSkipped((current) => current + result.skippedCount);
          setFailedProfiles((current) => current + result.failedCount);

          addLog(
            `${year} offset ${offset}: ${result.addedCount} added, ${result.skippedCount} duplicates, ${result.failedCount} failed profiles.`,
          );

          if (data.returned < batchSize) {
            addLog(`${year}: finished.`);
            break;
          }

          offset += batchSize;
          await sleep(delayMs);
        }
      }

      setMessage(
        stopRef.current ? "Bulk import stopped." : "Bulk import finished.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bulk import could not start.",
      );
    } finally {
      setRunning(false);
      setPaused(false);
      pauseRef.current = false;
    }
  }

  function togglePause() {
    const next = !pauseRef.current;
    pauseRef.current = next;
    setPaused(next);
    setMessage(next ? "Bulk import paused." : "Bulk import resumed.");
  }

  function stopImport() {
    stopRef.current = true;
    pauseRef.current = false;
    setPaused(false);
    setMessage("Stopping after the current operation finishes…");
  }

  const yearCount = Math.max(endYear - startYear + 1, 1);
  const yearsCompleted =
    currentYearValue === null ? 0 : Math.max(endYear - currentYearValue, 0);

  const roughYearProgress = Math.min(
    Math.round((yearsCompleted / yearCount) * 100),
    100,
  );

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="leading-none">
            <p className="text-2xl font-bold tracking-[-0.045em]">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs font-medium text-[#66706d]">
              Bulk Wikidata importer
            </p>
          </a>

          <div className="flex gap-3">
            <a
              href="/admin/import"
              className="rounded-lg border border-[#d2ccc1] px-4 py-2 text-sm font-semibold"
            >
              Single batch
            </a>
            <a
              href="/admin"
              className="rounded-lg border border-[#d2ccc1] px-4 py-2 text-sm font-semibold"
            >
              Admin
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Database seeding
        </p>

        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Bulk import deceased public figures.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#586260]">
          This importer now includes notable deceased people even when Wikidata does not have a structured cause of death. Missing causes can be documented later.
        </p>

        <div className="mt-8 rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-4">
            <label>
              <span className="text-sm font-semibold">Start year</span>
              <input
                type="number"
                min={1800}
                max={currentYear}
                value={startYear}
                disabled={running}
                onChange={(event) => setStartYear(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3 disabled:opacity-60"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">End year</span>
              <input
                type="number"
                min={1800}
                max={currentYear}
                value={endYear}
                disabled={running}
                onChange={(event) => setEndYear(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3 disabled:opacity-60"
              />
            </label>

            <label>
              <span className="text-sm font-semibold">Batch size</span>
              <select
                value={batchSize}
                disabled={running}
                onChange={(event) => setBatchSize(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3 disabled:opacity-60"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-semibold">Delay between batches</span>
              <select
                value={delayMs}
                disabled={running}
                onChange={(event) => setDelayMs(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3 disabled:opacity-60"
              >
                <option value={1000}>1 second</option>
                <option value={1500}>1.5 seconds</option>
                <option value={2500}>2.5 seconds</option>
                <option value={5000}>5 seconds</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!running ? (
              <button
                type="button"
                onClick={() => void runBulkImport()}
                className="rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white"
              >
                Start bulk import
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={togglePause}
                  className="rounded-xl bg-[#1d2a2a] px-6 py-3.5 font-semibold text-white"
                >
                  {paused ? "Resume" : "Pause"}
                </button>

                <button
                  type="button"
                  onClick={stopImport}
                  className="rounded-xl border border-[#c8a79a] px-6 py-3.5 font-semibold text-[#8a3f2b]"
                >
                  Stop
                </button>
              </>
            )}
          </div>

          <p className="mt-5 text-sm leading-6 text-[#66706d]">
            It is safe to rerun years you've already processed. Existing
            Wikidata IDs are skipped automatically.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-[#d9d3c7] bg-white px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label="Added" value={added} />
          <StatCard label="Duplicates" value={skipped} />
          <StatCard label="Failed profiles" value={failedProfiles} />
          <StatCard label="Failed requests" value={failedRequests} />
          <StatCard label="Batches" value={batches} />
          <StatCard
            label="Current position"
            value={
              currentYearValue === null
                ? "—"
                : `${currentYearValue} / ${currentOffset}`
            }
          />
        </div>

        <div className="mt-8 rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Rough year progress</p>
              <p className="mt-1 text-sm text-[#66706d]">
                {currentYearValue === null
                  ? "Not started"
                  : `Working backward through ${startYear}–${endYear}`}
              </p>
            </div>
            <p className="text-2xl font-semibold">{roughYearProgress}%</p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e2ddd4]">
            <div
              className="h-full rounded-full bg-[#a65336] transition-all"
              style={{ width: `${roughYearProgress}%` }}
            />
          </div>
        </div>

        <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
            Import log
          </p>
          <p className="mt-2 text-sm text-[#bdc8c5]">
            Failed people now show their name, Wikidata ID, and actual Supabase
            error.
          </p>

          <div className="mt-5 max-h-[500px] overflow-y-auto rounded-2xl bg-[#263433]">
            {logs.length === 0 ? (
              <p className="p-5 text-sm text-[#bdc8c5]">
                No import activity yet.
              </p>
            ) : (
              <div className="divide-y divide-[#3b4947]">
                {logs.map((log) => (
                  <p
                    key={log.id}
                    className="px-5 py-3 text-sm leading-6 text-[#e6ecea]"
                  >
                    {log.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-[#d2ccc1] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}
