export default async function SourceSubmissionReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string; slug?: string }>;
}) {
  const { analysis, slug } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8efe9] text-2xl text-[#315a46]">
          ✓
        </div>

        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Source submitted
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
          It is pending review.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#586260]">
          {analysis
            ? `Your source for “${analysis}” was saved successfully.`
            : "Your source was saved successfully."}{" "}
          It will appear publicly after administrator approval.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          {slug && (
            <a
              href={`/person/${slug}`}
              className="rounded-xl border border-[#d2ccc1] bg-white px-6 py-3.5 font-semibold"
            >
              Return to profile
            </a>
          )}

          <a
            href="/"
            className="rounded-xl bg-[#1d2a2a] px-6 py-3.5 font-semibold text-white"
          >
            Return home
          </a>
        </div>
      </section>
    </main>
  );
}
