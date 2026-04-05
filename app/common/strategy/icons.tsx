// Small inline SVG icons for the strategy canvas toolbar. Currentcolor-based
// so they inherit text colour from their parent button.

type IconProps = { size?: number };

export const UndoIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Curved arrow pointing left/up — traditional undo glyph. */}
    <path d="M3 8 C 3 4.5, 6 3, 9 3 C 12 3, 14 5, 14 8 C 14 11, 12 13, 9 13" />
    <polyline points="3,4 3,8 7,8" />
  </svg>
);

export const EraserIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Tilted rubber-eraser outline with a diagonal crease marking the
        eraser/ferrule boundary. */}
    <path d="M 2.5 10 L 8.5 2.5 L 13.5 6.5 L 7.5 14 L 2.5 10 Z" />
    <line x1="5.5" y1="7.5" x2="10.5" y2="11.5" />
  </svg>
);

export const ArrowIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Rotated -45° around centre so the arrow points up-right — matches
        the diagonal feel of real strategy sketches. */}
    <g transform="rotate(-45 8 8)">
      <line x1="2" y1="8" x2="12" y2="8" />
      <polyline points="8,4 12,8 8,12" />
    </g>
  </svg>
);

export const LineIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Same -45° tilt as ArrowIcon for visual consistency. */}
    <g transform="rotate(-45 8 8)">
      <line x1="2" y1="8" x2="14" y2="8" />
    </g>
  </svg>
);

export const StopIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
  </svg>
);

export const LockedIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Closed padlock — symmetric U-shackle, both feet on the body. */}
    <rect x="3" y="8" width="10" height="6" rx="1" />
    <path d="M5.5 8 V5.5 a2.5 2.5 0 0 1 5 0 V8" />
  </svg>
);

export const UnlockedIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Open padlock — shackle swung up and to the right, only the left
        foot meets the body. The right end floats clearly above the body. */}
    <rect x="3" y="8" width="10" height="6" rx="1" />
    <path d="M5.5 8 V5.5 a2.5 2.5 0 0 1 5 -2" />
  </svg>
);

export const PanIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Four-way arrows emanating from the centre — the conventional
        "move / pan" glyph. */}
    <line x1="8" y1="2.5" x2="8" y2="13.5" />
    <line x1="2.5" y1="8" x2="13.5" y2="8" />
    <polyline points="5.5,5 8,2.5 10.5,5" />
    <polyline points="5.5,11 8,13.5 10.5,11" />
    <polyline points="5,5.5 2.5,8 5,10.5" />
    <polyline points="11,5.5 13.5,8 11,10.5" />
  </svg>
);

export const LabelsIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Small filled square on the left (the "icon") beside two short
        horizontal lines on the right (the "text labels"). Visually depicts
        an icon-plus-text pairing. */}
    <rect x="2" y="5" width="4.5" height="6" rx="0.6" fill="currentColor" />
    <line
      x1="8.5"
      y1="6.5"
      x2="14"
      y2="6.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="8.5"
      y1="9.5"
      x2="12.5"
      y2="9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const EnterFullscreenIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Four L-brackets in the outer corners, arms touching the edges —
        the classic "expand" glyph. */}
    <path d="M3 6 V3 H6" />
    <path d="M10 3 H13 V6" />
    <path d="M13 10 V13 H10" />
    <path d="M6 13 H3 V10" />
  </svg>
);

export const ExitFullscreenIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Four L-brackets forming an inner square, arms pointing outward
        toward the corners — the standard "compress" glyph. */}
    <path d="M3 6 H6 V3" />
    <path d="M10 3 V6 H13" />
    <path d="M13 10 H10 V13" />
    <path d="M6 13 V10 H3" />
  </svg>
);

export const TrashIcon = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ verticalAlign: "-0.15em" }}
  >
    {/* Trash can — lid on top, body with two vertical strokes. */}
    <line x1="2.5" y1="4" x2="13.5" y2="4" />
    <path d="M6 4 V2.5 h4 V4" />
    <path d="M4 4 L5 14 h6 L12 4" />
    <line x1="7" y1="7" x2="7" y2="12" />
    <line x1="9" y1="7" x2="9" y2="12" />
  </svg>
);
