"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the reveal starts once in view. */
  delay?: number;
  /** Which edge the element slides in from. */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Skip the reveal animation entirely (always visible). */
  disabled?: boolean;
};

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  disabled = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled]);

  const hidden =
    !disabled && !inView
      ? {
          up: "opacity-0 -translate-y-6",
          down: "opacity-0 translate-y-6",
          left: "opacity-0 -translate-x-6",
          right: "opacity-0 translate-x-6",
          none: "opacity-0",
        }[direction]
      : "";

  const style: CSSProperties = { transitionDelay: delay ? `${delay}ms` : undefined };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        hidden,
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}