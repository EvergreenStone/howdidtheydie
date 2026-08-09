"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type VotePanelProps = {
  analysisId: string;
  initialConfidence: number;
  initialVoteCount: number;
};

const voteOptions = [
  { label: "Very low", value: 0 },
  { label: "Low", value: 25 },
  { label: "Possible", value: 50 },
  { label: "High", value: 75 },
  { label: "Very high", value: 100 },
];

export default function VotePanel({
  analysisId,
  initialConfidence,
  initialVoteCount,
}: VotePanelProps) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      ),
    [],
  );

  const [confidence, setConfidence] = useState(initialConfidence);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadVote() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        return;
      }

      setSignedIn(true);

      const { data } = await supabase
        .from("analysis_votes")
        .select("vote_value")
        .eq("analysis_id", analysisId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.vote_value !== undefined) {
        setMyVote(data.vote_value);
      }
    }

    void loadVote();
  }, [analysisId, supabase]);

  async function refreshSummary() {
    const { data } = await supabase.rpc("get_analysis_vote_summary", {
      p_analysis_id: analysisId,
    });

    const row = Array.isArray(data) ? data[0] : data;

    if (row) {
      setConfidence(Number(row.confidence ?? 0));
      setVoteCount(Number(row.vote_count ?? 0));
    }
  }

  async function castVote(value: number) {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSignedIn(false);
      setMessage("Sign in to vote.");
      return;
    }

    setSignedIn(true);
    setSaving(true);

    const { error } = await supabase.from("analysis_votes").upsert(
      {
        analysis_id: analysisId,
        user_id: user.id,
        vote_value: value,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "analysis_id,user_id",
      },
    );

    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }

    setMyVote(value);
    await refreshSummary();
    setSaving(false);
    setMessage("Vote saved.");
  }

  return (
    <div>
      <p className="text-sm font-semibold text-[#1d2a2a]">
        How likely is this analysis?
      </p>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {voteOptions.map((option) => {
          const selected = myVote === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              onClick={() => void castVote(option.value)}
              className={`min-w-0 rounded-lg border px-2 py-3 text-center text-xs font-semibold leading-tight transition ${
                selected
                  ? "border-[#a65336] bg-[#a65336] text-white"
                  : "border-[#d2ccc1] bg-white text-[#1d2a2a] hover:border-[#a65336]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {myVote !== null && (
        <p className="mt-3 text-xs font-semibold text-[#315a46]">
          Your vote:{" "}
          {voteOptions.find((option) => option.value === myVote)?.label}
        </p>
      )}

      {!signedIn && (
        <p className="mt-3 text-xs text-[#66706d]">
          <a href="/sign-in" className="font-semibold text-[#a65336]">
            Sign in
          </a>{" "}
          to vote anonymously.
        </p>
      )}

      {message && (
        <p className="mt-3 text-xs text-[#315a46]">{message}</p>
      )}

      <p className="mt-4 text-xs leading-5 text-[#7a817f]">
        Community confidence reflects signed-in user opinion, not an official
        finding.
      </p>
    </div>
  );
}
