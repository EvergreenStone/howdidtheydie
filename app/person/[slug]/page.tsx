import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import AuthButton from "@/components/AuthButton";
import VotePanel from "@/components/VotePanel";
import SourceQuality from "@/components/SourceQuality";
import ProfileViewTracker from "@/components/ProfileViewTracker";

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
  profile_type: string;
  status: string;
  image_url: string | null;
  image_source_url: string | null;
  image_author: string | null;
  image_license: string | null;
  image_license_url: string | null;
  location_text: string | null;
  submitted_source_url: string | null;
};

type Source = {
  id: string;
  analysis_id: string | null;
  person_id?: string | null;
  title: string;
  publisher: string | null;
  url: string;
  source_type: string;
  notes: string | null;
  qualityScore: number;
  qualityVoteCount: number;
};

type Analysis = {
  id: string;
  title: string;
  details: string;
  created_at: string;
  sources: Source[];
  confidence: number;
  voteCount: number;
  evidenceStrength: number;
  evidenceSourceCount: number;
};

function formatDate(date: string | null) {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function sourceTypeLabel(value: string) {
  const labels: Record<string, string> = {
    official_record: "Official record",
    medical: "Medical source",
    court_record: "Court record",
    law_enforcement: "Law enforcement",
    news: "News reporting",
    interview: "Interview",
    book_documentary: "Book / documentary",
    academic: "Academic source",
    obituary: "Obituary / death notice",
    family_statement: "Family / representative statement",
    government_record: "Government record",
    other: "Other source",
  };
  return labels[value] ?? "Source";
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, name, slug, birth_date, death_date, occupation, biography, official_cause, official_manner, profile_type, status, image_url, image_source_url, image_author, image_license, image_license_url, location_text, submitted_source_url",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) notFound();

  const person = data as Person;

  const { data: directSourceData } = await supabase
    .from("sources")
    .select("id, analysis_id, person_id, title, publisher, url, source_type, notes")
    .eq("person_id", person.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const directSources =
    (directSourceData ?? []) as Omit<Source, "qualityScore" | "qualityVoteCount">[];

  const { data: analysisData } = await supabase
    .from("analyses")
    .select("id, title, details, created_at")
    .eq("person_id", person.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const rawAnalyses = analysisData ?? [];
  const analysisIds = rawAnalyses.map((analysis) => analysis.id);

  let publishedSourcesRaw: Omit<
    Source,
    "qualityScore" | "qualityVoteCount"
  >[] = [];

  if (analysisIds.length > 0) {
    const { data: sourceData } = await supabase
      .from("sources")
      .select("id, analysis_id, title, publisher, url, source_type, notes")
      .in("analysis_id", analysisIds)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    publishedSourcesRaw =
      (sourceData ?? []) as Omit<Source, "qualityScore" | "qualityVoteCount">[];
  }

  const publishedSources: Source[] = await Promise.all(
    publishedSourcesRaw.map(async (source) => {
      const { data: qualityData } = await supabase.rpc(
        "get_source_vote_summary",
        { p_source_id: source.id },
      );

      const qualitySummary = Array.isArray(qualityData)
        ? qualityData[0]
        : qualityData;

      return {
        ...source,
        qualityScore: Number(qualitySummary?.quality_score ?? 0),
        qualityVoteCount: Number(qualitySummary?.vote_count ?? 0),
      };
    }),
  );

  const directSourcesWithQuality: Source[] = await Promise.all(
    directSources.map(async (source) => {
      const { data: qualityData } = await supabase.rpc(
        "get_source_vote_summary",
        { p_source_id: source.id },
      );

      const qualitySummary = Array.isArray(qualityData)
        ? qualityData[0]
        : qualityData;

      return {
        ...source,
        qualityScore: Number(qualitySummary?.quality_score ?? 0),
        qualityVoteCount: Number(qualitySummary?.vote_count ?? 0),
      };
    }),
  );

  const analyses: Analysis[] = await Promise.all(
    rawAnalyses.map(async (analysis) => {
      const [{ data: voteData }, { data: evidenceData }] = await Promise.all([
        supabase.rpc("get_analysis_vote_summary", {
          p_analysis_id: analysis.id,
        }),
        supabase.rpc("get_analysis_evidence_summary", {
          p_analysis_id: analysis.id,
        }),
      ]);

      const voteSummary = Array.isArray(voteData) ? voteData[0] : voteData;
      const evidenceSummary = Array.isArray(evidenceData)
        ? evidenceData[0]
        : evidenceData;

      return {
        ...analysis,
        sources: publishedSources.filter(
          (source) => source.analysis_id === analysis.id,
        ),
        confidence: Number(voteSummary?.confidence ?? 0),
        voteCount: Number(voteSummary?.vote_count ?? 0),
        evidenceStrength: Number(evidenceSummary?.evidence_strength ?? 0),
        evidenceSourceCount: Number(evidenceSummary?.source_count ?? 0),
      };
    }),
  );

  const totalSources = publishedSources.length + directSourcesWithQuality.length;
  const isEverydayPerson = person.profile_type === "private";
  const findingLabel = isEverydayPerson ? "Reported cause" : "Official cause";
  const mannerLabel = isEverydayPerson ? "Reported manner" : "Official manner";

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <ProfileViewTracker personId={person.id} />
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
          <AuthButton />
        </div>
      </header>

      <section className="border-b border-[#d9d3c7] bg-[#ebe6dc]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <a href="/" className="text-sm font-semibold text-[#a65336]">
            ← Back to home
          </a>
        </div>
      </section>

      <section className="border-b border-[#d9d3c7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="flex flex-col gap-7 sm:flex-row">
            <div className="shrink-0">
              {person.image_url ? (
                <div className="w-44">
                  <div className="overflow-hidden rounded-[28px] border border-[#d2ccc1] bg-white shadow-lg">
                    <img
                      src={person.image_url}
                      alt={person.name}
                      className="h-56 w-44 object-cover"
                    />
                  </div>

                  {(person.image_author ||
                    person.image_license ||
                    person.image_source_url) && (
                    <p className="mt-2 max-w-44 text-[10px] leading-4 text-[#7a817f]">
                      {person.image_author && <>Photo: {person.image_author}</>}
                      {person.image_author && person.image_license && " · "}
                      {person.image_license &&
                        (person.image_license_url ? (
                          <a
                            href={person.image_license_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {person.image_license}
                          </a>
                        ) : (
                          person.image_license
                        ))}
                      {person.image_source_url && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={person.image_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Source
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex h-44 w-44 items-center justify-center rounded-[28px] bg-[#1d2a2a] text-5xl font-semibold text-white shadow-lg">
                  {getInitials(person.name)}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-[#e8efe9] px-3 py-1 text-xs font-semibold text-[#315a46]">
                  Published profile
                </span>
                <span className="rounded-full border border-[#d7cfc3] px-3 py-1 text-xs font-semibold text-[#66706d]">
                  {isEverydayPerson ? "Everyday person" : "Public / notable person"}
                </span>
              </div>

              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] md:text-6xl">
                {person.name}
              </h1>

              <p className="mt-3 text-lg text-[#66706d]">
                {formatDate(person.birth_date)} – {formatDate(person.death_date)}
                {person.occupation ? ` · ${person.occupation}` : ""}
              </p>

              {person.location_text && (
                <p className="mt-2 text-base font-medium text-[#66706d]">
                  {person.location_text}
                </p>
              )}

              {person.biography && (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-[#586260]">
                  {person.biography}
                </p>
              )}
            </div>
          </div>

          <aside className="rounded-[24px] bg-[#1d2a2a] p-6 text-white shadow-[0_18px_42px_rgba(29,42,42,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e0aa8c]">
              Profile summary
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-sm text-[#bdc8c5]">{findingLabel}</p>
                <p className="mt-1 text-xl font-semibold">
                  {person.official_cause || "Not yet documented"}
                </p>
              </div>

              <div>
                <p className="text-sm text-[#bdc8c5]">{mannerLabel}</p>
                <p className="mt-1 text-xl font-semibold">
                  {person.official_manner || "Not yet documented"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#bdc8c5]">Analyses</p>
                  <p className="mt-1 text-xl font-semibold text-[#efb999]">
                    {analyses.length}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#bdc8c5]">Sources</p>
                  <p className="mt-1 text-xl font-semibold text-[#efb999]">
                    {totalSources}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-9 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <article className="rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
                  {isEverydayPerson ? "Reported facts" : "Official finding"}
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                  What is publicly documented?
                </h2>
              </div>

              {isEverydayPerson && (
                <span className="w-fit rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-semibold text-[#66706d]">
                  Community-added profile
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8f6f1] p-5">
                <p className="text-sm font-semibold text-[#66706d]">{findingLabel}</p>
                <p className="mt-2 text-xl font-semibold">
                  {person.official_cause || "Not publicly documented"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f6f1] p-5">
                <p className="text-sm font-semibold text-[#66706d]">{mannerLabel}</p>
                <p className="mt-2 text-xl font-semibold">
                  {person.official_manner || "Not publicly documented"}
                </p>
              </div>
            </div>

            {person.submitted_source_url ? (
              <div className="mt-5 rounded-2xl border border-[#ded8ce] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                  Starting source
                </p>
                <p className="mt-2 text-sm leading-6 text-[#66706d]">
                  This public source was supplied when the profile was submitted.
                  It does not automatically verify every claim on the page.
                </p>
                <a
                  href={person.submitted_source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#a65336] hover:underline"
                >
                  View obituary or source →
                </a>
              </div>
            ) : isEverydayPerson ? (
              <div className="mt-5 rounded-2xl bg-[#f4f1ea] p-5">
                <p className="font-semibold">No starting source is attached yet.</p>
                <p className="mt-1 text-sm leading-6 text-[#66706d]">
                  Help improve the record by suggesting a correction or submitting
                  an analysis supported by public sources.
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
                  Reported / official sources
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                  Where do the reported facts come from?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66706d]">
                  These sources document the death, reported cause, manner, or other
                  basic facts. They are kept separate from sources supporting a
                  community analysis.
                </p>
              </div>

              <a
                href={`/person/${person.slug}/add-source`}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#a65336] px-5 py-3 text-sm font-semibold text-white"
              >
                + Add source
              </a>
            </div>

            {directSourcesWithQuality.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#cfc6b8] bg-[#f8f6f1] p-5">
                <p className="font-semibold">No reported-fact sources have been added yet.</p>
                <p className="mt-1 text-sm leading-6 text-[#66706d]">
                  Add an obituary, family statement, medical examiner record,
                  law-enforcement statement, or reputable news report.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {directSourcesWithQuality.map((source) => (
                  <div
                    key={source.id}
                    className="rounded-2xl border border-[#ded8ce] bg-[#f8f6f1] p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                          {sourceTypeLabel(source.source_type)}
                        </p>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-lg font-semibold hover:text-[#a65336]"
                        >
                          {source.title} ↗
                        </a>
                        {source.publisher && (
                          <p className="mt-1 text-sm text-[#66706d]">
                            {source.publisher}
                          </p>
                        )}
                        {source.notes && (
                          <p className="mt-3 text-sm leading-6 text-[#586260]">
                            {source.notes}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        <SourceQuality
                          sourceId={source.id}
                          initialScore={source.qualityScore}
                          initialVoteCount={source.qualityVoteCount}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[26px] border border-[#d2ccc1] bg-white p-8 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
                  Community analysis
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                  What does the evidence suggest?
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66706d]">
                  Anyone can submit a different explanation, but each analysis stands
                  on its own and should be supported with visible sources. Community
                  confidence is opinion; evidence strength reflects the supporting record.
                </p>
              </div>

              <a
                href={`/person/${person.slug}/add-analysis`}
                className="shrink-0 rounded-xl bg-[#a65336] px-5 py-3 text-sm font-semibold text-white"
              >
                + Submit analysis
              </a>
            </div>

            {analyses.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-[#cfc6b8] bg-[#f8f6f1] p-6 sm:p-7">
                <p className="text-lg font-semibold">No community analysis has been published yet.</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66706d]">
                  If the reported explanation is incomplete, disputed, or missing,
                  you can submit a different analysis and show the sources that support it.
                </p>
                <a
                  href={`/person/${person.slug}/add-analysis`}
                  className="mt-5 inline-flex rounded-xl bg-[#a65336] px-5 py-3 text-sm font-semibold text-white"
                >
                  Submit the first analysis
                </a>
              </div>
            ) : (
              <div className="mt-7 space-y-6">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="rounded-2xl border border-[#ded8ce] p-6"
                  >
                    <h3 className="text-xl font-semibold">{analysis.title}</h3>
                    <p className="mt-3 leading-7 text-[#586260]">
                      {analysis.details}
                    </p>

                    <div className="mt-6 rounded-2xl border border-[#ded8ce] bg-[#f8f6f1] p-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                            Community confidence
                          </p>
                          <div className="mt-2 flex items-end gap-3">
                            <p className="text-4xl font-semibold tracking-[-0.04em]">
                              {analysis.voteCount > 0
                                ? `${analysis.confidence}%`
                                : "—"}
                            </p>
                            <p className="pb-1 text-sm text-[#66706d]">
                              {analysis.voteCount}{" "}
                              {analysis.voteCount === 1 ? "vote" : "votes"}
                            </p>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e2ddd4]">
                            <div
                              className="h-full rounded-full bg-[#a65336]"
                              style={{
                                width: `${
                                  analysis.voteCount > 0
                                    ? analysis.confidence
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                            Evidence strength
                          </p>
                          <div className="mt-2 flex items-end gap-3">
                            <p className="text-4xl font-semibold tracking-[-0.04em]">
                              {analysis.evidenceSourceCount > 0
                                ? `${analysis.evidenceStrength}/100`
                                : "—"}
                            </p>
                            <p className="pb-1 text-sm text-[#66706d]">
                              {analysis.evidenceSourceCount}{" "}
                              {analysis.evidenceSourceCount === 1
                                ? "source"
                                : "sources"}
                            </p>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e2ddd4]">
                            <div
                              className="h-full rounded-full bg-[#315a46]"
                              style={{
                                width: `${
                                  analysis.evidenceSourceCount > 0
                                    ? analysis.evidenceStrength
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-[#ded8ce] pt-5">
                        <VotePanel
                          analysisId={analysis.id}
                          initialConfidence={analysis.confidence}
                          initialVoteCount={analysis.voteCount}
                        />
                      </div>
                    </div>

                    <div className="mt-6 border-t border-[#ece7de] pt-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-sm font-semibold">
                            Evidence and sources
                          </p>
                          <p className="mt-1 text-sm text-[#66706d]">
                            {analysis.sources.length} published{" "}
                            {analysis.sources.length === 1 ? "source" : "sources"}
                          </p>
                        </div>

                        <a
                          href={`/analysis/${analysis.id}/add-source`}
                          className="rounded-xl border border-[#d2ccc1] px-4 py-2.5 text-sm font-semibold text-[#a65336]"
                        >
                          + Add source
                        </a>
                      </div>

                      {analysis.sources.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {analysis.sources.map((source) => (
                            <div
                              key={source.id}
                              className="rounded-xl bg-[#f4f1ea] p-4"
                            >
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block transition hover:opacity-80"
                              >
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a65336]">
                                  {sourceTypeLabel(source.source_type)}
                                </p>
                                <p className="mt-1 font-semibold">{source.title}</p>
                                {source.publisher && (
                                  <p className="mt-1 text-sm text-[#66706d]">
                                    {source.publisher}
                                  </p>
                                )}
                                {source.notes && (
                                  <p className="mt-3 text-sm leading-6 text-[#66706d]">
                                    {source.notes}
                                  </p>
                                )}
                              </a>

                              <SourceQuality
                                sourceId={source.id}
                                initialScore={source.qualityScore}
                                initialVoteCount={source.qualityVoteCount}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[26px] border border-[#d2ccc1] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a65336]">
              Improve this profile
            </p>

            <div className="mt-5 space-y-3">
              <a
                href={`/person/${person.slug}/add-analysis`}
                className="flex w-full items-center justify-between rounded-xl bg-[#f4f1ea] px-4 py-3 text-left text-sm font-semibold"
              >
                Submit an analysis
                <span className="text-[#a65336]">→</span>
              </a>

              <a
                href={`/person/${person.slug}/suggest-correction`}
                className="flex w-full items-center justify-between rounded-xl bg-[#f4f1ea] px-4 py-3 text-left text-sm font-semibold"
              >
                Suggest a correction
                <span className="text-[#a65336]">→</span>
              </a>
            </div>
          </div>

          <div className="rounded-[26px] bg-[#ebe6dc] p-6">
            <p className="text-sm font-semibold">Transparency notice</p>
            <p className="mt-3 text-sm leading-6 text-[#66706d]">
              Reported facts and community analysis are kept separate. Community
              confidence measures user opinion. Evidence strength measures approved
              supporting sources and community source-quality ratings. A popular
              analysis is not automatically a verified fact.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
