/**
 * The demo mirrors the docs guide sidebar one-to-one: same sections, same
 * reading order. Each page here is the visual companion of one guide.
 */
export interface GuideMeta {
  slug: string;
  num: string;
  title: string;
}

export const guides = [
  { slug: "field-definitions", num: "01", title: "Field definitions" },
  { slug: "transforms", num: "02", title: "Transforms" },
  { slug: "modules", num: "03", title: "Modules & context" },
  { slug: "rules", num: "04", title: "Rules & the engine API" },
  { slug: "validation", num: "05", title: "Validation & errors" },
  { slug: "row-model", num: "06", title: "The row model" },
  { slug: "rendering", num: "07", title: "Rendering" },
  { slug: "custom-field-types", num: "08", title: "Custom field types" },
  { slug: "localization", num: "09", title: "Localization" },
] as const satisfies readonly GuideMeta[];

export type GuideSlug = (typeof guides)[number]["slug"];

export function guide(slug: GuideSlug): GuideMeta {
  const meta = guides.find((entry) => entry.slug === slug);
  if (meta === undefined) {
    throw new Error(`Unknown guide: ${slug}`);
  }
  return meta;
}

export const DOCS_URL = "https://xkirtle.github.io/react-form-engine/";

export function guideUrl(slug: GuideSlug): string {
  return `${DOCS_URL}guide/${slug}`;
}
