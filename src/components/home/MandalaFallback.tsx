import { cn } from "@/lib/format";

/**
 * The flat mandala.
 *
 * Drawn underneath the WebGL canvas and never removed: it is what the visitor
 * sees for the moment before three.js is parsed, what a reader with WebGL
 * disabled sees permanently, and what fills the frame if the context is lost.
 * Same geometry as the 3D scene — sixteen petals, eight petals, a bindu — so
 * the swap between them is not a change of subject.
 *
 * Its colours come from `--mandala-*` in `globals.css`, which is also where the
 * two grounds are defined. A gradient stop cannot be a Tailwind utility, and
 * hard-coding one palette here would make the cross-fade a visible jump in
 * colour on whichever ground it was not tuned for.
 */
export function MandalaFallback({ className }: { className?: string }) {
  const outer = Array.from({ length: 16 }, (_, index) => index * 22.5);
  const inner = Array.from({ length: 8 }, (_, index) => index * 45 + 22.5);

  return (
    <svg
      viewBox="0 0 400 400"
      className={cn("size-full", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="mandala-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mandala-petal-top)" />
          <stop offset="100%" stopColor="var(--mandala-petal-bottom)" />
        </linearGradient>
        <linearGradient id="mandala-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mandala-gold-top)" />
          <stop offset="100%" stopColor="var(--mandala-gold-bottom)" />
        </linearGradient>
        <radialGradient id="mandala-core">
          <stop offset="0%" stopColor="#fff3dc" />
          <stop offset="60%" stopColor="#f77d12" />
          <stop offset="100%" stopColor="#bb4709" />
        </radialGradient>
      </defs>

      <g transform="translate(200 200)">
        {/* the armillary */}
        <circle r="168" fill="none" stroke="var(--mandala-metal)" strokeWidth="2" opacity="0.85" />
        <ellipse rx="145" ry="58" fill="none" stroke="var(--mandala-metal)" strokeWidth="1.5" opacity="0.5" />
        <ellipse rx="58" ry="145" fill="none" stroke="var(--mandala-metal)" strokeWidth="1.5" opacity="0.5" />

        {/* the mala — rounded to three places because Node and V8 disagree in
            the last bit of `Math.cos`, and an unrounded value renders as a
            hydration mismatch on every bead */}
        {Array.from({ length: 48 }, (_, index) => {
          const angle = (index / 48) * Math.PI * 2;
          return (
            <circle
              key={index}
              cx={(Math.cos(angle) * 168).toFixed(3)}
              cy={(Math.sin(angle) * 168).toFixed(3)}
              r="3.4"
              fill="var(--mandala-metal)"
              opacity="0.9"
            />
          );
        })}

        {/* outer whorl */}
        {outer.map((angle) => (
          <path
            key={angle}
            d="M0 -50 C 23 -58, 18 -110, 0 -128 C -18 -110, -23 -58, 0 -50 Z"
            fill="url(#mandala-petal)"
            transform={`rotate(${angle})`}
            opacity="0.92"
          />
        ))}

        {/* inner whorl */}
        {inner.map((angle) => (
          <path
            key={angle}
            d="M0 -28 C 15 -34, 12 -62, 0 -74 C -12 -62, -15 -34, 0 -28 Z"
            fill="url(#mandala-gold)"
            transform={`rotate(${angle})`}
          />
        ))}

        {/* throne and bindu */}
        <circle r="50" className="fill-navy-800 dark:fill-navy-600" />
        <circle r="50" fill="none" stroke="var(--mandala-metal)" strokeWidth="2.5" />
        <circle r="19" fill="url(#mandala-core)" />
      </g>
    </svg>
  );
}
