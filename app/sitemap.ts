import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://howdidtheydie.org";

type PersonSlugRow = {
  slug: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const people: PersonSlugRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("people")
      .select("slug")
      .eq("status", "published")
      .not("slug", "is", null)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Sitemap people query failed:", error.message);
      break;
    }

    const batch = (data ?? []) as PersonSlugRow[];
    people.push(...batch);

    if (batch.length < pageSize) break;
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const personPages: MetadataRoute.Sitemap = people.map((person) => ({
    url: `${SITE_URL}/person/${encodeURIComponent(person.slug)}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...personPages];
}
