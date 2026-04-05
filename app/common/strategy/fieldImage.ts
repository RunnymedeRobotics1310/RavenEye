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
