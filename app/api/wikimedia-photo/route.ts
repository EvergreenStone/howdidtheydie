import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Claim = {
  mainsnak?: { datavalue?: { value?: unknown } };
  rank?: string;
};

type Entity = {
  claims?: Record<string, Claim[]>;
};

function bestClaim(claims: Claim[] | undefined) {
  if (!claims?.length) return null;
  return (
    claims.find((claim) => claim.rank === "preferred") ??
    claims.find((claim) => claim.rank !== "deprecated") ??
    claims[0]
  );
}

function stringClaim(claims: Claim[] | undefined) {
  const value = bestClaim(claims)?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : null;
}

function stripHtml(value?: string) {
  if (!value) return null;
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const qid = url.searchParams.get("qid");

    if (!qid || !/^Q\d+$/.test(qid)) {
      return NextResponse.json({ error: "Valid Wikidata QID required." }, { status: 400 });
    }

    const wd = new URL("https://www.wikidata.org/w/api.php");
    wd.searchParams.set("action", "wbgetentities");
    wd.searchParams.set("ids", qid);
    wd.searchParams.set("props", "claims");
    wd.searchParams.set("format", "json");
    wd.searchParams.set("origin", "*");

    const wdRes = await fetch(wd, {
      headers: { "User-Agent": "HowDidTheyDie.org/0.4 (https://howdidtheydie.org)" },
      cache: "no-store",
    });

    if (!wdRes.ok) {
      return NextResponse.json({ error: `Wikidata returned ${wdRes.status}.` }, { status: 502 });
    }

    const wdJson = await wdRes.json();
    const entity = wdJson?.entities?.[qid] as Entity | undefined;
    const fileName = stringClaim(entity?.claims?.P18);

    if (!fileName) {
      return NextResponse.json({ found: false, qid });
    }

    const commons = new URL("https://commons.wikimedia.org/w/api.php");
    commons.searchParams.set("action", "query");
    commons.searchParams.set("titles", `File:${fileName}`);
    commons.searchParams.set("prop", "imageinfo");
    commons.searchParams.set("iiprop", "url|extmetadata");
    commons.searchParams.set("iiurlwidth", "900");
    commons.searchParams.set("format", "json");
    commons.searchParams.set("origin", "*");

    const cRes = await fetch(commons, {
      headers: { "User-Agent": "HowDidTheyDie.org/0.4 (https://howdidtheydie.org)" },
      cache: "no-store",
    });

    if (!cRes.ok) {
      return NextResponse.json({ error: `Commons returned ${cRes.status}.` }, { status: 502 });
    }

    const cJson = await cRes.json();
    const pages = cJson?.query?.pages ?? {};
    const firstPage = Object.values(pages)[0] as any;
    const info = firstPage?.imageinfo?.[0];

    if (!info) return NextResponse.json({ found: false, qid });

    const meta = info.extmetadata ?? {};
    const attribution = (meta.AttributionRequired?.value ?? "").toLowerCase();

    return NextResponse.json({
      found: true,
      qid,
      fileName,
      imageUrl: info.thumburl || info.url || null,
      originalImageUrl: info.url || null,
      sourceUrl: info.descriptionurl || null,
      author: stripHtml(meta.Artist?.value || meta.Credit?.value),
      license: stripHtml(meta.LicenseShortName?.value),
      licenseUrl: meta.LicenseUrl?.value || null,
      attributionRequired: ["true", "1", "yes"].includes(attribution),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown photo lookup error." },
      { status: 502 },
    );
  }
}
