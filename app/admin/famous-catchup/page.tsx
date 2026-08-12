"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ImportPerson = {
  wikidataId: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  name: string;
  aliases: string[];
  birthDate: string | null;
  deathDate: string;
  occupation: string | null;
  officialCause: string | null;
  officialManner: string | null;
};

type ResultRow = {
  requested: string;
  status: "added" | "exists" | "not-found" | "failed";
  matched?: string;
  message?: string;
};

const STARTER_NAMES = `Chuck Norris
Michael Jackson
Elvis Presley
Princess Diana
Whitney Houston
Robin Williams
Kobe Bryant
Matthew Perry
Prince
David Bowie
George Michael
Aretha Franklin
Tina Turner
Betty White
Bob Saget
James Gandolfini
Heath Ledger
Paul Walker
Carrie Fisher
Debbie Reynolds
Joan Rivers
Alan Rickman
Chadwick Boseman
Sean Connery
Gene Wilder
Patrick Swayze
Farrah Fawcett
Steve Jobs
Muhammad Ali
John F. Kennedy
John Lennon
Freddie Mercury
Marilyn Monroe
Audrey Hepburn
Lucille Ball
Frank Sinatra
Dean Martin
Johnny Cash
June Carter Cash
Ray Charles
James Brown
Tupac Shakur
The Notorious B.I.G.
Nipsey Hussle
Mac Miller
DMX
Coolio
Olivia Newton-John
Suzanne Somers
Doris Day
Angela Lansbury
Maggie Smith
James Earl Jones
Donald Sutherland
Shelley Duvall
Richard Simmons
Shannen Doherty
Bob Newhart
Gena Rowlands
Kris Kristofferson
Quincy Jones
Teri Garr
Phil Donahue
Louis Gossett Jr.
Carl Weathers
Norman Lear
Andre Braugher
Ryan O'Neal
Piper Laurie
Jimmy Buffett
Tony Bennett
Sinéad O'Connor
Paul Reubens
Angus Cloud
Treat Williams
Raquel Welch
Lisa Marie Presley
Jeff Beck
Barbara Walters
Kirstie Alley
Christine McVie
Irene Cara
Leslie Jordan
Loretta Lynn
Anne Heche
Nichelle Nichols
James Caan
Ray Liotta
Gilbert Gottfried
Sidney Poitier
Stephen Sondheim
Dean Stockwell
Colin Powell
Norm Macdonald
Ed Asner
Charlie Watts
Dusty Hill
Richard Donner
Ned Beatty
Clarence Williams III
Gavin MacLeod
Charles Grodin
Olympia Dukakis
Jessica Walter
George Segal
Larry King
Cloris Leachman
Cicely Tyson
Christopher Plummer
Larry Flynt
Rush Limbaugh
Prince Philip
Helen McCrory
Alex Trebek
Eddie Van Halen
Ruth Bader Ginsburg
Regis Philbin
Carl Reiner
Joel Schumacher
Ian Holm
Fred Willard
Jerry Stiller
Little Richard
Roy Horn
John Prine
Adam Schlesinger
Kenny Rogers
Max von Sydow
Kirk Douglas
Neil Peart
Juice WRLD
Caroll Spinney
Shelley Morrison
Danny Aiello
Marie Fredriksson
Robert Forster
Ginger Baker
Ric Ocasek
Eddie Money
Peter Fonda
Toni Morrison
Rutger Hauer
Rip Torn
Cameron Boyce
Beth Chapman
Dr. John
Tim Conway
Peggy Lipton
Luke Perry
Peter Tork
Albert Finney
Kristoff St. John
Carol Channing
Penny Marshall
George H. W. Bush
Stan Lee
Burt Reynolds
Anthony Bourdain
Kate Spade
Margot Kidder
Verne Troyer
R. Lee Ermey
Stephen Hawking
Billy Graham
Dolores O'Riordan
John Mahoney
Mark E. Smith
Tom Petty
Hugh Hefner
Harry Dean Stanton
Jerry Lewis
Glen Campbell
Sam Shepard
Chester Bennington
George A. Romero
Martin Landau
Adam West
Roger Moore
Chris Cornell
Erin Moran
Don Rickles
Chuck Berry
Bill Paxton
Mary Tyler Moore
John Hurt
Leonard Cohen
Robert Vaughn
Kenny Baker
Garry Marshall
Elie Wiesel
Anton Yelchin
Patty Duke
George Kennedy
Lemmy Kilmister
Natalie Cole
Scott Weiland
Maureen O'Hara
Wes Craven
Omar Sharif
Christopher Lee
B.B. King
Ben E. King
Leonard Nimoy
Lesley Gore
Joe Cocker
Mike Nichols
Jan Hooks
Lauren Bacall
James Garner
Elaine Stritch
Casey Kasem
Ruby Dee
Maya Angelou
Bob Hoskins
Mickey Rooney
Harold Ramis
Philip Seymour Hoffman
Pete Seeger
Shirley Temple
Nelson Mandela
Peter O'Toole
Lou Reed
Marcia Wallace
Ed Lauter
Tom Clancy
Ray Dolby
Jean Stapleton
Roger Ebert
Margaret Thatcher
Annette Funicello
Richard Griffiths
Bonnie Franklin
Mindy McCready
Jack Klugman
Larry Hagman
Andy Griffith
Ernest Borgnine
Sherman Hemsley
Phyllis Diller
Michael Clarke Duncan
Neil Armstrong
George McGovern
Etta James
Don Cornelius
Joe Paterno
Andy Rooney
Jack Kevorkian
Peter Falk
Clarence Clemons
Elizabeth Taylor
Nate Dogg
Geraldine Ferraro
Leslie Nielsen
Tony Curtis
Barbara Billingsley
Eddie Fisher
Dennis Hopper
Gary Coleman
Lynn Redgrave
Dixie Carter
John Forsythe
Corey Haim
Alexander McQueen
J.D. Salinger
Brittany Murphy
Ed McMahon
David Carradine
Bea Arthur
Natasha Richardson
Paul Newman
Isaac Hayes
Bernie Mac
Charlton Heston
George Carlin
Tim Russert
Roy Scheider
Ike Turner
Evel Knievel
Marcel Marceau
Luciano Pavarotti
Merv Griffin
Beverly Sills
Charles Nelson Reilly
Yvonne De Carlo
Peter Boyle
Robert Altman
Jack Palance
Ed Bradley
Red Buttons
Don Knotts
Dennis Weaver
Shelley Winters
Richard Pryor
Pat Morita
Rosa Parks
Nipsey Russell
Don Adams
Bob Denver
Peter Jennings
Luther Vandross
Anne Bancroft
Eddie Albert
Johnny Carson
Jerry Orbach
Christopher Reeve
Janet Leigh
Ronald Reagan
Tony Randall
Marlon Brando
Rodney Dangerfield
Julia Child
Katharine Hepburn
Gregory Peck
Fred Rogers
Richard Harris
John Entwistle
Dudley Moore
Billy Wilder
Milton Berle
George Harrison
Jack Lemmon
Carroll O'Connor
Anthony Quinn
Dale Earnhardt
John Gielgud
Walter Matthau
Charles Schulz
Wilt Chamberlain
Stanley Kubrick
Gene Siskel
Chris Farley
John Denver
Mother Teresa
Gianni Versace
Jacques Cousteau
George Burns
Ella Fitzgerald
Gene Kelly
Jerry Garcia
Mickey Mantle
Richard Nixon
Kurt Cobain
John Candy
River Phoenix
Frank Zappa
Thurgood Marshall
Sammy Davis Jr.
Jim Henson
Gilda Radner
Salvador Dalí
Roy Orbison
John Huston
Andy Warhol
Liberace
Cary Grant
Desi Arnaz
Rock Hudson
Yul Brynner
Orson Welles
John Belushi
Grace Kelly
Henry Fonda
Natalie Wood
Steve McQueen
Alfred Hitchcock
John Wayne
Bing Crosby
Groucho Marx
Charlie Chaplin
Bruce Lee
Jim Croce
Harry S. Truman
J. Edgar Hoover
Louis Armstrong
Jim Morrison
Janis Joplin
Jimi Hendrix
Robert F. Kennedy
Martin Luther King Jr.
Walt Disney
Nat King Cole
Winston Churchill
Ernest Hemingway
Clark Gable
Buddy Holly
James Dean
Albert Einstein
Joseph Stalin
George VI
Babe Ruth
Mahatma Gandhi
Franklin D. Roosevelt
Anne Frank
Lou Gehrig
Amelia Earhart
Will Rogers
Marie Curie
Thomas Edison
Harry Houdini
Woodrow Wilson
Alexander Graham Bell
Theodore Roosevelt
Mark Twain
Queen Victoria
Abraham Lincoln
Edgar Allan Poe
Ludwig van Beethoven
Wolfgang Amadeus Mozart`;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function FamousCatchupPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [names, setNames] = useState(STARTER_NAMES);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [message, setMessage] = useState("");

  async function verifyAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("You must sign in first.");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || profile?.role !== "admin") {
      throw new Error("This account does not have administrator access.");
    }

    return user;
  }

  async function insertPerson(person: ImportPerson, userId: string) {
    const { data: existingByQid } = await supabase
      .from("people")
      .select("id, name")
      .eq("wikidata_id", person.wikidataId)
      .maybeSingle();

    if (existingByQid) {
      return { status: "exists" as const, matched: existingByQid.name };
    }

    const { data: existingByName } = await supabase
      .from("people")
      .select("id, name")
      .eq("status", "published")
      .ilike("name", person.name)
      .maybeSingle();

    if (existingByName) {
      return { status: "exists" as const, matched: existingByName.name };
    }

    const baseSlug = slugify(person.name) || person.wikidataId.toLowerCase();

    const { data: slugOwner } = await supabase
      .from("people")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    const slug = slugOwner
      ? `${baseSlug}-${person.wikidataId.toLowerCase()}`
      : baseSlug;

    const { error } = await supabase.from("people").insert({
      name: person.name,
      aliases: person.aliases ?? [],
      slug,
      birth_date: person.birthDate,
      death_date: person.deathDate,
      occupation: person.occupation,
      biography: null,
      official_cause: person.officialCause,
      official_manner: person.officialManner,
      profile_type: "public",
      status: "published",
      created_by: userId,
      published_at: new Date().toISOString(),
      wikidata_id: person.wikidataId,
      imported_from: "wikidata-famous-catchup",
      imported_at: new Date().toISOString(),
      source_url: person.wikipediaUrl || person.wikidataUrl,
    });

    if (error) throw error;

    return { status: "added" as const, matched: person.name };
  }

  async function runCatchup() {
    if (running) return;

    const requestedNames = Array.from(
      new Set(
        names
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );

    if (requestedNames.length === 0) {
      setMessage("Enter at least one name.");
      return;
    }

    setRunning(true);
    setResults([]);
    setMessage(`Checking ${requestedNames.length} names…`);

    try {
      const user = await verifyAdmin();
      const nextResults: ResultRow[] = [];

      for (const requested of requestedNames) {
        try {
          const response = await fetch(
            `/api/wikidata-import?name=${encodeURIComponent(requested)}`,
            { cache: "no-store" },
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || `Request failed with ${response.status}.`);
          }

          const candidates = (data?.people ?? []) as ImportPerson[];

          if (candidates.length === 0) {
            nextResults.push({
              requested,
              status: "not-found",
              message: "No deceased English-Wikipedia match returned by Wikidata.",
            });
            setResults([...nextResults]);
            continue;
          }

          // wbsearchentities is relevance-ranked. Prefer exact label/alias match,
          // otherwise use its first deceased English-Wikipedia result.
          const requestedLower = requested.toLowerCase();

          const person =
            candidates.find(
              (candidate) =>
                candidate.name.toLowerCase() === requestedLower ||
                candidate.aliases.some(
                  (alias) => alias.toLowerCase() === requestedLower,
                ),
            ) ?? candidates[0];

          const inserted = await insertPerson(person, user.id);

          nextResults.push({
            requested,
            status: inserted.status,
            matched: inserted.matched,
          });
        } catch (error) {
          nextResults.push({
            requested,
            status: "failed",
            message:
              error instanceof Error ? error.message : "Unknown import error.",
          });
        }

        setResults([...nextResults]);

        // Be polite to Wikidata.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      setMessage("Famous-person catch-up finished.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Catch-up import could not start.",
      );
    } finally {
      setRunning(false);
    }
  }

  const added = results.filter((row) => row.status === "added").length;
  const exists = results.filter((row) => row.status === "exists").length;
  const missing = results.filter((row) => row.status === "not-found").length;
  const failed = results.filter((row) => row.status === "failed").length;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2a2a]">
      <header className="border-b border-[#d9d3c7] bg-[#f8f6f1]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="leading-none">
            <p className="text-xl font-bold sm:text-2xl">
              howdidtheydie<span className="text-[#a65336]">.org</span>
            </p>
            <p className="mt-2 text-xs text-[#66706d]">
              Famous-person catch-up importer
            </p>
          </a>

          <a href="/admin" className="text-sm font-semibold text-[#a65336]">
            Admin →
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a65336]">
          Coverage repair
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Catch up famous missing profiles.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#586260]">
          Enter one person per line. This searches Wikidata by name, requires a
          death date and English Wikipedia article, and imports the profile even
          if Wikidata has no structured cause of death.
        </p>

        <div className="mt-8 rounded-[24px] border border-[#d2ccc1] bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold">Names to check/import</span>
            <textarea
              value={names}
              disabled={running}
              onChange={(event) => setNames(event.target.value)}
              className="mt-3 min-h-[360px] w-full rounded-xl border border-[#d9d3c7] p-4 font-mono text-sm leading-6 outline-none focus:border-[#a65336] disabled:opacity-60"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={running}
              onClick={() => void runCatchup()}
              className="rounded-xl bg-[#a65336] px-6 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {running ? "Working…" : "Check & import names"}
            </button>

            <button
              type="button"
              disabled={running}
              onClick={() => setNames(STARTER_NAMES)}
              className="rounded-xl border border-[#d2ccc1] px-5 py-3.5 font-semibold"
            >
              Reset starter list
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-[#66706d]">{message}</p>}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <Stat label="Added" value={added} />
          <Stat label="Already existed" value={exists} />
          <Stat label="Not found" value={missing} />
          <Stat label="Failed" value={failed} />
        </div>

        {results.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-[24px] border border-[#d2ccc1] bg-white shadow-sm">
            <div className="divide-y divide-[#e6e0d6]">
              {results.map((row) => (
                <div
                  key={row.requested}
                  className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{row.requested}</p>
                    {row.matched && row.matched !== row.requested && (
                      <p className="mt-1 text-sm text-[#66706d]">
                        Matched: {row.matched}
                      </p>
                    )}
                    {row.message && (
                      <p className="mt-1 text-sm text-[#66706d]">{row.message}</p>
                    )}
                  </div>

                  <Status status={row.status} />
                </div>
              ))}
            </div>
          </div>
        )}
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

function Status({
  status,
}: {
  status: ResultRow["status"];
}) {
  const labels = {
    added: "Added",
    exists: "Already existed",
    "not-found": "Not found",
    failed: "Failed",
  };

  return (
    <span className="shrink-0 rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#66706d]">
      {labels[status]}
    </span>
  );
}
