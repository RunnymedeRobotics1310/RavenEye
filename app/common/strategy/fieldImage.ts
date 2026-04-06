// Convention: the field image for each game year lives at
// `app/assets/<year>/field.png`. Vite's eager glob import discovers them at
// build time — no manual wiring per year.
const FIELD_IMAGE_MODULES = import.meta.glob<{ default: string }>(
  "../../assets/*/field.png",
  { eager: true },
);

const FIELD_IMAGES: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const [path, mod] of Object.entries(FIELD_IMAGE_MODULES)) {
    const match = path.match(/\/assets\/(\d{4})\/field\.png$/);
    if (match) {
      out[parseInt(match[1]!, 10)] = mod.default;
    }
  }
  return out;
})();

/**
 * Return the bundled field-image URL for the given season year, falling back
 * to the most recent image we have if the year-specific image isn't bundled.
 *
 * To add a new year: drop `field.png` into `app/assets/YYYY/`. No code change
 * is required — Vite picks it up at build time.
 */
// 1×1 transparent PNG — used only when no field image is bundled at all.
const BLANK_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function fieldImageForYear(year: number): string {
  if (FIELD_IMAGES[year]) return FIELD_IMAGES[year]!;
  const years = Object.keys(FIELD_IMAGES)
    .map((y) => parseInt(y, 10))
    .sort((a, b) => b - a);
  if (years.length === 0) return BLANK_PIXEL;
  return FIELD_IMAGES[years[0]!]!;
}

/**
 * Per-year blank-margin widths (in SOURCE-image pixels) at the left and right
 * edges of the field image — the dead space before the interesting content
 * begins. Red alliance is on the source image's left; blue on the right. When
 * the strategy canvas rotates the field to place an alliance at the bottom of
 * the view, the matching margin is used as a bottom inset so the canvas
 * bottom lands on the interesting edge rather than the image's physical edge.
 *
 * Add a new year by dropping an entry in here. Years without an entry
 * default to zero margins.
 */
export type FieldMargins = { leftPx: number; rightPx: number };

const FIELD_MARGINS: Record<number, FieldMargins> = {
  2026: { leftPx: 140, rightPx: 140 },
};

const NO_MARGINS: FieldMargins = { leftPx: 0, rightPx: 0 };

export function fieldMarginsForYear(year: number): FieldMargins {
  return FIELD_MARGINS[year] ?? NO_MARGINS;
}

// ---------- Module-level decoded-image cache ----------
//
// Field images are shared across all plan editor mounts. Caching the decoded
// HTMLImageElement means the PNG only gets fetched + decoded once per URL per
// page session — subsequent canvas mounts reuse the same in-memory bitmap and
// render immediately.

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Resolve a bundled field image to a decoded `HTMLImageElement`. Returns the
 * cached image synchronously if it's already been loaded; otherwise fetches
 * and decodes it, then caches and resolves.
 */
export function loadFieldImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
