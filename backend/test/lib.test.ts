import { describe, expect, it, vi } from "vitest";
import { countryName, localized, transliterate } from "../src/lib/i18n";
import { slugify, uniqueSlug } from "../src/lib/slug";
import { TtlCache } from "../src/lib/cache";

describe("transliterate / localized", () => {
  it("transliterates Russian and Kazakh letters", () => {
    expect(transliterate("Жансұлтан Мұхаметханов")).toBe("Zhansultan Mukhametkhanov");
  });
  it("prefers established exonyms", () => {
    expect(transliterate("Алматы")).toBe("Almaty");
    expect(transliterate("Усть-Каменогорск")).toBe("Oskemen");
  });
  it("picks the English source name when present, else transliterates", () => {
    expect(localized("Кайрат", "Kairat", "en")).toBe("Kairat");
    expect(localized("Кайрат", null, "en")).toBe("Kayrat");
    expect(localized("Кайрат", "Kairat", "ru")).toBe("Кайрат");
    expect(localized(null, null, "en")).toBeNull();
  });
  it("localizes countries from ISO codes", () => {
    expect(countryName("KZ", "Казахстан", "en")).toBe("Kazakhstan");
    expect(countryName("RS", null, "ru")).toBe("Сербия");
    expect(countryName(null, "Казахстан", "en")).toBe("Kazakhstan");
  });
});

describe("slugs", () => {
  it("slugifies Cyrillic names", () => {
    expect(slugify("Кайрат-Жастар")).toBe("kayrat-zhastar");
    expect(slugify("  Astana M  ")).toBe("astana-m");
  });
  it("appends a counter on collisions", async () => {
    const taken = new Set(["kairat", "kairat-2"]);
    expect(await uniqueSlug("kairat", async (s) => taken.has(s))).toBe("kairat-3");
  });
});

describe("TtlCache", () => {
  it("coalesces concurrent loads and caches the result", async () => {
    const cache = new TtlCache<number>(1000);
    const load = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.get("k", load), cache.get("k", load)]);
    expect([a, b]).toEqual([42, 42]);
    expect(await cache.get("k", load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("does not cache failures", async () => {
    const cache = new TtlCache<number>(1000);
    await expect(cache.get("k", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(await cache.get("k", async () => 7)).toBe(7);
  });
});

describe("English name clean-up", () => {
  it("title-cases shouted names and transliterates Cyrillic 'English' names", () => {
    expect(localized("Роман", "ROMAN ASRANKULOV", "en")).toBe("Roman Asrankulov");
    expect(localized("x", "Alexandr SHIROBOKOV", "en")).toBe("Alexandr Shirobokov");
    expect(localized("x", "FK Astana", "en")).toBe("FK Astana");
    expect(localized("x", "Давид Этон", "en")).toBe("David Eton");
  });
});
