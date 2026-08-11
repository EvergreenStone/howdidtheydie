import { createClient } from "@supabase/supabase-js";

const MUST_HAVE = [
  "Michael Jackson",
  "Elvis Presley",
  "Princess Diana",
  "Whitney Houston",
  "Robin Williams",
  "Kobe Bryant",
  "Matthew Perry",
  "Prince",
  "David Bowie",
  "George Michael",
  "Aretha Franklin",
  "Tina Turner",
  "Betty White",
  "Bob Saget",
  "James Gandolfini",
  "Heath Ledger",
  "Paul Walker",
  "Carrie Fisher",
  "Debbie Reynolds",
  "Joan Rivers",
  "Alan Rickman",
  "Chadwick Boseman",
  "James Earl Jones",
  "Maggie Smith",
  "Sean Connery",
  "Gene Wilder",
  "Patrick Swayze",
  "Farrah Fawcett",
  "Steve Jobs",
  "Muhammad Ali",
  "John F. Kennedy",
  "John Lennon",
  "Freddie Mercury",
  "Marilyn Monroe",
  "Audrey Hepburn",
  "Lucille Ball",
  "Frank Sinatra",
  "Dean Martin",
  "Johnny Cash",
  "June Carter Cash",
  "Ray Charles",
  "James Brown",
  "Tupac Shakur",
  "The Notorious B.I.G.",
  "Nipsey Hussle",
  "Mac Miller",
  "DMX",
  "Coolio",
  "Olivia Newton-John",
  "Suzanne Somers",
];

type AuditRow = {
  requested_name: string;
  found_name: string | null;
  slug: string | null;
  match_score: number | null;
  found: boolean;
};

export const dynamic = "force-dynamic";

export default async function FamousAuditPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data, error } = await supabase.rpc("audit_people", {
    search_names: MUST_HAVE,
  });

  const rows = (data ?? []) as AuditRow[];
  const missing = rows.filter((row) => !row.found);
  const found = rows.filter((row) => row.found);

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs text-[#66706d]">Famous-profile audit</p>
          </a>
          <a href="/admin" className="text-sm font-semibold text-[#a65336]">
            Admin →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
          Search reliability
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Must-have famous profiles.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#586260]">
          This checks a starter list of highly recognizable deceased public figures
          against the same smart search visitors use. Missing rows should be repaired
          before broad promotion.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-[#c98d7a] bg-white p-4 text-sm">
            Audit could not run: {error.message}. Make sure the search-reliability
            SQL has been run first.
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Checked" value={rows.length || MUST_HAVE.length} />
          <Stat label="Found" value={found.length} />
          <Stat label="Missing" value={missing.length} />
        </div>

        {missing.length > 0 && (
          <div className="mt-8 rounded-[24px] border border-[#d2ccc1] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a65336]">
              Needs attention
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {missing.map((row) => (
                <div key={row.requested_name} className="rounded-xl bg-[#f4f1ea] p-4">
                  <p className="font-semibold">{row.requested_name}</p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <a
                      href={`/search?q=${encodeURIComponent(row.requested_name)}`}
                      className="font-semibold text-[#a65336]"
                    >
                      Test search
                    </a>
                    <a href="/add-person" className="font-semibold text-[#586260]">
                      Add person
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-[24px] border border-[#d2ccc1] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#66706d]">
            Found
          </p>
          <div className="mt-4 divide-y divide-[#e4ded4]">
            {found.map((row) => (
              <div
                key={row.requested_name}
                className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold">{row.requested_name}</p>
                  {row.found_name !== row.requested_name && (
                    <p className="mt-1 text-sm text-[#66706d]">
                      Matched to {row.found_name}
                    </p>
                  )}
                </div>
                {row.slug && (
                  <a
                    href={`/person/${row.slug}`}
                    className="text-sm font-semibold text-[#a65336]"
                  >
                    Open profile →
                  </a>
                )}
              </div>
            ))}
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
