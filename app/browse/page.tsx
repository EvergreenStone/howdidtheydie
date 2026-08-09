import { createClient } from "@supabase/supabase-js";

type Person = {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  official_cause: string | null;
  image_url: string | null;
  imported_at: string | null;
};

type TrendingPerson = Person & {
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

function decadeBounds(decade: string | undefined) {
  if (!decade || decade === "all") return null;

  const start = Number(decade);
  if (!Number.isFinite(start)) return null;

  return {
    start: `${start}-01-01`,
    end: `${start + 10}-01-01`,
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    sort?: string;
    decade?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const sort =
    params.sort === "alpha" || params.sort === "added"
      ? params.sort
      : "death";

  const decade = params.decade ?? "all";
  const page = Math.max(Number(params.page || "1") || 1, 1);

  const pageSize = 24;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  let query = supabase
    .from("people")
    .select(
      "id, name, slug, birth_date, death_date, occupation, official_cause, image_url, imported_at",
      { count: "exact" },
    )
    .eq("status", "published");

  const bounds = decadeBounds(decade);

  if (bounds) {
    query = query
      .gte("death_date", bounds.start)
      .lt("death_date", bounds.end);
  }

  if (sort === "alpha") {
    query = query.order("name", { ascending: true });
  } else if (sort === "added") {
    query = query.order("imported_at", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("death_date", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const [
    { data: peopleData, count },
    { data: trendingData },
  ] = await Promise.all([
    query.range(from, to),

    supabase.rpc("get_trending_people", {
      hours_back: 72,
      result_limit: 6,
    }),
  ]);

  const people = (peopleData ?? []) as Person[];
  const trending = (trendingData ?? []) as TrendingPerson[];

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const decades = [
    2020, 2010, 2000, 1990, 1980, 1970, 1960,
    1950, 1940, 1930, 1920, 1910, 1900,
  ];

  function buildHref(nextPage: number) {
    const search = new URLSearchParams();
    search.set("sort", sort);
    if (decade !== "all") search.set("decade", decade);
    search.set("page", String(nextPage));
    return `/browse?${search.toString()}`;
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
            className="text-sm font-semibold text-[#586260] hover:text-[#a65336]"
          >
            Home
          </a>
        </div>
      </header>

      <section className="border-b border-[#d9d3c7]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
            Browse the database
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-5xl font-semibold tracking-[-0.05em]">
                Explore notable deaths.
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#586260]">
                Browse published profiles by recent deaths, newest additions,
                alphabetically, or by decade.
              </p>
            </div>

            <form
              action="/search"
              className="flex w-full max-w-xl gap-2 rounded-2xl border border-[#d2ccc1] bg-white p-2 shadow-sm"
            >
              <input
                name="q"
                required
                placeholder="Search a name..."
                className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#1d2a2a] px-6 py-3 font-semibold text-white"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {trending.length > 0 && (
        <section className="border-b border-[#d9d3c7] bg-[#ebe6dc]">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
                  Trending now
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Most-viewed profiles in the last 72 hours
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((person) => (
                <a
                  key={person.id}
                  href={`/person/${person.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-[#d2ccc1] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {person.image_url ? (
                    <img
                      src={person.image_url}
                      alt={person.name}
                      className="h-16 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1d2a2a] text-sm font-semibold text-white">
                      {initials(person.name)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-semibold">{person.name}</p>
                    <p className="mt-1 text-sm text-[#66706d]">
                      {yearFromDate(person.birth_date)}–
                      {yearFromDate(person.death_date)}
                    </p>
                    {typeof person.view_count === "number" && (
                      <p className="mt-1 text-xs font-semibold text-[#a65336]">
                        {person.view_count} views
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <form
          action="/browse"
          className="rounded-[24px] border border-[#d2ccc1] bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label>
              <span className="text-sm font-semibold">Sort by</span>
              <select
                name="sort"
                defaultValue={sort}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3"
              >
                <option value="death">Most recent deaths</option>
                <option value="added">Recently added</option>
                <option value="alpha">A–Z</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-semibold">Decade of death</span>
              <select
                name="decade"
                defaultValue={decade}
                className="mt-2 w-full rounded-xl border border-[#d9d3c7] bg-white px-4 py-3"
              >
                <option value="all">All decades</option>
                {decades.map((value) => (
                  <option key={value} value={value}>
                    {value}s
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-xl bg-[#a65336] px-6 py-3 font-semibold text-white"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#66706d]">
              {total.toLocaleString("en-US")} published{" "}
              {total === 1 ? "profile" : "profiles"}
            </p>
          </div>

          <p className="text-sm text-[#66706d]">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
        </div>

        {people.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <a
                key={person.id}
                href={`/person/${person.slug}`}
                className="group rounded-[22px] border border-[#d2ccc1] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex gap-4">
                  {person.image_url ? (
                    <img
                      src={person.image_url}
                      alt={person.name}
                      className="h-28 w-24 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#1d2a2a] text-xl font-semibold text-white">
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
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#586260]">
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
        ) : (
          <div className="mt-6 rounded-[26px] border border-[#d2ccc1] bg-white p-8 text-center">
            <h2 className="text-2xl font-semibold">
              No profiles match those filters.
            </h2>
            <a
              href="/browse"
              className="mt-5 inline-flex rounded-xl bg-[#1d2a2a] px-6 py-3 font-semibold text-white"
            >
              Clear filters
            </a>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-[#d9d3c7] pt-6">
            {page > 1 ? (
              <a
                href={buildHref(page - 1)}
                className="rounded-xl border border-[#d2ccc1] bg-white px-5 py-3 font-semibold"
              >
                ← Previous
              </a>
            ) : (
              <span />
            )}

            {page < totalPages && (
              <a
                href={buildHref(page + 1)}
                className="rounded-xl bg-[#1d2a2a] px-5 py-3 font-semibold text-white"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
