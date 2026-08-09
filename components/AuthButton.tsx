"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

type Profile = {
  display_name: string | null;
  role: string | null;
};

export default function AuthButton() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setEmail(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      setProfile((data as Profile | null) ?? null);
      setLoading(false);
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setEmail(null);
    setProfile(null);
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="ml-2 h-10 w-20 animate-pulse rounded-lg bg-[#e5e0d7]" />
    );
  }

  if (!email) {
    return (
      <a
        href="/sign-in"
        className="ml-2 flex h-10 items-center rounded-lg bg-[#1d2a2a] px-5 font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#31413f]"
      >
        Sign in
      </a>
    );
  }

  const displayName =
    profile?.display_name?.trim() || email.split("@")[0] || "Account";

  return (
    <div className="ml-2 flex items-center gap-2">
      {profile?.role === "admin" && (
        <a
          href="/admin"
          className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#a65336] transition hover:bg-[#ece7de]"
        >
          Admin
        </a>
      )}

      <a
        href="/add-person"
        className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold transition hover:bg-[#ece7de] hover:text-[#a65336]"
      >
        + Add person
      </a>

      <span className="hidden text-sm font-semibold text-[#586260] lg:inline">
        {displayName}
      </span>

      <button
        type="button"
        onClick={handleSignOut}
        className="flex h-10 items-center rounded-lg bg-[#1d2a2a] px-4 text-sm font-medium text-white transition hover:bg-[#31413f]"
      >
        Sign out
      </button>
    </div>
  );
}