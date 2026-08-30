/**
 * The Meridian mark: a globe crossed by its meridian, with one dot at the pole.
 *
 * The dot is culmination - the highest point a thing reaches - which on a
 * results page is position one. It is the only colour the mark carries, so it
 * stays the thing the eye lands on.
 */

/**
 * A stroke that holds its weight as the mark shrinks. Drawn on a 24-unit grid,
 * so a smaller render needs a proportionally heavier stroke or the whole thing
 * turns to wire. The steps come from the drawn artwork: 48 -> 1.6, 32 -> 1.8,
 * 24 -> 2.0, 16 -> 2.6, interpolated between.
 */
const strokeFor = (size) => {
  if (size >= 48) return 1.6;
  if (size >= 32) return 1.6 + (48 - size) * 0.0125;
  if (size >= 24) return 1.8 + (32 - size) * 0.025;
  return 2.0 + (24 - size) * 0.075;
};

export const Logo = ({ size = 24, stroke = '#F1F5F9', dot = '#6366F1', className }) => {
  const w = strokeFor(size);
  // Below ~18px the meridian ellipse closes up into the outer circle and reads
  // as noise. Dropping it is what keeps the favicon legible.
  const showMeridian = size >= 18;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={w} />
      {showMeridian && <ellipse cx="12" cy="12" rx="4.1" ry="9" stroke={stroke} strokeWidth={w} />}
      <circle cx="12" cy="3" r={showMeridian ? 2.1 : 3} fill={dot} />
    </svg>
  );
};

/**
 * The mark in its indigo tile - the app header, the sign-in screen, anywhere a
 * square avatar-sized lockup is wanted. `size` is the tile; the mark inside is
 * scaled to it.
 */
export const LogoTile = ({ size = 40, className = '' }) => (
  <div
    className={`grid place-items-center rounded-xl bg-primary ${className}`}
    style={{ width: size, height: size }}
  >
    <Logo size={Math.round(size * 0.55)} stroke="#FFFFFF" dot="#FFFFFF" />
  </div>
);
