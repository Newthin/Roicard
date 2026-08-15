"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type TypewriterProps = {
  words: string[];
  /** Word index whose text is styled with the gradient (e.g. "Belong"). */
  gradientIndex?: number;
  className?: string;
  /** Typing speed per character in ms. */
  speed?: number;
  /** Delay before typing starts, ms. */
  delay?: number;
  /** Word break between typed words (" ", or "" to join). */
  wordSeparator?: string;
};

const GRADIENT_CLASS = "roicard-gradient-text";

/**
 * Types each word one character at a time with a blinking caret, then leaves a
 * static caret pulsing once complete. Ideal for the hero headline.
 */
export function Typewriter({
  words,
  gradientIndex = -1,
  className,
  speed = 70,
  delay = 300,
  wordSeparator = " ",
}: TypewriterProps) {
  const [typed, setTyped] = useState<string[]>(() =>
    words.map(() => "")
  );
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const start = setTimeout(() => {
      let wordIdx = 0;
      let charIdx = 0;

      const tick = () => {
        if (wordIdx >= words.length) {
          setDone(true);
          return;
        }

        setTyped((prev) => {
          const next = [...prev];
          next[wordIdx] = words[wordIdx].slice(0, charIdx + 1);
          return next;
        });

        charIdx += 1;
        if (charIdx > words[wordIdx].length) {
          wordIdx += 1;
          charIdx = 0;
        }

        timer = setTimeout(tick, speed);
      };

      let timer: ReturnType<typeof setTimeout> = setTimeout(tick, speed);
      return () => clearTimeout(timer);
    }, delay);

    return () => clearTimeout(start);
  }, [words, speed, delay]);

  return (
    <span className={className} aria-label={words.join(wordSeparator)}>
      {typed.map((text, i) => (
        <span key={i}>
          <span className={i === gradientIndex ? GRADIENT_CLASS : undefined}>
            {text}
          </span>
          {i < words.length - 1 && wordSeparator}
        </span>
      ))}
      <span
        className={cn(
          "ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-[0.12em] bg-roicard-accent",
          done ? "typewriter-caret-steady" : "typewriter-caret-blink"
        )}
        aria-hidden
      />
    </span>
  );
}