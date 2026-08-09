interface HeaderProps {
  showSignIn?: boolean;
}

export default function Header({
  showSignIn = true,
}: HeaderProps) {
  return (
    <>
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <a href="/" className="leading-none">
            <h1 className="text-[2rem] font-bold tracking-[-0.05em]">
              howdidtheydie
              <span className="text-[#a65336]">.org</span>
            </h1>

            <p className="mt-2 text-sm text-[#66706d]">
              Official findings. Community theories. Visible evidence.
            </p>
          </a>

          <nav className="flex items-center gap-10">

            <a
              href="/"
              className="text-[15px] font-medium text-[#1d2a2a] transition hover:text-[#a65336]"
            >
              Browse
            </a>

            <a
              href="/trending"
              className="text-[15px] font-medium text-[#1d2a2a] transition hover:text-[#a65336]"
            >
              Trending
            </a>

            <a
              href="/how-it-works"
              className="text-[15px] font-medium text-[#1d2a2a] transition hover:text-[#a65336]"
            >
              How it works
            </a>

            <a
              href="/community-rules"
              className="text-[15px] font-medium text-[#1d2a2a] transition hover:text-[#a65336]"
            >
              Community Rules
            </a>

            {showSignIn && (
              <a
                href="/sign-up"
                className="rounded-xl bg-[#1d2a2a] px-6 py-3 font-semibold text-white transition hover:bg-[#2d3d3c]"
              >
                Sign In
              </a>
            )}

          </nav>

        </div>
      </header>

      <div className="border-b border-[#ddd7cd] bg-[#ebe4d8]">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3 text-sm">

          <span className="font-bold uppercase tracking-[0.18em] text-[#a65336]">
            Trending
          </span>

          <a href="/person/matthew-perry" className="hover:text-[#a65336]">
            Matthew Perry
          </a>

          <a href="/person/elvis-presley" className="hover:text-[#a65336]">
            Elvis Presley
          </a>

          <a href="/person/princess-diana" className="hover:text-[#a65336]">
            Princess Diana
          </a>

          <a href="/person/michael-jackson" className="hover:text-[#a65336]">
            Michael Jackson
          </a>

          <a href="/person/whitney-houston" className="hover:text-[#a65336]">
            Whitney Houston
          </a>

        </div>
      </div>
    </>
  );
}