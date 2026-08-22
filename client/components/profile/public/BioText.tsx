/**
 * BioText
 *
 * Presentation-layer truncation for long bios: shows the first 100 words with
 * a "Read more" toggle that expands the full text in place. The underlying
 * data is never cut — this only affects rendering.
 */

"use client";

import { useState } from "react";

const WORD_LIMIT = 100;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function BioText({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);

  if (wordCount(bio) <= WORD_LIMIT) {
    return <>{bio}</>;
  }

  const preview =
    bio.trim().split(/\s+/).slice(0, WORD_LIMIT).join(" ") + " …";

  return (
    <>
      {expanded ? bio : preview}{" "}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="font-medium text-roicard-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/40 rounded"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </>
  );
}
