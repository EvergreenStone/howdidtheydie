import { NextResponse } from "next/server";

type WikidataEntity = {
  id?: string;
  aliases?: Record<string, Array<{ value?: string }>>;
};

function normalizeEntities(value: unknown): Record<string, WikidataEntity> {
  if (!value || typeof value !== "object") return {};

  if (Array.isArray(value)) {
    const result: Record<string, WikidataEntity> = {};
    for (const item of value) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as WikidataEntity).id === "string"
      ) {
        result[(item as WikidataEntity).id!] = item as WikidataEntity;
      }
    }
    return result;
  }

  return value as Record<string, WikidataEntity>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const qids = Array.isArray(body?.qids)
      ? body.qids.filter(
          (value: unknown): value is string =>
            typeof value === "string" && /^Q\d+$/.test(value),
        )
      : [];

    if (qids.length === 0) {
      return NextResponse.json({ aliases: {} });
    }

    if (qids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 Wikidata IDs per request." },
        { status: 400 },
      );
    }

    const url = new URL("https://www.wikidata.org/w/api.php");
    url.searchParams.set("action", "wbgetentities");
    url.searchParams.set("ids", qids.join("|"));
    url.searchParams.set("props", "aliases");
    url.searchParams.set("languages", "en");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HowDidTheyDie.org/0.4 (https://howdidtheydie.org)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Wikidata returned ${response.status}.` },
        { status: 502 },
      );
    }

    const json = await response.json();
    const entities = normalizeEntities(json?.entities);

    const aliases: Record<string, string[]> = {};

    for (const qid of qids) {
      aliases[qid] = (entities[qid]?.aliases?.en ?? [])
        .map((item) => item.value?.trim())
        .filter((value): value is string => Boolean(value));
    }

    return NextResponse.json({ aliases });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Alias lookup failed.",
      },
      { status: 500 },
    );
  }
}
