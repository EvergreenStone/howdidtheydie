"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";

type Person = {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  biography: string | null;
  official_cause: string | null;
  official_manner: string | null;
};

const fields = [
  { value: "name", label: "Name" },
  { value: "birth_date", label: "Birth date" },
  { value: "death_date", label: "Death date" },
  { value: "occupation", label: "Occupation / role" },
  { value: "biography", label: "Biography" },
  { value: "official_cause", label: "Official cause of death" },
  { value: "official_manner", label: "Official manner of death" },
];

export default function SuggestCorrectionPage() {
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
  const [fieldName, setFieldName] = useState("official_cause");
  const [proposedValue, setProposedValue] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPerson() {
      const { data, error } = await supabase
        .from("people")
        .select(
          "id, name, slug, birth_date, death_date, occupation, biography, official_cause, official_manner",
        )
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

  function currentValue() {
    if (!person) return "";
    const value = person[fieldName as keyof Person];
    return typeof value === "string" ? value : "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!person) return;

    setStatus("submitting");
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("error");
      setMessage("You must sign in before suggesting a correction.");
      return;
    }

    const { error } = await supabase.from("corrections").insert({
      person_id: person.id,
      field_name: fieldName,
      current_value: currentValue() || null,
      proposed_value: proposedValue.trim(),
      reason: reason.trim(),
      status: "pending",
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push(
      `/correction-submission-received?person=${encodeURIComponent(
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
              Suggest a correction
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
            Correction request
          </p>

          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
            Suggest an edit.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586260]">
            {person
              ? `Propose a correction to ${person.name}'s published profile.`
              : "Loading profile…"}
          </p>

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Correction standards
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• Explain exactly what should change.</li>
              <li>• Use documented information for official facts.</li>
              <li>• Do not use corrections to submit theories or speculation.</li>
              <li>• Administrators review every correction before anything changes.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-8 shadow-[0_20px_55px_rgba(29,42,42,0.08)]"
        >
          <label>
            <span className="text-sm font-semibold">
              What needs correcting? <span className="text-red-600">*</span>
            </span>
            <select
              value={fieldName}
              onChange={(event) => setFieldName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
            >
              {fields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-6 rounded-2xl bg-[#f4f1ea] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
              Current value
            </p>
            <p className="mt-2 whitespace-pre-wrap font-medium">
              {currentValue() || "Not currently provided"}
            </p>
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-semibold">
              Proposed value <span className="text-red-600">*</span>
            </span>
            <textarea
              required
              rows={5}
              value={proposedValue}
              onChange={(event) => setProposedValue(event.target.value)}
              placeholder="Enter the corrected information."
              className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-sm font-semibold">
              Why should this be changed? <span className="text-red-600">*</span>
            </span>
            <textarea
              required
              minLength={15}
              rows={6}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain the reason for the correction and where the corrected information comes from."
              className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
            />
          </label>

          {message && (
            <div className="mt-6 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status !== "ready"}
            className="mt-7 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white disabled:opacity-60"
          >
            {status === "submitting"
              ? "Submitting…"
              : "Submit correction for review"}
          </button>
        </form>
      </section>
    </main>
  );
}
