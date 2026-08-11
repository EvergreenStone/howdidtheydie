import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SparqlBinding = {
  person?: { value?: string };
  deathDate?: { value?: string };
};

type WikidataClaim = {
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
  rank?: string;
};

type WikidataEntity = {
  id?: string;
  labels?: Record<string, { language: string; value: string }>;
  descriptions?: Record<string, { language: string; value: string }>;
  aliases?: Record<string, Array<{ language: string; value: string }>>;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { site: string; title: string }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function qidFromEntityUrl(value?: string) {
  const match = value?.match(/\/(Q\d+)$/);
  return match?.[1] ?? null;
}

function getBestClaim(claims: WikidataClaim[] | undefined) {
  if (!claims?.length) return null;

  return (
    claims.find((claim) => claim.rank === "preferred") ??
    claims.find((claim) => claim.rank !== "deprecated") ??
    claims[0]
  );
}

function getEntityIdFromClaim(claims: WikidataClaim[] | undefined) {
  const claim = getBestClaim(claims);
  const value = claim?.mainsnak?.datavalue?.value as
    | { id?: string; "numeric-id"?: number }
    | undefined;

  if (value?.id) return value.id;
  if (value?.["numeric-id"]) return `Q${value["numeric-id"]}`;

  return null;
}

function getAllEntityIdsFromClaims(claims: WikidataClaim[] | undefined) {
  if (!claims?.length) return [];

  const ids = claims
    .filter((claim) => claim.rank !== "deprecated")
    .map((claim) => {
      const value = claim?.mainsnak?.datavalue?.value as
        | { id?: string; "numeric-id"?: number }
        | undefined;

      if (value?.id) return value.id;
      if (value?.["numeric-id"]) return `Q${value["numeric-id"]}`;

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set(ids)];
}

function getDateFromClaim(claims: WikidataClaim[] | undefined) {
  const claim = getBestClaim(claims);
  const value = claim?.mainsnak?.datavalue?.value as
    | { time?: string }
    | undefined;

  if (!value?.time) return null;

  const match = value.time.match(/[+-](\d{4})-(\d{2})-(\d{2})T/);
  if (!match) return null;

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function labelFor(
  id: string | null,
  labels: Record<string, string>,
) {
  if (!id) return null;
  return labels[id] ?? id;
}

async function fetchEntities(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, WikidataEntity>;

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", ids.join("|"));
  url.searchParams.set("props", "labels|descriptions|aliases|claims|sitelinks");
  url.searchParams.set("languages", "en");
  url.searchParams.set("languagefallback", "1");
  url.searchParams.set("sitefilter", "enwiki");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HowDidTheyDie.org/0.2 (https://howdidtheydie.org)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Wikidata entity API returned ${response.status}.`);
  }

  const json = await response.json();
  const entities = (json?.entities ?? []) as WikidataEntity[];

  return Object.fromEntries(
    entities
      .filter((entity) => entity.id)
      .map((entity) => [entity.id as string, entity]),
  ) as Record<string, WikidataEntity>;
}

async function fetchLabels(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, string>;

  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", ids.join("|"));
  url.searchParams.set("props", "labels");
  url.searchParams.set("languages", "en");
  url.searchParams.set("languagefallback", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HowDidTheyDie.org/0.2 (https://howdidtheydie.org)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Wikidata label API returned ${response.status}.`);
  }

  const json = await response.json();
  const entities = (json?.entities ?? []) as WikidataEntity[];

  const labels: Record<string, string> = {};

  for (const entity of entities) {
    if (!entity.id) continue;
    const english = entity.labels?.en?.value;
    if (english) labels[entity.id] = english;
  }

  return labels;
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);

    const currentYear = new Date().getUTCFullYear();

    const requestedLimit = Number(
      requestUrl.searchParams.get("limit") || "25",
    );
    const requestedOffset = Number(
      requestUrl.searchParams.get("offset") || "0",
    );
    const requestedYear = Number(
      requestUrl.searchParams.get("year") || String(currentYear),
    );

    const limit = clamp(
      Number.isFinite(requestedLimit) ? requestedLimit : 25,
      1,
      50,
    );

    const offset = clamp(
      Number.isFinite(requestedOffset) ? requestedOffset : 0,
      0,
      5000,
    );

    const year = clamp(
      Number.isFinite(requestedYear) ? requestedYear : currentYear,
      1800,
      currentYear,
    );

    const start = `${year}-01-01T00:00:00Z`;
    const end = `${year + 1}-01-01T00:00:00Z`;

    // The old importer tried to join labels, occupations, causes, manner,
    // and Wikipedia sitelinks inside one SPARQL query. That timed out.
    //
    // This query deliberately asks WDQS for ONLY QIDs + death dates
    // inside one calendar year. Everything else comes from wbgetentities.
    const rawLimit = Math.min(limit * 5, 250);
    const rawOffset = offset * 5;

    const query = `
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?person ?deathDate
WHERE {
  ?person wdt:P31 wd:Q5 ;
          wdt:P570 ?deathDate ;
          wdt:P509 ?causeOfDeath .

  FILTER(
    ?deathDate >= "${start}"^^xsd:dateTime &&
    ?deathDate < "${end}"^^xsd:dateTime
  )
}
ORDER BY DESC(?deathDate)
LIMIT ${rawLimit}
OFFSET ${rawOffset}
`;

    const sparqlUrl = new URL("https://query.wikidata.org/sparql");
    sparqlUrl.searchParams.set("query", query);
    sparqlUrl.searchParams.set("format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let sparqlResponse: Response;

    try {
      sparqlResponse = await fetch(sparqlUrl, {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "HowDidTheyDie.org/0.2 (https://howdidtheydie.org)",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!sparqlResponse.ok) {
      const details = await sparqlResponse.text();

      return NextResponse.json(
        {
          error: `Wikidata list request returned ${sparqlResponse.status}.`,
          details: details.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const sparqlJson = await sparqlResponse.json();
    const bindings = (sparqlJson?.results?.bindings ??
      []) as SparqlBinding[];

    const orderedQids: string[] = [];
    const deathDates = new Map<string, string>();

    for (const row of bindings) {
      const qid = qidFromEntityUrl(row.person?.value);
      const deathDate = row.deathDate?.value?.slice(0, 10);

      if (!qid || !deathDate || deathDates.has(qid)) continue;

      orderedQids.push(qid);
      deathDates.set(qid, deathDate);
    }

    if (orderedQids.length === 0) {
      return NextResponse.json({
        people: [],
        requestedLimit: limit,
        offset,
        year,
        returned: 0,
      });
    }

    // Fetch the actual item data through the much lighter Action API.
    const entityMap = await fetchEntities(orderedQids.slice(0, 50));

    const referencedIds = new Set<string>();

    for (const qid of orderedQids) {
      const entity = entityMap[qid];
      if (!entity) continue;

      for (const id of getAllEntityIdsFromClaims(entity.claims?.P106)) {
        referencedIds.add(id);
      }

      for (const id of getAllEntityIdsFromClaims(entity.claims?.P509)) {
        referencedIds.add(id);
      }

      const mannerId = getEntityIdFromClaim(entity.claims?.P1196);
      if (mannerId) referencedIds.add(mannerId);
    }

    // wbgetentities accepts a limited number of IDs for normal clients.
    // 50 is safely within the standard limit.
    const referencedArray = Array.from(referencedIds).slice(0, 50);
    const labels = await fetchLabels(referencedArray);

    const people = orderedQids
      .map((qid) => {
        const entity = entityMap[qid];
        if (!entity) return null;

        const name = entity.labels?.en?.value;
        const enwikiTitle = entity.sitelinks?.enwiki?.title;

        // Keep the seed focused on notable people: require an English
        // Wikipedia article.
        if (!name || !enwikiTitle) return null;

        const occupationIds = getAllEntityIdsFromClaims(
          entity.claims?.P106,
        ).slice(0, 3);

        const causeIds = getAllEntityIdsFromClaims(entity.claims?.P509);
        const mannerId = getEntityIdFromClaim(entity.claims?.P1196);

        const occupations = occupationIds
          .map((id) => labelFor(id, labels))
          .filter((value): value is string => Boolean(value));

        const causes = causeIds
          .map((id) => labelFor(id, labels))
          .filter((value): value is string => Boolean(value));

        const officialManner = labelFor(mannerId, labels);

        return {
          wikidataId: qid,
          wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
          wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(
            enwikiTitle.replace(/ /g, "_"),
          )}`,
          name,
          aliases: (entity.aliases?.en ?? [])
            .map((item) => item.value?.trim())
            .filter((value): value is string => Boolean(value))
            .filter((value) => value.toLowerCase() !== name.toLowerCase()),
          birthDate: getDateFromClaim(entity.claims?.P569),
          deathDate:
            getDateFromClaim(entity.claims?.P570) ??
            deathDates.get(qid) ??
            null,
          occupation: occupations.join(", ") || null,
          officialCause: causes.join("; ") || null,
          officialManner,
        };
      })
      .filter(
        (
          person,
        ): person is {
          wikidataId: string;
          wikidataUrl: string;
          wikipediaUrl: string;
          name: string;
          aliases: string[];
          birthDate: string | null;
          deathDate: string;
          occupation: string | null;
          officialCause: string | null;
          officialManner: string | null;
        } => Boolean(person?.deathDate),
      )
      .slice(0, limit);

    return NextResponse.json({
      people,
      requestedLimit: limit,
      offset,
      year,
      returned: people.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown importer error.";

    return NextResponse.json(
      {
        error:
          message === "This operation was aborted"
            ? "Wikidata took too long to respond. Try a different year or a smaller batch."
            : message,
      },
      { status: 502 },
    );
  }
}
