export default async function CorrectionSubmissionReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; slug?: string }>;
}) {
  const { person, slug } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8efe9] text-2xl text-[#315a46]">
          ✓
        </div>

        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Correction submitted
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
          It is pending review.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#586260]">
          {person
            ? `Your suggested correction for ${person} was saved successfully.`
            : "Your suggested correction was saved successfully."}
        </p>

        {slug && (
          <a
            href={`/person/${slug}`}
            className="mt-9 inline-flex rounded-xl bg-[#1d2a2a] px-6 py-3.5 font-semibold text-white"
          >
            Return to profile
          </a>
        )}
      </section>
    </main>
  );
}
