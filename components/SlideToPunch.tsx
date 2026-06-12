"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronsRight, Check, Loader2 } from "lucide-react";

type Variant = "in" | "out";

interface SlideToPunchProps {
  /** "in" => punch in (brand color); "out" => punch out (rose color). */
  variant: Variant;
  /** Called when the user slides to the end. Should perform the async punch. */
  onComplete: () => void | Promise<void>;
  /** Disable interaction (e.g. while a punch is processing). */
  loading?: boolean;
  /** Optional label override. */
  label?: string;
  className?: string;
}

const HANDLE = 52;        // handle diameter (px)
const PAD = 4;            // track inner padding (px)
const COMPLETE_AT = 0.92; // fraction of travel that counts as "completed"

/**
 * A smooth, reliable slide-to-confirm control.
 *
 * Why it doesn't lag / get stuck like the old one:
 *  - Pointer Events + setPointerCapture: the drag keeps tracking even if the
 *    finger drifts off the handle, so it never "sticks" mid-track.
 *  - The handle is moved by writing transform directly to the DOM ref during
 *    the drag (no React state per frame) — buttery on low-end phones.
 *  - touch-action:none stops the browser from stealing the gesture for scroll.
 *  - On release it either snaps to the end (and fires onComplete) or springs
 *    back to 0 with a single CSS transition.
 */
export default function SlideToPunch({
  variant,
  onComplete,
  loading = false,
  label,
  className = "",
}: SlideToPunchProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const maxXRef = useRef(0);
  const xRef = useRef(0);

  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  const isBusy = loading || done;

  const colors =
    variant === "in"
      ? { fill: "bg-brand-500 dark:bg-brand-600", handleText: "text-brand-600 dark:text-brand-400", ring: "border-brand-200 dark:border-brand-900/40" }
      : { fill: "bg-rose-500 dark:bg-rose-600", handleText: "text-rose-600 dark:text-rose-400", ring: "border-rose-200 dark:border-rose-900/40" };

  const maxTravel = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    return track.clientWidth - HANDLE - PAD * 2;
  }, []);

  const paint = useCallback((x: number) => {
    if (handleRef.current) handleRef.current.style.transform = `translate3d(${x}px,0,0)`;
    if (fillRef.current) fillRef.current.style.width = `${x + HANDLE}px`;
  }, []);

  const setTransition = useCallback((on: boolean) => {
    const t = on ? "transform 0.28s cubic-bezier(0.22,1,0.36,1)" : "none";
    const tw = on ? "width 0.28s cubic-bezier(0.22,1,0.36,1)" : "none";
    if (handleRef.current) handleRef.current.style.transition = t;
    if (fillRef.current) fillRef.current.style.transition = tw;
  }, []);

  const reset = useCallback(() => {
    setTransition(true);
    xRef.current = 0;
    paint(0);
  }, [paint, setTransition]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isBusy) return;
      draggingRef.current = true;
      setDragging(true);
      maxXRef.current = maxTravel();
      startXRef.current = e.clientX - xRef.current;
      setTransition(false);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      if (navigator.vibrate) navigator.vibrate(8);
    },
    [isBusy, maxTravel, setTransition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const max = maxXRef.current || maxTravel();
      let x = e.clientX - startXRef.current;
      if (x < 0) x = 0;
      if (x > max) x = max;
      xRef.current = x;
      paint(x);
    },
    [maxTravel, paint]
  );

  const finish = useCallback(async () => {
    setDone(true);
    setTransition(true);
    paint(maxXRef.current || maxTravel());
    if (navigator.vibrate) navigator.vibrate(40);
    try {
      await onComplete();
    } finally {
      // Spring back so the control is reusable for the next action.
      setTimeout(() => {
        setDone(false);
        reset();
      }, 600);
    }
  }, [maxTravel, onComplete, paint, reset, setTransition]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      const max = maxXRef.current || maxTravel();
      if (max > 0 && xRef.current >= max * COMPLETE_AT) {
        finish();
      } else {
        reset();
      }
    },
    [finish, maxTravel, reset]
  );

  // Keep the handle pinned correctly if the track resizes (orientation change).
  useEffect(() => {
    const onResize = () => { if (!draggingRef.current && !done) { xRef.current = 0; paint(0); } };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [done, paint]);

  const text = done
    ? variant === "in" ? "Punching in…" : "Punching out…"
    : loading
    ? "Processing…"
    : label ?? (variant === "in" ? "Slide to punch in" : "Slide to punch out");

  return (
    <div
      ref={trackRef}
      className={`relative h-[60px] w-full rounded-full overflow-hidden select-none border bg-slate-100 dark:bg-slate-800/60 ${colors.ring} ${isBusy ? "opacity-90" : ""} ${className}`}
      style={{ touchAction: "none", padding: PAD }}
    >
      {/* Color fill that grows behind the handle */}
      <div
        ref={fillRef}
        className={`absolute left-0 top-0 bottom-0 rounded-full ${colors.fill}`}
        style={{ width: `${HANDLE}px` }}
      />

      {/* Centered label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 flex items-center gap-1.5">
          {loading || done ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {text}
        </span>
      </div>

      {/* Draggable handle */}
      <div
        ref={handleRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-md ${isBusy ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${dragging ? "scale-105" : ""}`}
        style={{
          width: HANDLE,
          height: HANDLE,
          left: PAD,
          transition: "transform 0.28s cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        {done ? (
          <Check className={`h-5 w-5 ${colors.handleText}`} />
        ) : (
          <ChevronsRight className={`h-5 w-5 ${colors.handleText}`} />
        )}
      </div>
    </div>
  );
}
