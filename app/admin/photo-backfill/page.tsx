"use client";

import { useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Person = {
  id: string;
  name: string;
  wikidata_id: string | null;
};

type PhotoResponse = {
  found?: boolean;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  author?: string | null;
  license?: string | null;
  licenseUrl?: string | null;
  attributionRequired?: boolean;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PhotoBackfillPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState(0);
  const [added, setAdded] = useState(0);
  const [missing, setMissing] = useState(0);
  const [failed, setFailed] = useState(0);
  const [current, setCurrent] = useState("—");
  const [logs, setLogs] = useState<string[]>([]);
  const stopRef = useRef(false);

  async function verifyAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in first.");

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role !== "admin") throw new Error("Admin access required.");
  }

  async function nextBatch() {
    const { data, error } = await supabase
      .from("people")
      .select("id, name, wikidata_id")
      .not("wikidata_id", "is", null)
      .is("image_url", null)
      .is("image_imported_at", null)
      .limit(25);

    if (error) throw error;
    return (data ?? []) as Person[];
  }

  async function run() {
    if (running) return;

    setRunning(true);
    setChecked(0);
    setAdded(0);
    setMissing(0);
    setFailed(0);
    setLogs([]);
    stopRef.current = false;

    try {
      await verifyAdmin();

      while (!stopRef.current) {
        const batch = await nextBatch();
        if (batch.length === 0) break;

        for (const person of batch) {
          if (stopRef.current) break;

          setCurrent(person.name);

          try {
            const response = await fetch(
              `/api/wikimedia-photo?qid=${encodeURIComponent(person.wikidata_id!)}`,
              { cache: "no-store" },
            );

            const result = (await response.json()) as PhotoResponse;
            setChecked((v) => v + 1);

            if (!response.ok) throw new Error(result.error || "Lookup failed.");

            if (!result.found || !result.imageUrl) {
              setMissing((v) => v + 1);
              setLogs((v) => [`${person.name}: no photo found.`, ...v].slice(0, 150));

              const { error } = await supabase
                .from("people")
                .update({
                  image_imported_from: "wikimedia-none",
                  image_imported_at: new Date().toISOString(),
                })
                .eq("id", person.id);

              if (error) throw error;
            } else {
              const { error } = await supabase
                .from("people")
                .update({
                  image_url: result.imageUrl,
                  image_source_url: result.sourceUrl,
                  image_author: result.author,
                  image_license: result.license,
                  image_license_url: result.licenseUrl,
                  image_attribution_required: Boolean(result.attributionRequired),
                  image_imported_from: "wikimedia",
                  image_imported_at: new Date().toISOString(),
                })
                .eq("id", person.id);

              if (error) throw error;

              setAdded((v) => v + 1);
              setLogs((v) => [`${person.name}: photo added.`, ...v].slice(0, 150));
            }
          } catch (error) {
            setFailed((v) => v + 1);
            setLogs((v) => [
              `${person.name}: FAILED — ${error instanceof Error ? error.message : "Unknown error."}`,
              ...v,
            ].slice(0, 150));

            await supabase
              .from("people")
              .update({
                image_imported_from: "wikimedia-error",
                image_imported_at: new Date().toISOString(),
              })
              .eq("id", person.id);
          }

          await sleep(700);
        }
      }
    } finally {
      setRunning(false);
      setCurrent("—");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Profile photos
        </p>

        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
          Wikimedia photo backfill.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#586260]">
          This checks imported profiles, finds the primary Wikidata image when available,
          and saves the Wikimedia source, author, license, and attribution information.
        </p>

        <div className="mt-8 flex gap-3">
          {!running ? (
            <button
              onClick={() => void run()}
              className="rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white"
            >
              Start photo backfill
            </button>
          ) : (
            <button
              onClick={() => { stopRef.current = true; }}
              className="rounded-xl border border-[#c8a79a] px-6 py-3.5 font-semibold text-[#8a3f2b]"
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Checked", checked],
            ["Photos added", added],
            ["No photo", missing],
            ["Failed", failed],
            ["Current", current],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-[#d2ccc1] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
            Photo log
          </p>
          <div className="mt-5 max-h-[480px] overflow-y-auto rounded-2xl bg-[#263433]">
            {logs.length === 0 ? (
              <p className="p-5 text-sm text-[#bdc8c5]">No activity yet.</p>
            ) : (
              logs.map((log, i) => (
                <p key={i} className="border-b border-[#3b4947] px-5 py-3 text-sm">
                  {log}
                </p>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
