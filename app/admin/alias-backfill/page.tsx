"use client";

import { useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type PersonRow = {
  id: string;
  name: string;
  wikidata_id: string;
  aliases: string[] | null;
};

export default function AliasBackfillPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const stopRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(0);
  const [updated, setUpdated] = useState(0);
  const [noAliases, setNoAliases] = useState(0);
  const [failed, setFailed] = useState(0);
  const [current, setCurrent] = useState("");
  const [log, setLog] = useState<string[]>([]);

  function addLog(message: string) {
    setLog((items) => [message, ...items].slice(0, 250));
  }

  async function verifyAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Sign in first.");

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || data?.role !== "admin") {
      throw new Error("Administrator access required.");
    }
  }

  async function start() {
    if (running) return;

    stopRef.current = false;
    setRunning(true);
    setChecked(0);
    setUpdated(0);
    setNoAliases(0);
    setFailed(0);
    setCurrent("");
    setLog([]);

    try {
      await verifyAdmin();

      while (!stopRef.current) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, wikidata_id, aliases")
          .eq("status", "published")
          .not("wikidata_id", "is", null)
          .eq("aliases", [])
          .order("id", { ascending: true })
          .limit(25);

        if (error) throw error;

        const rows = (data ?? []) as PersonRow[];

        if (rows.length === 0) {
          addLog("Finished — no more Wikidata profiles are missing aliases.");
          break;
        }

        const response = await fetch("/api/wikidata-aliases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qids: rows.map((row) => row.wikidata_id),
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || `Alias request failed with ${response.status}.`);
        }

        const aliasMap = (payload?.aliases ?? {}) as Record<string, string[]>;

        for (const row of rows) {
          if (stopRef.current) break;

          setCurrent(row.name);

          const aliases = Array.from(
            new Set(
              (aliasMap[row.wikidata_id] ?? [])
                .map((alias) => alias.trim())
                .filter(Boolean)
                .filter(
                  (alias) => alias.toLowerCase() !== row.name.toLowerCase(),
                ),
            ),
          );

          try {
            // A private marker prevents no-alias rows from being fetched forever.
            // Search will never naturally match this marker.
            const stored =
              aliases.length > 0 ? aliases : ["__NO_ENGLISH_ALIASES__"];

            const { error: updateError } = await supabase
              .from("people")
              .update({ aliases: stored })
              .eq("id", row.id);

            if (updateError) throw updateError;

            if (aliases.length > 0) {
              setUpdated((value) => value + 1);
              addLog(`${row.name}: ${aliases.length} aliases added`);
            } else {
              setNoAliases((value) => value + 1);
              addLog(`${row.name}: no English aliases`);
            }
          } catch (error) {
            setFailed((value) => value + 1);
            addLog(
              `${row.name}: FAILED — ${
                error instanceof Error ? error.message : "unknown error"
              }`,
            );
          }

          setChecked((value) => value + 1);
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (error) {
      addLog(
        `STOPPED — ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    } finally {
      setCurrent("");
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs text-[#66706d]">Alias backfill</p>
          </a>
          <a href="/admin" className="text-sm font-semibold text-[#a65336]">
            Admin →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
          Search quality
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Backfill Wikidata aliases.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#586260]">
          Adds English alternate names, legal names, stage names, and other aliases
          to existing imported profiles so visitors can find people using the names
          they actually know.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {!running ? (
            <button
              type="button"
              onClick={() => void start()}
              className="rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white"
            >
              Start alias backfill
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopRef.current = true;
              }}
              className="rounded-xl border border-[#a65336] px-6 py-3.5 font-semibold text-[#a65336]"
            >
              Stop
            </button>
          )}

          <a
            href="/admin"
            className="rounded-xl border border-[#d2ccc1] bg-white px-6 py-3.5 font-semibold"
          >
            Back to admin
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-5">
          <Stat label="Checked" value={checked} />
          <Stat label="Aliases added" value={updated} />
          <Stat label="No aliases" value={noAliases} />
          <Stat label="Failed" value={failed} />
          <div className="rounded-2xl border border-[#d2ccc1] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
              Current
            </p>
            <p className="mt-3 font-semibold">{current || "—"}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] bg-[#1d2a2a] p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#efb999]">
            Alias log
          </p>
          <div className="mt-4 max-h-[480px] overflow-y-auto rounded-xl bg-[#2d3938]">
            {log.length === 0 ? (
              <p className="p-4 text-sm text-[#cbd4d2]">Nothing yet.</p>
            ) : (
              log.map((item, index) => (
                <p
                  key={`${item}-${index}`}
                  className="border-b border-[#46514f] px-4 py-3 text-sm text-[#e6ecea]"
                >
                  {item}
                </p>
              ))
            )}
          </div>
        </div>
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
