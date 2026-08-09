import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { ReactNode } from "react";

const SITE_URL = "https://howdidtheydie.org";

type PersonSeo = {
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  occupation: string | null;
  biography: string | null;
  official_cause: string | null;
  image_url: string | null;
  source_url: string | null;
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

async function getPerson(slug: string): Promise<PersonSeo | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("people")
    .select(
      "name, slug, birth_date, death_date, occupation, biography, official_cause, image_url, source_url",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return data as PersonSeo;
}

function buildTitle(person: PersonSeo) {
  return `How Did ${person.name} Die? Cause of Death & Evidence`;
}

function buildDescription(person: PersonSeo) {
  const cause = person.official_cause?.trim();

  if (cause) {
    return `How did ${person.name} die? The officially reported cause of death was ${cause}. Review documented findings, sources, evidence, and community analysis.`;
  }

  return `How did ${person.name} die? Review the documented findings, available sources, evidence, and community analysis surrounding ${person.name}'s death.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = await getPerson(slug);

  if (!person) {
    return {
      title: "Person Not Found | HowDidTheyDie.org",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = buildTitle(person);
  const description = buildDescription(person);
  const canonical = `${SITE_URL}/person/${encodeURIComponent(person.slug)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "profile",
      url: canonical,
      siteName: "HowDidTheyDie.org",
      title,
      description,
      images: person.image_url
        ? [
            {
              url: person.image_url,
              alt: person.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: person.image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: person.image_url ? [person.image_url] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PersonSeoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = await getPerson(slug);

  if (!person) {
    return children;
  }

  const canonical = `${SITE_URL}/person/${encodeURIComponent(person.slug)}`;

  // WebPage + Person is intentionally used here rather than Google's
  // ProfilePage rich-result type. These pages are third-party reference pages
  // about notable people, not user/author profiles owned by the person.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": canonical,
    url: canonical,
    name: buildTitle(person),
    description: buildDescription(person),
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "HowDidTheyDie.org",
    },
    mainEntity: {
      "@type": "Person",
      "@id": `${canonical}#person`,
      name: person.name,
      ...(person.birth_date ? { birthDate: person.birth_date } : {}),
      ...(person.death_date ? { deathDate: person.death_date } : {}),
      ...(person.occupation ? { jobTitle: person.occupation } : {}),
      ...(person.image_url ? { image: person.image_url } : {}),
      ...(person.source_url ? { sameAs: [person.source_url] } : {}),
      ...(person.biography
        ? { description: person.biography }
        : person.official_cause
          ? {
              description: `The officially reported cause of death for ${person.name} is ${person.official_cause}.`,
            }
          : {}),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
