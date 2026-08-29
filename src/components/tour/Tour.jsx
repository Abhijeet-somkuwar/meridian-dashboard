import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Button } from '../ui/index.jsx';

/**
 * Guided tour ("coach marks").
 *
 * A step points at a real element on the page via a `data-tour` attribute,
 * rings it, dims everything else, and explains what it does. Steps whose
 * target is not on the current screen are dropped when the tour starts, so a
 * page in an empty state never strands the user on a step pointing at nothing.
 *
 * Two things make it feel instant rather than laggy, and both are deliberate:
 *
 * 1. **Scrolling is instant, the ring is what animates.** Smooth-scrolling the
 *    page and *then* measuring meant ~300ms of nothing happening followed by a
 *    jump, and it repainted the full-screen dimmer on every scroll event. Now
 *    the page jumps straight to the target (only if it is not already visible)
 *    and the ring glides from the old element to the new one in a single CSS
 *    transition - one animation, no dead time.
 * 2. **The card never unmounts.** It used to be re-keyed per step, so it
 *    teleported while the ring glided. Now the box glides with the ring and
 *    only the text inside crossfades.
 */

const TourContext = createContext(null);
export const useTour = () => useContext(TourContext);

const PADDING = 8;
const CARD_WIDTH = 340;
const GAP = 14;
const MARGIN = 12;

const rectOf = (selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const sameRect = (a, b) =>
  a === b ||
  (Boolean(a) &&
    Boolean(b) &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5);

/** Comfortably visible, not merely touching the viewport edge. */
const isWellInView = (r) => r.top >= 72 && r.left >= 0 && r.top + r.height <= window.innerHeight - 72;

export const TourProvider = ({ children }) => {
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const rectRef = useRef(null);

  const stop = useCallback(() => {
    setSteps([]);
    setIndex(0);
    setRect(null);
    rectRef.current = null;
  }, []);

  const start = useCallback((candidateSteps) => {
    const available = candidateSteps.filter((s) => !s.selector || rectOf(s.selector));
    if (!available.length) return false;
    setSteps(available);
    setIndex(0);
    return true;
  }, []);

  const active = steps.length > 0;
  const step = active ? steps[index] : null;

  // Measure before paint so the ring's CSS transition starts from the old
  // position and lands on the new one - the whole movement is one animation.
  useLayoutEffect(() => {
    if (!step) return undefined;

    const measure = () => {
      const next = step.selector ? rectOf(step.selector) : null;
      if (sameRect(rectRef.current, next)) return;
      rectRef.current = next;
      setRect(next);
    };

    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      // Instant, not smooth: the ring carries the motion, the page does not.
      if (!isWellInView(r)) el.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
    measure();

    // A short settle pass catches anything that reflows just after the jump
    // (sticky headers, images, a table that finished laying out).
    let frame;
    const until = performance.now() + 500;
    const settle = () => {
      measure();
      if (performance.now() < until) frame = requestAnimationFrame(settle);
    };
    frame = requestAnimationFrame(settle);

    // While the user scrolls or resizes during the tour, keep the ring pinned -
    // rAF-throttled so one measurement happens per painted frame, not per event.
    let queued = false;
    const onViewportChange = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        measure();
      });
    };
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [step]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < steps.length ? i + 1 : (stop(), i)));
  }, [steps.length, stop]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') stop();
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, next, back, stop]);

  return (
    <TourContext.Provider value={{ start, stop, active }}>
      {children}
      {active &&
        createPortal(
          <TourOverlay
            step={step}
            rect={rect}
            index={index}
            total={steps.length}
            onNext={next}
            onBack={back}
            onJump={setIndex}
            onClose={stop}
          />,
          document.body,
        )}
    </TourContext.Provider>
  );
};

/**
 * Below the target, else above, else beside it, else parked in the corner.
 * The tall targets (the sidebar) are exactly why "above/below" alone was not
 * enough - there was no room either way and the card landed on top of the ring.
 */
const placeCard = (ring, card) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.min(Math.max(MARGIN, x), Math.max(MARGIN, vw - card.width - MARGIN));
  const clampY = (y) => Math.min(Math.max(MARGIN, y), Math.max(MARGIN, vh - card.height - MARGIN));
  const centreX = clampX(ring.left + ring.width / 2 - card.width / 2);
  const centreY = clampY(ring.top + ring.height / 2 - card.height / 2);

  if (ring.top + ring.height + GAP + card.height + MARGIN <= vh) {
    return { top: ring.top + ring.height + GAP, left: centreX };
  }
  if (ring.top - GAP - card.height - MARGIN >= 0) {
    return { top: ring.top - GAP - card.height, left: centreX };
  }
  if (ring.left + ring.width + GAP + card.width + MARGIN <= vw) {
    return { top: centreY, left: ring.left + ring.width + GAP };
  }
  if (ring.left - GAP - card.width - MARGIN >= 0) {
    return { top: centreY, left: ring.left - GAP - card.width };
  }
  return { top: vh - card.height - MARGIN, left: vw - card.width - MARGIN };
};

const TourOverlay = ({ step, rect, index, total, onNext, onBack, onJump, onClose }) => {
  const cardRef = useRef(null);
  const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 210 });

  // Placement needs the card's real height - guessing it is what used to push
  // the card off-screen on the longer steps.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      setCardSize((prev) =>
        Math.abs(prev.height - r.height) < 1 && Math.abs(prev.width - r.width) < 1
          ? prev
          : { width: r.width, height: r.height },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const ring = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  const cardStyle = ring
    ? { ...placeCard(ring, cardSize), width: CARD_WIDTH }
    : {
        top: Math.max(MARGIN, window.innerHeight / 2 - cardSize.height / 2),
        left: Math.max(MARGIN, window.innerWidth / 2 - CARD_WIDTH / 2),
        width: CARD_WIDTH,
      };

  return (
    <>
      {/* Swallows clicks on the page underneath: the tour explains, it never
          changes anything. Clicking it moves on, which is what people try. */}
      <div className="fixed inset-0 z-[59]" onClick={onNext} aria-hidden="true" />

      {/* The dimmer is the ring's own huge outer shadow, so the target stays lit. */}
      {ring ? (
        <div
          className="fixed z-[60] rounded-xl pointer-events-none tour-ring"
          style={{
            ...ring,
            boxShadow:
              '0 0 0 2px rgba(99, 102, 241, 1), 0 0 22px 5px rgba(99, 102, 241, 0.45), 0 0 0 9999px rgba(6, 8, 15, 0.8)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[60] bg-black/[0.78] pointer-events-none tour-fade" />
      )}

      <div
        ref={cardRef}
        className="fixed z-[61] card shadow-lift p-5 tour-card"
        style={cardStyle}
        role="dialog"
        aria-label={step.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div key={index} className="tour-step">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
            <button
              onClick={onClose}
              aria-label="Close the walkthrough"
              className="text-muted hover:text-ink transition-colors -mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-strong leading-relaxed">{step.body}</p>

          {step.tip && (
            <p className="text-xs text-primary mt-2.5 border-l-2 border-primary/40 pl-2.5">{step.tip}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Step ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 hover:bg-primary/70 ${
                  i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border-strong'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button size="sm" variant="ghost" icon={ArrowLeft} onClick={onBack}>
                Back
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={onNext}>
              {index + 1 === total ? 'Done' : 'Next'}
              {index + 1 < total && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-muted mt-2.5">
          Step {index + 1} of {total} · click anywhere or press → to continue, Esc to close
        </p>
      </div>
    </>
  );
};
