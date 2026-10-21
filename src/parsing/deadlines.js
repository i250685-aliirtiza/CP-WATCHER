import { DateTime } from 'luxon';
export function parseDeadline(text, now = DateTime.now(), zone = null) {
  if (!text) return null;
  const s = String(text).replace(/\s+/g, ' ');
  zone = zone || (/\b(?:UTC|GMT)\b/i.test(s) ? 'UTC' : /\bPKT\b/i.test(s) ? 'Asia/Karachi' : null);
  const marker = s.match(/(?:registration|application|entry|entries)\s*(?:deadline|closes?|close|ends?|last date|final day)|(?:registration|application)\s+(?:is\s+)?(?:due|extended)/i);
  if (!marker) return null;
  const tail = s.slice(marker.index + marker[0].length, marker.index + marker[0].length + 80);
  const date = tail.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)/i);
  if (!date) return null;
  const raw = date[1]; let d;
  if (/[a-z]/i.test(raw)) {
    const full = /,\s*\d{4}/.test(raw); d = DateTime.fromFormat(raw, full ? 'LLLL d, yyyy' : 'LLLL d', { zone: zone || 'UTC' });
    if (d.isValid && !full) d = d.set({ year: now.year });
  } else {
    const parts = raw.split(/[./-]/).map(Number); const year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
    d = DateTime.fromObject({ year, month: parts[1], day: parts[0], hour: 23, minute: 59 }, { zone: zone || 'UTC' });
  }
  return d?.isValid ? { iso: d.toISO(), evidence: s.slice(marker.index, marker.index + marker[0].length + date.index + date[0].length), timezone: zone, verification_status: zone ? 'verified' : 'candidate' } : null;
}
