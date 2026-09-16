"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";

// Shared Framer Motion primitives for the landing page. Companion to `Reveal`
// (single fade-up); these cover orchestrated staggers, continuous float, and
// count-up numbers. Every primitive honors `prefers-reduced-motion`.

const EASE = [0.16, 1, 0.3, 1] as const;

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// Orchestrates a staggered reveal of its <StaggerItem> children as the group
// scrolls into view. Server-rendered children pass straight through.
export function Stagger({
  children,
  className,
  stagger = 0.1,
  delayChildren = 0,
  amount = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        show: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

// A single item within a <Stagger>. `lift` adds a springy hover raise.
export function StaggerItem({
  children,
  className,
  lift = false,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : ITEM_VARIANTS}
      whileHover={
        reduce || !lift
          ? undefined
          : { y: -6, transition: { type: "spring", stiffness: 320, damping: 22 } }
      }
    >
      {children}
    </motion.div>
  );
}

// Gentle, continuous vertical float — used for the hero's floating cards.
export function Floating({
  children,
  className,
  y = 10,
  duration = 5,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -y, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// Counts from 0 up to `value` once scrolled into view, then holds.
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  // Reduced-motion users skip the tween and read the final figure directly.
  const shown = reduce ? value : display;
  const formatted = shown.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
