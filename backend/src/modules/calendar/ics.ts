// Minimal RFC 5545 calendar writer for fixture feeds.

export type CalendarEvent = {
  uid: string;
  start: Date;
  /** Minutes */
  duration: number;
  summary: string;
  description?: string;
  location?: string | null;
  url?: string;
  updated?: Date;
  /** Kick-off time not announced yet: emit an all-day event on the local date instead of a fake time. */
  allDay?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function icsDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escapes text values (RFC 5545 §3.3.11). */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds content lines longer than 75 octets (RFC 5545 §3.1). */
export function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, "utf8");
    if (size + len > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** Calendar date (VALUE=DATE) of an instant in Kazakhstan time (UTC+5). */
export function icsLocalDate(d: Date): string {
  const local = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}`;
}

export function buildCalendar(name: string, events: CalendarEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qscore//Fixtures//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`,
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.duration * 60_000);
    const when = e.allDay
      ? [`DTSTART;VALUE=DATE:${icsLocalDate(e.start)}`, `DTEND;VALUE=DATE:${icsLocalDate(new Date(e.start.getTime() + 24 * 60 * 60 * 1000))}`]
      : [`DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(end)}`];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(e.updated ?? now)}`,
      ...when,
      `SUMMARY:${icsText(e.summary)}`,
      ...(e.description ? [`DESCRIPTION:${icsText(e.description)}`] : []),
      ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
