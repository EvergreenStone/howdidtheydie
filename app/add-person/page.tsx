"use client";

import { FormEvent, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AddPersonPage() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<"public" | "private">("public");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [occupation, setOccupation] = useState("");
  const [officialCause, setOfficialCause] = useState("");
  const [officialManner, setOfficialManner] = useState("");
  const [biography, setBiography] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const slug = createSlug(name);

    if (!slug) {
      setStatus("error");
      setMessage("Enter a valid name.");
      return;
    }

    if (!deathDate) {
      setStatus("error");
      setMessage("A death date is required.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus("error");
      setMessage("You must sign in before submitting a person.");
      return;
    }

    const { data: existing } = await supabase
      .from("people")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      setStatus("error");
      setMessage("A person with this name already exists.");
      return;
    }

    const { error } = await supabase.from("people").insert({
      name: name.trim(),
      slug,
      birth_date: birthDate || null,
      death_date: deathDate,
      occupation: occupation.trim() || null,
      biography: biography.trim() || null,
      official_cause: officialCause.trim() || null,
      official_manner: officialManner.trim() || null,
      profile_type: profileType,
      status: "pending",
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push(`/submission-received?slug=${encodeURIComponent(slug)}`);
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
              Official findings. Community analysis. Visible evidence.
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

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
            Add a person
          </p>

          <h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.05em]">
            Create a new profile.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586260]">
            Submit the basic details below. New profiles are saved for review
            before they become publicly searchable.
          </p>

          <div className="mt-8 rounded-[26px] bg-[#1d2a2a] p-7 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#e0aa8c]">
              Before submitting
            </p>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-[#d6dddb]">
              <li>• Confirm the person is deceased.</li>
              <li>• Avoid private contact information.</li>
              <li>• Do not accuse a living person without a credible source.</li>
              <li>• Use the official cause only when it is documented.</li>
              <li>• Duplicate profiles may be merged or removed.</li>
            </ul>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#d2ccc1] bg-white p-7 shadow-[0_20px_55px_rgba(29,42,42,0.08)] md:p-9"
        >
          <div className="grid gap-6">
            <label>
              <span className="text-sm font-semibold">
                Full name <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Example: Robin Williams"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
              {name && (
                <p className="mt-2 text-xs text-[#66706d]">
                  Page address after approval: /person/{createSlug(name)}
                </p>
              )}
            </label>

            <fieldset>
              <legend className="text-sm font-semibold">
                Profile type <span className="text-red-600">*</span>
              </legend>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label
                  className={`cursor-pointer rounded-2xl border p-4 ${
                    profileType === "public"
                      ? "border-[#a65336] bg-[#f8f1ed]"
                      : "border-[#d9d3c7]"
                  }`}
                >
                  <input
                    type="radio"
                    name="profileType"
                    value="public"
                    checked={profileType === "public"}
                    onChange={() => setProfileType("public")}
                    className="accent-[#a65336]"
                  />
                  <span className="ml-3 font-semibold">Public figure</span>
                  <p className="mt-2 text-sm leading-6 text-[#66706d]">
                    A widely known public, historical, or notable person.
                  </p>
                </label>

                <label
                  className={`cursor-pointer rounded-2xl border p-4 ${
                    profileType === "private"
                      ? "border-[#a65336] bg-[#f8f1ed]"
                      : "border-[#d9d3c7]"
                  }`}
                >
                  <input
                    type="radio"
                    name="profileType"
                    value="private"
                    checked={profileType === "private"}
                    onChange={() => setProfileType("private")}
                    className="accent-[#a65336]"
                  />
                  <span className="ml-3 font-semibold">Private person</span>
                  <p className="mt-2 text-sm leading-6 text-[#66706d]">
                    A person who was not broadly known to the public.
                  </p>
                </label>
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">Birth date</span>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>

              <label>
                <span className="text-sm font-semibold">
                  Death date <span className="text-red-600">*</span>
                </span>
                <input
                  type="date"
                  required
                  value={deathDate}
                  onChange={(event) => setDeathDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>
            </div>

            <label>
              <span className="text-sm font-semibold">Occupation or role</span>
              <input
                type="text"
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
                placeholder="Example: Actor and comedian"
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">
                  Official cause of death
                </span>
                <input
                  type="text"
                  value={officialCause}
                  onChange={(event) => setOfficialCause(event.target.value)}
                  placeholder="Leave blank if unknown"
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>

              <label>
                <span className="text-sm font-semibold">Official manner</span>
                <select
                  value={officialManner}
                  onChange={(event) => setOfficialManner(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
                >
                  <option value="">Unknown or not listed</option>
                  <option value="Natural">Natural</option>
                  <option value="Accident">Accident</option>
                  <option value="Suicide">Suicide</option>
                  <option value="Homicide">Homicide</option>
                  <option value="Undetermined">Undetermined</option>
                  <option value="Pending">Pending</option>
                </select>
              </label>
            </div>

            <label>
              <span className="text-sm font-semibold">Short biography</span>
              <textarea
                rows={6}
                value={biography}
                onChange={(event) => setBiography(event.target.value)}
                placeholder="Briefly describe who this person was. Do not include private addresses, phone numbers, or confidential information."
                className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
              />
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
              Your submission will be marked as pending. An administrator can
              review it, check for duplicates, and publish it when appropriate.
            </p>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="mt-7 w-full rounded-xl bg-[#1d2a2a] px-6 py-4 font-semibold text-white transition hover:bg-[#31413f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Submitting..." : "Submit person for review"}
          </button>
        </form>
      </section>
    </main>
  );
}
