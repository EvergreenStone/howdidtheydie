"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type SourceQualityProps = {
  sourceId: string;
  initialScore: number;
  initialVoteCount: number;
};

const options = [
  { label: "Poor", value: 0 },
  { label: "Weak", value: 25 },
  { label: "Fair", value: 50 },
  { label: "Good", value: 75 },
  { label: "Excellent", value: 100 },
];

export default function SourceQuality({
  sourceId,
  initialScore,
  initialVoteCount,
}: SourceQualityProps) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [score, setScore] = useState(initialScore);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMine() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        return;
      }

      setSignedIn(true);

      const { data } = await supabase
        .from("source_votes")
        .select("quality_value")
        .eq("source_id", sourceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.quality_value !== undefined) {
        setMyVote(data.quality_value);
      }
    }

    void loadMine();
  }, [sourceId, supabase]);

  async function refreshSummary() {
    const { data } = await supabase.rpc("get_source_vote_summary", {
      p_source_id: sourceId,
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (row) {
      setScore(Number(row.quality_score ?? 0));
      setVoteCount(Number(row.vote_count ?? 0));
    }
  }

  async function vote(value: number) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedIn(false);
      setMessage("Sign in to rate this source.");
      return;
    }

    setSignedIn(true);
    setSaving(true);

    const { error } = await supabase.from("source_votes").upsert(
      {
        source_id: sourceId,
        user_id: user.id,
        quality_value: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id,user_id" },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMyVote(value);
    await refreshSummary();
    setSaving(false);
    setMessage("Source rating saved.");
  }

  return (
    <div className="mt-4 rounded-xl border border-[#ded8ce] bg-white p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a65336]">
            Source quality
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {voteCount > 0 ? `${score}/100` : "Not rated"}
          </p>
        </div>

        <p className="text-xs text-[#66706d]">
          {voteCount} {voteCount === 1 ? "rating" : "ratings"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={saving}
            onClick={() => void vote(option.value)}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold ${
              myVote === option.value
                ? "border-[#a65336] bg-[#a65336] text-white"
                : "border-[#d2ccc1] bg-[#f8f6f1]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!signedIn && (
        <p className="mt-3 text-xs text-[#66706d]">
          <a href="/sign-in" className="font-semibold text-[#a65336]">
            Sign in
          </a>{" "}
          to rate source quality.
        </p>
      )}

      {message && (
        <p className="mt-3 text-xs text-[#315a46]">{message}</p>
      )}
    </div>
  );
}
