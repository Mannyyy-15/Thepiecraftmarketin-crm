"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

import type { TargetAndTransition } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "scale" | "fade";

const variants: Record<Direction, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  up:    { initial: { opacity: 0, y: 14 },    animate: { opacity: 1, y: 0 } },
  down:  { initial: { opacity: 0, y: -14 },   animate: { opacity: 1, y: 0 } },
  left:  { initial: { opacity: 0, x: -14 },   animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: 14 },    animate: { opacity: 1, x: 0 } },
  scale: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } },
  fade:  { initial: { opacity: 0 },            animate: { opacity: 1 } },
};

interface AnimateInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: Direction;
  className?: string;
}

export function AnimateIn({
  children,
  delay = 0,
  duration = 0.38,
  direction = "up",
  className,
}: AnimateInProps) {
  const v = variants[direction];
  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger a list of items — wrap each child with AnimateIn
export function StaggerList({
  children,
  stagger = 0.07,
  direction = "up",
  duration = 0.35,
  className,
}: {
  children: ReactNode[];
  stagger?: number;
  direction?: Direction;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <AnimateIn key={i} delay={i * stagger} direction={direction} duration={duration}>
          {child}
        </AnimateIn>
      ))}
    </div>
  );
}
