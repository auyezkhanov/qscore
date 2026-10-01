import { parse, type HTMLElement } from "node-html-parser";

// Pure HTML parsers for transfermarkt.com pages (English site). Kept free of
// I/O so they can be unit-tested against saved page fragments.

export type FeeType = "FEE" | "LOAN_FEE" | "LOAN" | "FREE" | "END_OF_LOAN" | "UNKNOWN";
export type TmFee = { type: FeeType; amount: number | null };

/** "€1.20m" -> 1_200_000, "€250k" -> 250_000, "€9k" -> 9_000; anything else -> null. */
export function parseMoney(raw: string | null | undefined): number | null {
  const m = raw?.replace(/\s+/g, "").match(/€?([\d]+(?:[.,]\d+)?)(bn|m|k|th\.)?/i);
  if (!m || !/\d/.test(raw ?? "")) return null;
  const value = Number(m[1].replace(",", "."));
  if (!Number.isFinite(value)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const factor = unit === "bn" ? 1e9 : unit === "m" ? 1e6 : unit === "k" || unit === "th." ? 1e3 : 1;
  return Math.round(value * factor);
}

export function parseFee(raw: string): TmFee {
  const text = raw.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  if (lower.startsWith("loan fee")) return { type: "LOAN_FEE", amount: parseMoney(text.slice(text.indexOf(":") + 1)) };
  if (lower.includes("end of loan")) return { type: "END_OF_LOAN", amount: null };
  if (lower.includes("loan")) return { type: "LOAN", amount: null };
  if (lower.includes("free")) return { type: "FREE", amount: null };
  const amount = /€/.test(text) ? parseMoney(text) : null;
  return amount != null ? { type: "FEE", amount } : { type: "UNKNOWN", amount: null };
}

const idFrom = (href: string | undefined, kind: "spieler" | "verein" | "transfer_id") => {
  const m = href?.match(new RegExp(`/${kind}/(\\d+)`));
  return m ? Number(m[1]) : null;
};

const clean = (s: string | undefined) => (s ?? "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export type TmTransferRow = {
  tmPlayerId: number;
  name: string;
  age: number | null;
  nationality: string | null;
  /** e.g. "Centre-Back", "Left Winger" */
  position: string | null;
  marketValue: number | null;
  counterClub: { tmId: number | null; name: string } | null;
  fee: TmFee;
  tmTransferId: number | null;
};

export type TmClubTransfers = {
  tmClubId: number;
  clubName: string;
  arrivals: TmTransferRow[];
  departures: TmTransferRow[];
};

function parseTransferRow(tr: HTMLElement): TmTransferRow | null {
  const playerLink = tr.querySelector('a[href*="/profil/spieler/"]');
  const tmPlayerId = idFrom(playerLink?.getAttribute("href"), "spieler");
  if (!playerLink || tmPlayerId == null) return null;

  const clubLink = tr.querySelector("td.verein-flagge-transfer-cell a") ?? tr.querySelector("td.no-border-rechts a");
  const clubCellText = clean(tr.querySelector("td.verein-flagge-transfer-cell")?.text);
  const feeLink = tr.querySelector("td.rechts a[href*='/transfer_id/']");
  const age = Number(clean(tr.querySelector("td.alter-transfer-cell")?.text));

  return {
    tmPlayerId,
    name: clean(playerLink.getAttribute("title") ?? playerLink.text),
    age: Number.isFinite(age) && age > 0 ? age : null,
    nationality: tr.querySelector("td.nat-transfer-cell img")?.getAttribute("title") ?? null,
    position: clean(tr.querySelector("td.pos-transfer-cell")?.text) || null,
    marketValue: parseMoney(tr.querySelector("td.mw-transfer-cell")?.text),
    counterClub: clubLink
      ? { tmId: idFrom(clubLink.getAttribute("href"), "verein"), name: clean(clubLink.getAttribute("title") ?? clubLink.text) }
      : clubCellText
        ? { tmId: null, name: clubCellText }
        : null,
    fee: parseFee(feeLink?.text ?? tr.querySelectorAll("td.rechts").pop()?.text ?? ""),
    tmTransferId: idFrom(feeLink?.getAttribute("href"), "transfer_id"),
  };
}

/** League "Transfers" page: one box per club with an "In" and an "Out" table. */
export function parseLeagueTransfers(html: string): TmClubTransfers[] {
  const root = parse(html);
  const clubs: TmClubTransfers[] = [];
  for (const h2 of root.querySelectorAll("h2[id^=to-]")) {
    const tmClubId = Number(h2.getAttribute("id")!.slice(3));
    const box = h2.parentNode;
    if (!Number.isFinite(tmClubId) || !box) continue;
    const club: TmClubTransfers = { tmClubId, clubName: clean(h2.querySelector("a[title]")?.getAttribute("title")), arrivals: [], departures: [] };
    for (const table of box.querySelectorAll("table")) {
      const heading = clean(table.querySelector("th")?.text).toLowerCase();
      const target = heading === "in" ? club.arrivals : heading === "out" ? club.departures : null;
      if (!target) continue;
      for (const tr of table.querySelectorAll("tbody > tr")) {
        const row = parseTransferRow(tr);
        if (row) target.push(row);
      }
    }
    clubs.push(club);
  }
  return clubs;
}

export type TmSquadPlayer = {
  tmPlayerId: number;
  name: string;
  number: number | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  nationality: string | null;
  marketValue: number | null;
  /** YYYY-MM-DD */
  contractUntil: string | null;
  heightCm: number | null;
  foot: "left" | "right" | "both" | null;
};

/** "1,90m" -> 190 */
export function parseHeight(raw: string | undefined): number | null {
  const m = raw?.match(/(\d)[,.](\d{2})\s*m/);
  if (!m) return null;
  const cm = Number(m[1]) * 100 + Number(m[2]);
  return cm >= 140 && cm <= 220 ? cm : null;
}

export function parseFoot(raw: string | undefined): "left" | "right" | "both" | null {
  const f = clean(raw).toLowerCase();
  return f === "left" || f === "right" || f === "both" ? f : null;
}

/** "14/10/2003 (22)" or "31/12/2028" -> "2003-10-14" / "2028-12-31". */
export function parseDmy(raw: string | undefined): string | null {
  const m = raw?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Club "Detailed squad" page (…/kader/verein/<id>/saison_id/<y>/plus/1). */
export function parseSquad(html: string): TmSquadPlayer[] {
  const root = parse(html);
  const players: TmSquadPlayer[] = [];
  for (const tr of root.querySelectorAll("table.items > tbody > tr")) {
    const link = tr.querySelector('td.hauptlink a[href*="/profil/spieler/"]');
    const tmPlayerId = idFrom(link?.getAttribute("href"), "spieler");
    if (!link || tmPlayerId == null) continue;
    // Direct children only: the name cell nests its own small table.
    const cells = tr.childNodes.filter((n): n is HTMLElement => (n as HTMLElement).tagName === "TD");
    const centered = cells.filter((td) => td.classList.contains("zentriert") && !td.classList.contains("rueckennummer"));
    const number = Number(clean(tr.querySelector(".rn_nummer")?.text));
    players.push({
      tmPlayerId,
      name: clean(link.text),
      number: Number.isFinite(number) && number > 0 ? number : null,
      birthDate: parseDmy(centered[0]?.text),
      nationality: centered[1]?.querySelector("img")?.getAttribute("title") ?? null,
      marketValue: parseMoney(cells[cells.length - 1]?.text),
      contractUntil: parseDmy(centered[centered.length - 1]?.text),
      heightCm: parseHeight(centered[2]?.text),
      foot: parseFoot(centered[3]?.text),
    });
  }
  return players;
}

/** Transfermarkt position label -> our four-way position. */
export function mapTmPosition(label: string | null): "GK" | "DF" | "MF" | "FW" | null {
  const l = (label ?? "").toLowerCase();
  if (!l) return null;
  if (l.includes("goalkeeper")) return "GK";
  // "Defensive Midfield" is a midfielder, so check midfield before defence.
  if (l.includes("midfield")) return "MF";
  if (l.includes("back") || l.includes("defen")) return "DF";
  if (l.includes("winger") || l.includes("forward") || l.includes("striker")) return "FW";
  return null;
}

export type TmValuePoint = { date: string; value: number; club: string | null; age: number | null };

/** Market value history JSON (ceapi/marketValueDevelopment/graph/<playerId>). */
export function parseValueHistory(json: unknown): TmValuePoint[] {
  const list = (json as { list?: unknown[] } | null)?.list;
  if (!Array.isArray(list)) return [];
  const points: TmValuePoint[] = [];
  for (const raw of list) {
    const r = raw as { x?: unknown; y?: unknown; verein?: unknown; age?: unknown };
    if (typeof r.x !== "number" || typeof r.y !== "number") continue;
    const age = Number(r.age);
    points.push({
      date: new Date(r.x).toISOString().slice(0, 10),
      value: r.y,
      club: typeof r.verein === "string" && r.verein ? r.verein : null,
      age: Number.isFinite(age) && age > 0 ? age : null,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}
