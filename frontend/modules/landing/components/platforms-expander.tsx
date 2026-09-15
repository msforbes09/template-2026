"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export type PlatformBentoItem = {
  key: string;
  wide?: boolean;
  card: React.ReactNode;
};

// Client leaf for the #platforms bento disclosure. The section stays a Server
// Component: it renders the 22 bento cards there and passes them in as
// `items`, so this component only owns the expanded/collapsed state and the
// reveal animation. Collapsed content remains in the HTML (SEO) but is
// height-0, aria-hidden and inert — invisible and out of the tab order.
export function PlatformsExpander({
  items,
  total,
}: {
  items: PlatformBentoItem[];
  total: number;
}) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  // Overflow must stay hidden while collapsed/animating (it is what clips the
  // grid), but has to be released once open or it would crop the cards' drop
  // shadows and hover lift.
  const [settled, setSettled] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      // Collapsing removes ~8 rows of cards; if the section header has scrolled
      // away, snap back to it so the user isn't dumped into the next section.
      // "instant" is load-bearing: the site sets `scroll-behavior: smooth`, so
      // the default (auto) starts a smooth scroll that races the height
      // collapse — the page shrinks under it and it never reaches the section.
      const section = document.getElementById("platforms");
      if (section && section.getBoundingClientRect().top < 0) {
        section.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }
  };

  return (
    <div>
      <motion.div
        id="platforms-rest"
        initial={false}
        animate={{ height: expanded ? "auto" : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }}
        onAnimationStart={() => setSettled(false)}
        onAnimationComplete={() => setSettled(expanded)}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          expanded && settled ? "overflow-visible" : "overflow-hidden",
        )}
      >
        <div className="grid grid-flow-row-dense grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.key}
              initial={false}
              animate={
                expanded
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: reduce ? 0 : 24 }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : expanded
                    ? { duration: 0.55, ease: EASE, delay: 0.1 + i * 0.035 }
                    : { duration: 0.25, ease: "easeIn" }
              }
              whileHover={
                reduce
                  ? undefined
                  : {
                      y: -6,
                      transition: {
                        type: "spring",
                        stiffness: 320,
                        damping: 22,
                      },
                    }
              }
              className={cn("h-full", item.wide && "sm:col-span-2")}
            >
              {item.card}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          className="h-12 rounded-full px-7 text-[15px]"
          aria-expanded={expanded}
          aria-controls="platforms-rest"
          onClick={toggle}
        >
          {expanded ? "Show less" : `Show all ${total} platforms`}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform duration-300",
              expanded && "rotate-180",
            )}
          />
        </Button>
      </div>
    </div>
  );
}
