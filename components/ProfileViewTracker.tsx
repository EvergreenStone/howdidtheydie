"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ProfileViewTracker({
  personId,
}: {
  personId: string;
}) {
  useEffect(() => {
    const key = `hdtd:view:${personId}`;
    const lastRecorded = Number(sessionStorage.getItem(key) || "0");
    const now = Date.now();

    // Avoid counting repeated refreshes of the same profile in the same tab.
    if (now - lastRecorded < 30 * 60 * 1000) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    void supabase
      .from("profile_views")
      .insert({ person_id: personId })
      .then(({ error }) => {
        if (!error) {
          sessionStorage.setItem(key, String(now));
        }
      });
  }, [personId]);

  return null;
}
