"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
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
  const [profileType, setProfileType] = useState<"public" | "private">("private");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [locationText, setLocationText] = useState("");
  const [occupation, setOccupation] = useState("");
  const [officialCause, setOfficialCause] = useState("");
  const [officialManner, setOfficialManner] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [biography, setBiography] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const suggestedName = params.get("name")?.trim();
    if (suggestedName) setName((current) => current || suggestedName);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const slugBase = createSlug(name);

    if (!slugBase) {
      setStatus("error");
      setMessage("Enter the person’s full name.");
      return;
    }

    if (!deathDate) {
      setStatus("error");
      setMessage("Enter the best-known date of death.");
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
      setMessage("Please sign in before adding a person.");
      return;
    }

    // Check for likely duplicates by name + death date rather than slug alone.
    const { data: possibleDuplicates } = await supabase
      .from("people")
      .select("id, name, slug, death_date")
      .ilike("name", name.trim())
      .eq("death_date", deathDate)
      .limit(3);

    if ((possibleDuplicates ?? []).length > 0) {
      const existing = possibleDuplicates![0];
      setStatus("error");
      setMessage(
        `A profile for ${existing.name} with this death date already exists. Search for the existing profile before creating another one.`,
      );
      return;
    }

    // Same names can belong to different people, so only add a suffix if needed.
    let slug = slugBase;

    const { data: slugOwner } = await supabase
      .from("people")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();

    if (slugOwner) {
      const year = deathDate.slice(0, 4);
      slug = `${slugBase}-${year}`;

      const { data: secondOwner } = await supabase
        .from("people")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (secondOwner) {
        slug = `${slugBase}-${year}-${Date.now().toString().slice(-5)}`;
      }
    }

    const { error } = await supabase.from("people").insert({
      name: name.trim(),
      slug,
      birth_date: birthDate || null,
      death_date: deathDate,
      location_text: locationText.trim() || null,
      occupation: occupation.trim() || null,
      biography: biography.trim() || null,
      official_cause: officialCause.trim() || null,
      official_manner: officialManner.trim() || null,
      submitted_source_url: normalizeUrl(sourceUrl),
      profile_type: profileType,
      status: "pending",
      created_by: user.id,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    router.push("/submission-received");
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold tracking-[-0.045em] sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 max-w-[230px] text-[11px] font-medium leading-4 text-[#66706d] sm:max-w-none sm:text-xs">
              Official findings. Community analysis. Visible evidence.
            </p>
          </a>

          <a
            href="/"
            className="shrink-0 rounded-lg border border-[#d2ccc1] px-3 py-2 text-sm font-semibold sm:px-4"
          >
            Back
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[28px] bg-[#1d2a2a] px-5 py-7 text-white sm:px-8 sm:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#efb999]">
            Help build the database
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
            Add anyone who has died.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#d6dddb] sm:text-lg">
            Famous or not. Start with what you know. If the cause of death is
            unknown, leave it blank — the community can add sources and analysis later.
          </p>
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <aside className="order-2 lg:order-1">
            <div className="rounded-[24px] border border-[#d2ccc1] bg-white p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a65336]">
                What you need
              </p>

              <div className="mt-5 space-y-4">
                <Step number="1" title="Who was the person?">
                  Their name and best-known date of death.
                </Step>
                <Step number="2" title="Help us identify the right person.">
                  Add a city/state, obituary link, occupation, or other basic context if you know it.
                </Step>
                <Step number="3" title="Cause unknown? That’s okay.">
                  Never guess. Leave it blank and let documented sources and community analysis build the record.
                </Step>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[#ebe6dc] p-5 sm:p-6">
              <p className="font-semibold">Privacy & accuracy</p>
              <p className="mt-2 text-sm leading-6 text-[#66706d]">
                Do not include home addresses, phone numbers, private medical records,
                or unsupported accusations. New profiles are reviewed before publication.
              </p>
            </div>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="order-1 rounded-[28px] border border-[#d2ccc1] bg-white p-5 shadow-[0_20px_55px_rgba(29,42,42,0.08)] sm:p-7 lg:order-2"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#ece7de] pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                  Start a profile
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Basic information
                </h2>
              </div>
              <span className="rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-semibold text-[#66706d]">
                Takes about 1 minute
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              <label>
                <span className="text-sm font-semibold">
                  Full name <span className="text-[#a65336]">*</span>
                </span>
                <input
                  autoFocus
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: John Robert Smith"
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold">Birth date</span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                  />
                  <p className="mt-1.5 text-xs text-[#7a817f]">Optional</p>
                </label>

                <label>
                  <span className="text-sm font-semibold">
                    Date of death <span className="text-[#a65336]">*</span>
                  </span>
                  <input
                    type="date"
                    required
                    value={deathDate}
                    onChange={(event) => setDeathDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                  />
                  <p className="mt-1.5 text-xs text-[#7a817f]">Use the best-known date.</p>
                </label>
              </div>

              <label>
                <span className="text-sm font-semibold">City / state / country</span>
                <input
                  type="text"
                  value={locationText}
                  onChange={(event) => setLocationText(event.target.value)}
                  placeholder="Example: Phoenix, Arizona"
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
                <p className="mt-1.5 text-xs text-[#7a817f]">
                  Helps distinguish people with the same name. Do not enter a street address.
                </p>
              </label>

              <fieldset>
                <legend className="text-sm font-semibold">Who was this person?</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                    <span className="ml-3 font-semibold">Everyday person</span>
                    <p className="mt-2 text-sm leading-6 text-[#66706d]">
                      A family member, friend, local person, or someone not broadly famous.
                    </p>
                  </label>

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
                    <span className="ml-3 font-semibold">Public / notable person</span>
                    <p className="mt-2 text-sm leading-6 text-[#66706d]">
                      A celebrity, politician, athlete, historical figure, or other widely known person.
                    </p>
                  </label>
                </div>
              </fieldset>

              <label>
                <span className="text-sm font-semibold">Obituary or source link</span>
                <input
                  type="text"
                  inputMode="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="Example: funeralhome.com/obituary/..."
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
                <p className="mt-1.5 text-xs text-[#7a817f]">
                  Strongly recommended for an everyday person. A funeral-home obituary,
                  newspaper notice, or other public source is ideal.
                </p>
              </label>

              <label>
                <span className="text-sm font-semibold">Occupation or identifying role</span>
                <input
                  type="text"
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value)}
                  placeholder="Example: Teacher, father of three, retired firefighter"
                  className="mt-2 w-full rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>

              <div className="rounded-2xl border border-[#dfd8cd] bg-[#f8f6f1] p-4 sm:p-5">
                <p className="font-semibold">What was the reported cause?</p>
                <p className="mt-1 text-sm leading-6 text-[#66706d]">
                  Only enter this if a public source actually states it. Otherwise leave it blank.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold">Reported / official cause</span>
                    <input
                      type="text"
                      value={officialCause}
                      onChange={(event) => setOfficialCause(event.target.value)}
                      placeholder="Leave blank if unknown"
                      className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold">Reported manner</span>
                    <select
                      value={officialManner}
                      onChange={(event) => setOfficialManner(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3.5 outline-none focus:border-[#a65336]"
                    >
                      <option value="">Unknown / not stated</option>
                      <option value="Natural">Natural</option>
                      <option value="Accident">Accident</option>
                      <option value="Suicide">Suicide</option>
                      <option value="Homicide">Homicide</option>
                      <option value="Undetermined">Undetermined</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </label>
                </div>
              </div>

              <label>
                <span className="text-sm font-semibold">Who was this person?</span>
                <textarea
                  rows={4}
                  value={biography}
                  onChange={(event) => setBiography(event.target.value)}
                  placeholder="Optional short description to help identify the correct person."
                  className="mt-2 w-full resize-y rounded-xl border border-[#d9d3c7] px-4 py-3.5 outline-none focus:border-[#a65336]"
                />
              </label>
            </div>

            {message && (
              <div className="mt-6 rounded-xl bg-[#f6e7e2] px-4 py-3 text-sm text-[#8a3f2b]">
                {message}
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-[#f4f1ea] p-4">
              <p className="text-sm font-semibold">After you submit</p>
              <p className="mt-1.5 text-sm leading-6 text-[#66706d]">
                The profile goes to the review queue. Once published, people can add
                sources, corrections, and competing analyses of how the person died.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-6 w-full rounded-xl bg-[#a65336] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#91472f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Submitting…" : "Add this person for review"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a65336] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#66706d]">{children}</p>
      </div>
    </div>
  );
}
