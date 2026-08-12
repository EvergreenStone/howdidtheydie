import { createClient } from "@supabase/supabase-js";

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  official_cause: string | null;
  profile_type: string;
  image_url: string | null;
  match_score?: number;
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  let results: SearchResult[] = [];

  if (query) {
    const { data, error } = await supabase.rpc("search_people_smart", {
      search_query: query,
      result_limit: 25,
    });

    if (!error) {
      results = (data ?? []) as SearchResult[];
    } else {
      const { data: fallback } = await supabase
        .from("people")
        .select(
          "id, name, slug, birth_date, death_date, occupation, official_cause, profile_type, image_url",
        )
        .eq("status", "published")
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(25);

      results = (fallback ?? []) as SearchResult[];
    }
  }

  const exactMatch =
    results.length > 0 &&
    results.some((person) => person.name.toLowerCase() === query.toLowerCase());

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-2xl font-bold tracking-[-0.045em]">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs font-medium text-[#66706d]">
              Official findings. Community analysis. Visible evidence.
            </p>
          </a>

          <a
            href="/add-person"
            className="rounded-lg bg-[#1d2a2a] px-5 py-3 text-sm font-semibold text-white"
          >
            + Add person
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-9 sm:px-6 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Search
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Find a person.
        </h1>

        <form
          action="/search"
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#d2ccc1] bg-white p-3 shadow-sm sm:flex-row"
        >
          <input
            name="q"
            type="text"
            required
            defaultValue={query}
            placeholder="Search any person..."
            className="min-w-0 flex-1 rounded-xl border border-[#ded8ce] px-4 py-3.5 outline-none focus:border-[#a65336]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#1d2a2a] px-7 py-3.5 font-semibold text-white"
          >
            Search
          </button>
        </form>

        {query && (
          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-[#66706d]">
                  {exactMatch ? "Results for" : "Closest matches for"}
                </p>
                <h2 className="mt-1 text-3xl font-semibold">“{query}”</h2>
              </div>
              <p className="text-sm text-[#66706d]">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
            </div>

            {!exactMatch && results.length > 0 && (
              <>
                <div className="mt-5 rounded-xl border border-[#e0d8cc] bg-[#efe9df] px-4 py-3 text-sm text-[#66706d]">
                  We didn’t find an exact match, so we’re showing the closest
                  names in the database.
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#d7cec0] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1d2a2a]">
                      Don’t see the person you’re looking for?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#66706d]">
                      Add {query ? `“${query}”` : "them"} to HowDidTheyDie.org. It only takes about a minute.
                    </p>
                  </div>

                  <a
                    href={`/add-person?name=${encodeURIComponent(query)}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#a65336] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#91472f]"
                  >
                    + Add this person
                  </a>
                </div>
              </>
            )}

            {results.length > 0 ? (
              <div className="mt-6 grid gap-4">
                {results.map((person) => (
                  <a
                    key={person.id}
                    href={`/person/${person.slug}`}
                    className="flex items-center gap-5 rounded-2xl border border-[#d2ccc1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {person.image_url ? (
                      <img
                        src={person.image_url}
                        alt={person.name}
                        className="h-20 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1d2a2a] text-lg font-semibold text-white">
                        {initials(person.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold">{person.name}</h3>
                        <span className="rounded-full bg-[#f4f1ea] px-3 py-1 text-xs font-semibold capitalize text-[#66706d]">
                          {person.profile_type}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-[#66706d]">
                        {yearFromDate(person.birth_date)}–
                        {yearFromDate(person.death_date)}
                        {person.occupation ? ` · ${person.occupation}` : ""}
                      </p>

                      <p className="mt-3 text-sm text-[#586260]">
                        Official cause:{" "}
                        <span className="font-semibold">
                          {person.official_cause || "Not yet documented"}
                        </span>
                      </p>
                    </div>

                    <span className="text-xl text-[#a65336]">→</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[26px] border border-[#d2ccc1] bg-white p-8 text-center">
                <h3 className="text-2xl font-semibold">
                  No close profile found.
                </h3>
                <p className="mx-auto mt-3 max-w-xl leading-7 text-[#66706d]">
                  Try another spelling, or create a new profile for this person.
                </p>
                <a
                  href={`/add-person?name=${encodeURIComponent(query)}`}
                  className="mt-6 inline-flex rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white"
                >
                  + Add this person to the database
                </a>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
