export default async function SubmissionReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

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
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8efe9] text-2xl text-[#315a46]">
          ✓
        </div>

        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#a65336]">
          Submission received
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
          Your profile is pending review.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#586260]">
          The submission was saved successfully. It will become publicly
          available after an administrator reviews and publishes it.
        </p>

        {slug && (
          <div className="mt-8 rounded-2xl border border-[#d9d3c7] bg-white p-5">
            <p className="text-sm text-[#66706d]">Reserved page address</p>
            <p className="mt-2 font-semibold text-[#a65336]">
              /person/{slug}
            </p>
          </div>
        )}

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/add-person"
            className="rounded-xl border border-[#d2ccc1] bg-white px-6 py-3.5 font-semibold"
          >
            Submit another person
          </a>

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
