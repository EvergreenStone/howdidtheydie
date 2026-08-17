export default function ProfileSourceSubmissionPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-16 text-[#1d2a2a] sm:px-6">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-[#d2ccc1] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
          Source submission
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Add sources from a person’s profile.
        </h1>
        <p className="mt-4 leading-7 text-[#66706d]">
          Open the person’s profile and use the “+ Add source” button under
          Reported / official sources.
        </p>
        <a
          href="/search"
          className="mt-7 inline-flex rounded-xl bg-[#a65336] px-5 py-3 font-semibold text-white"
        >
          Find a person
        </a>
      </div>
    </main>
  );
}
