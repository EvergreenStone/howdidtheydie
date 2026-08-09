import { createClient } from "@supabase/supabase-js";
import AuthButton from "@/components/AuthButton";

type Person = {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  official_cause: string | null;
  image_url: string | null;
  view_count?: number;
};

function yearFromDate(date: string | null) {
  return date ? date.slice(0, 4) : "Unknown";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function formatCount(value: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const fallbackNames = [
    "Robin Williams",
    "Diane Keaton",
    "Matthew Perry",
    "Michael Jackson",
    "Whitney Houston",
  ];


  const [
    { data: recentData },
    { data: trendingData },
    { data: fallbackData },
    { count: profileCount },
    { count: sourceCount },
    { count: analysisCount },
    { count: voteCount },
  ] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, name, slug, birth_date, death_date, occupation, official_cause, image_url",
      )
      .eq("status", "published")
      .order("imported_at", { ascending: false, nullsFirst: false })
      .limit(6),

    supabase.rpc("get_trending_people", {
      hours_back: 72,
      result_limit: 5,
    }),

    supabase
      .from("people")
      .select(
        "id, name, slug, birth_date, death_date, occupation, official_cause, image_url",
      )
      .eq("status", "published")
      .in("name", fallbackNames),

    supabase
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),

    supabase
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),

    supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),

    supabase
      .from("analysis_votes")
      .select("id", { count: "exact", head: true }),
  ]);

  const recent = (recentData ?? []) as Person[];
  const trending = (trendingData ?? []) as Person[];
  const fallback = (fallbackData ?? []) as Person[];

  const fallbackByName = new Map(
    fallback.map((person) => [person.name, person]),
  );

  const curatedFallback = fallbackNames
    .map((name) => fallbackByName.get(name))
    .filter((person): person is Person => Boolean(person));

  // Use real 72-hour traffic when available. Until then, show recognizable
  // curated profiles rather than random recent imports.
  const popular =
    trending.length > 0 ? trending.slice(0, 4) : curatedFallback.slice(0, 4);

  const popularLabel =
    trending.length > 0 ? "Trending now:" : "Explore profiles:";

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

          <div className="flex items-center gap-3">
            <a
              href="/browse"
              className="hidden text-sm font-semibold text-[#586260] transition hover:text-[#a65336] md:inline"
            >
              Browse
            </a>
            <AuthButton />
          </div>
        </div>
      </header>

      <section className="border-b border-[#d9d3c7]">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:py-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.28fr)_minmax(390px,0.72fr)] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
                Community-reviewed • Evidence-based • Continuously updated
              </p>

              <h1 className="mt-4 whitespace-nowrap text-[3.6rem] font-semibold leading-none tracking-[-0.055em] xl:text-[4rem]">
                How did they <span className="text-[#a65336]">really</span> die?
              </h1>

              <p className="mt-5 max-w-[760px] text-lg leading-8 text-[#586260]">
                Explore official causes of death, reported explanations, community
                analysis, and the evidence behind each claim. Belief and evidence
                are shown separately so you can see what is documented and what
                is debated.
              </p>

              <form
                action="/search"
                className="mt-8 flex max-w-[790px] flex-col gap-2 rounded-2xl border border-[#cfc8bc] bg-white p-2.5 shadow-[0_12px_34px_rgba(29,42,42,0.09)] sm:flex-row"
              >
                <input
                  name="q"
                  type="text"
                  required
                  placeholder="Search any person..."
                  className="min-w-0 flex-1 rounded-xl px-4 py-3.5 text-base outline-none placeholder:text-[#9aa09e]"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#1d2a2a] px-9 py-3.5 font-semibold text-white transition hover:bg-[#31413f]"
                >
                  Search
                </button>
              </form>

              {popular.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm lg:flex-nowrap lg:whitespace-nowrap">
                  <span className="font-semibold text-[#66706d]">
                    {popularLabel}
                  </span>
                  {popular.map((person, index) => (
                    <span key={person.id} className="flex items-center gap-1.5">
                      <a
                        href={`/person/${person.slug}`}
                        className="font-semibold text-[#a65336] hover:underline"
                      >
                        {person.name}
                      </a>
                      {index < popular.length - 1 && (
                        <span className="text-[#aaa39a]">·</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#66706d]">
                <span>✓ Cited sources</span>
                <span>✓ Anonymous voting</span>
                <span>✓ Community reviewed</span>
                <span>✓ Revision history</span>
              </div>
            </div>

            <div className="rounded-[22px] bg-[#1d2a2a] p-5 text-white shadow-[0_16px_38px_rgba(29,42,42,0.13)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e0aa8c]">
                How confidence works
              </p>

              <h2 className="mt-2.5 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em]">
                Facts, opinion, and evidence are shown separately.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#c7d0ce]">
                Official findings stay distinct from community voting and the
                strength of supporting sources.
              </p>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-xl bg-[#344140] p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">Official cause</p>
                    <span className="rounded-full bg-[#5b5b50] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#f0b494]">
                      Confirmed
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#d5dcda]">
                    Medical examiner, public record, or official report
                  </p>
                </div>

                <div className="rounded-xl bg-[#344140] p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">Community confidence</p>
                    <span className="font-semibold text-[#efb999]">68%</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#d5dcda]">
                    Based on signed-in anonymous votes
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#4e5a58]">
                    <div className="h-full w-[68%] rounded-full bg-[#efb999]" />
                  </div>
                </div>

                <div className="rounded-xl bg-[#344140] p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">Evidence strength</p>
                    <span className="font-semibold text-[#efb999]">74/100</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[#d5dcda]">
                    Based on source quality and supporting documentation
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#4e5a58]">
                    <div className="h-full w-[74%] rounded-full bg-[#efb999]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-7">
        <div className="grid gap-4 md:grid-cols-4">
          <Stat value={formatCount(profileCount)} label="Published profiles" />
          <Stat value={formatCount(sourceCount)} label="Cited sources" />
          <Stat value={formatCount(analysisCount)} label="Community analyses" />
          <Stat value={formatCount(voteCount)} label="Verified votes" />
        </div>
      </section>

      <section className="border-y border-[#d9d3c7] bg-[#ebe6dc]">
        <div className="mx-auto max-w-7xl px-6 py-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
                Recently added
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                New profiles in the database
              </h2>
            </div>

            <a href="/search" className="font-semibold text-[#a65336]">
              Search all profiles →
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((person) => (
              <a
                key={person.id}
                href={`/person/${person.slug}`}
                className="group overflow-hidden rounded-[22px] border border-[#d2ccc1] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex gap-4 p-4">
                  {person.image_url ? (
                    <img
                      src={person.image_url}
                      alt={person.name}
                      className="h-24 w-20 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#1d2a2a] text-xl font-semibold text-white">
                      {initials(person.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{person.name}</h3>
                    <p className="mt-1 text-sm text-[#66706d]">
                      {yearFromDate(person.birth_date)}–
                      {yearFromDate(person.death_date)}
                    </p>

                    {person.occupation && (
                      <p className="mt-2 line-clamp-1 text-sm text-[#586260]">
                        {person.occupation}
                      </p>
                    )}

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#a65336]">
                      Official cause
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold">
                      {person.official_cause || "Not yet documented"}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#d2ccc1] bg-white p-5 shadow-sm">
      <p className="text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#66706d]">
        {label}
      </p>
    </div>
  );
}
