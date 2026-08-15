"use client";

import { useEffect, useRef, useState } from "react";

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
 * Types each word one character at a time. Ideal for the hero headline.
 *
 * Typing is derived from a running character count over the joined string, so
 * the render never indexes past the end of `words` (previously the setState
 * updater closed over mutated loop variables and read `words[t]` out of bounds).
 */
export function Typewriter({
  words,
  gradientIndex = -1,
  className,
  speed = 70,
  delay = 300,
  wordSeparator = " ",
}: TypewriterProps) {
  const wordsRef = useRef(words);
  const fullText = wordsRef.current.join(wordSeparator);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;

    const start = setTimeout(() => {
      const id = setInterval(() => {
        current += 1;
        if (current >= fullText.length) {
          clearInterval(id);
          setCount(fullText.length);
        } else {
          setCount(current);
        }
      }, speed);
    }, delay);

    return () => clearTimeout(start);
  }, [speed, delay, fullText]);

  const typedText = fullText.slice(0, count);

  let offset = 0;
  const perWord = wordsRef.current.map((w) => {
    const segment = typedText.slice(offset, offset + w.length);
    offset += w.length + wordSeparator.length;
    return segment;
  });

  return (
    <span className={className} aria-label={fullText}>
      {perWord.map((text, i) => (
        <span key={i}>
          <span className={i === gradientIndex ? GRADIENT_CLASS : undefined}>
            {text}
          </span>
          {i < wordsRef.current.length - 1 && wordSeparator}
        </span>
      ))}
    </span>
  );
}