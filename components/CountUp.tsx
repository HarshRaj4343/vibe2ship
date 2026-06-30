'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animated number that counts up from 0 to `value` once, the first time it
 * scrolls into view. Respects `prefers-reduced-motion` (renders the final value
 * immediately). Used for dashboard + landing stats — the count-up doubles as a
 * lightweight "impact" reveal.
 */
export default function CountUp({
  value,
  durationMs = 1100,
  className,
  suffix = '',
  prefix = '',
}: {
  value: number;
  durationMs?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const run = () => {
      if (started.current) return;
      started.current = true;

      if (reduce || value === 0) {
        setDisplay(value);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1);
        // ease-out-quart — decelerates smoothly, no bounce.
        const eased = 1 - Math.pow(1 - t, 4);
        setDisplay(Math.round(eased * value));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
