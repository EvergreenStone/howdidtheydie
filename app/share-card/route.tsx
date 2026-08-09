import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f1ea",
          padding: "64px 72px",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#1d2a2a",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: "-1.5px",
          }}
        >
          <span>howdidtheydie</span>
          <span style={{ color: "#a65336" }}>.org</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#a65336",
              marginBottom: 28,
            }}
          >
            OFFICIAL FINDINGS • EVIDENCE • COMMUNITY ANALYSIS
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: 78,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: "-4px",
              whiteSpace: "nowrap",
            }}
          >
            <span>How did they&nbsp;</span>
            <span style={{ color: "#a65336" }}>really</span>
            <span>&nbsp;die?</span>
          </div>

          <div
            style={{
              display: "flex",
              maxWidth: 920,
              marginTop: 28,
              fontSize: 27,
              lineHeight: 1.35,
              color: "#586260",
            }}
          >
            Official findings stay separate from community confidence and the
            strength of supporting evidence.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #d9d3c7",
            paddingTop: 24,
            fontSize: 22,
            color: "#66706d",
          }}
        >
          <span>Community-reviewed • Evidence-based • Continuously updated</span>
          <span style={{ color: "#a65336", fontWeight: 700 }}>
            howdidtheydie.org
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
