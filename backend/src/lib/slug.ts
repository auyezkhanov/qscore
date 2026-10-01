import { transliterate } from "./i18n";

export function slugify(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Returns `base`, or `base-2`, `base-3`… — the first one `isTaken` rejects. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "item";
  let slug = root;
  for (let n = 2; await isTaken(slug); n++) slug = `${root}-${n}`;
  return slug;
}
