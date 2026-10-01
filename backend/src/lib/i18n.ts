import type { Request } from "express";

export type Lang = "ru" | "en";

export function langOf(req: Request): Lang {
  return req.query.lang === "en" ? "en" : "ru";
}

// Practical Cyrillic (Russian + Kazakh) -> Latin transliteration. Only used as
// a fallback when the source has no English spelling for a proper noun.
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

// Established English exonyms that a letter-by-letter transliteration gets wrong.
const EXONYMS: Record<string, string> = {
  Алматы: "Almaty",
  Астана: "Astana",
  Шымкент: "Shymkent",
  Караганда: "Karaganda",
  Қарағанды: "Karaganda",
  Атырау: "Atyrau",
  Тараз: "Taraz",
  Павлодар: "Pavlodar",
  Семей: "Semey",
  Костанай: "Kostanay",
  Қостанай: "Kostanay",
  Кызылорда: "Kyzylorda",
  Қызылорда: "Kyzylorda",
  Актобе: "Aktobe",
  Ақтөбе: "Aktobe",
  Уральск: "Oral",
  Орал: "Oral",
  Петропавловск: "Petropavl",
  Петропавл: "Petropavl",
  Туркестан: "Turkistan",
  Түркістан: "Turkistan",
  Кокшетау: "Kokshetau",
  Көкшетау: "Kokshetau",
  Талдыкорган: "Taldykorgan",
  Талдықорған: "Taldykorgan",
  Актау: "Aktau",
  Ақтау: "Aktau",
  Жезказган: "Zhezkazgan",
  Жезқазған: "Zhezkazgan",
  "Усть-Каменогорск": "Oskemen",
  Өскемен: "Oskemen",
  Экибастуз: "Ekibastuz",
  Екібастұз: "Ekibastuz",
};

function transliterateWord(word: string): string {
  const exonym = EXONYMS[word];
  if (exonym) return exonym;
  let out = "";
  for (const ch of word.toLowerCase()) out += CYRILLIC[ch] ?? ch;
  if (word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase()) return out.toUpperCase();
  if (word[0] !== word[0].toLowerCase()) return out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

const WORD = /[\p{L}]+(?:-[\p{L}]+)*/gu;

export function transliterate(text: string): string {
  if (EXONYMS[text]) return EXONYMS[text];
  return text.replace(WORD, (word) =>
    EXONYMS[word] ?? word.split("-").map(transliterateWord).join("-"),
  );
}

/** "ROMAN ASRANKULOV" -> "Roman Asrankulov"; short all-caps tokens (e.g. "FK", "II") are kept. */
function fixShouting(text: string): string {
  return text.replace(/\p{Lu}{3,}(?:-\p{Lu}+)*/gu, (w) => w.toLowerCase().replace(/(^|-)(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase()));
}

/** Picks the display form of a proper noun for the requested language. */
export function localized(ru: string, en: string | null | undefined, lang: Lang): string;
export function localized(ru: string | null | undefined, en: string | null | undefined, lang: Lang): string | null;
export function localized(ru: string | null | undefined, en: string | null | undefined, lang: Lang): string | null {
  if (lang === "ru") return ru ?? en ?? null;
  // The source's "English" variant is sometimes still Cyrillic, and sometimes SHOUTED.
  if (en) return /[Ѐ-ӿ]/.test(en) ? transliterate(en) : fixShouting(en);
  return ru ? transliterate(ru) : null;
}

const regionNames: Record<Lang, Intl.DisplayNames> = {
  ru: new Intl.DisplayNames(["ru"], { type: "region" }),
  en: new Intl.DisplayNames(["en"], { type: "region" }),
};

/** Country name from an ISO-3166 alpha-2 code, falling back to the source text. */
export function countryName(code: string | null | undefined, fallback: string | null | undefined, lang: Lang): string | null {
  if (code && /^[A-Z]{2}$/.test(code)) {
    try {
      const name = regionNames[lang].of(code);
      if (name && name !== code) return name;
    } catch {
      /* unknown code: fall through to the source text */
    }
  }
  return localized(fallback, null, lang);
}

let codeByEnglishName: Map<string, string> | null = null;

/** ISO alpha-2 code for an English country name ("Finland" -> "FI"); null if unknown. */
export function countryCodeFromEnglish(name: string | null | undefined): string | null {
  if (!name) return null;
  if (!codeByEnglishName) {
    codeByEnglishName = new Map();
    const A = 65;
    for (let a = 0; a < 26; a++) {
      for (let b = 0; b < 26; b++) {
        const code = String.fromCharCode(A + a, A + b);
        const label = regionNames.en.of(code);
        if (label && label !== code) codeByEnglishName.set(label.toLowerCase(), code);
      }
    }
    // Transfermarkt spellings that differ from CLDR.
    for (const [alias, code] of [["korea, south", "KR"], ["cote d'ivoire", "CI"], ["dr congo", "CD"], ["bosnia-herzegovina", "BA"], ["turkey", "TR"], ["czech republic", "CZ"], ["russia", "RU"], ["england", "GB"], ["scotland", "GB"], ["wales", "GB"]] as const) {
      codeByEnglishName.set(alias, code);
    }
  }
  return codeByEnglishName.get(name.trim().toLowerCase()) ?? null;
}
