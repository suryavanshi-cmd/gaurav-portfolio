import { ALIAS_INDEX, ANALYTE_BY_KEY } from '../domain/analytes.js';
import { normalisePhone } from '../util/phone.js';

/**
 * Analyzer software is wildly inconsistent — some print
 *   `Haemoglobin (Hb)    13.5   g/dL   13.0 - 17.0`
 * others put the label and the value on separate lines, others emit
 * Devanagari labels. Everything funnels through this one text extractor so
 * PDF, TXT and HL7-ish inputs all behave identically.
 */

const NUMBER = /-?\d+(?:[.,]\d+)?/;

/** True when `alias` occurs at `idx` as a whole word, not inside another word. */
function isWholeWord(haystack, alias, idx) {
  const before = idx === 0 ? ' ' : haystack[idx - 1];
  const after = haystack[idx + alias.length] ?? ' ';
  return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after);
}

function toNumber(str) {
  if (!str) return NaN;
  return Number.parseFloat(String(str).replace(/,/g, ''));
}

/**
 * Finds the analyte a line is reporting, if any.
 * ALIAS_INDEX is sorted longest-alias-first so "total cholesterol" wins over
 * "cholesterol", and "hba1c" wins over "hb".
 */
function matchAnalyte(lowerLine) {
  for (const { alias, key } of ALIAS_INDEX) {
    const idx = lowerLine.indexOf(alias);
    if (idx === -1) continue;
    if (!isWholeWord(lowerLine, alias, idx)) continue;
    return { key, aliasEnd: idx + alias.length, alias };
  }
  return null;
}

/** Values outside this envelope are certainly a parse artefact, not a result. */
function isPlausible(value) {
  return Number.isFinite(value) && value >= 0 && value <= 2_000_000;
}

/**
 * Extract measurements from raw report text.
 * @returns {Array<{key:string, value:number, unit:string|null, rawLabel:string}>}
 */
export function extractMeasurements(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const found = new Map(); // first hit wins — headers repeat on multi-page PDFs

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = line.toLowerCase();

    const hit = matchAnalyte(lower);
    if (!hit || found.has(hit.key)) continue;

    // Only look after the label, so "Vitamin B12" / "HbA1c" / "25-OH Vitamin D"
    // never donate their own digits as the result.
    const rest = line.slice(hit.aliasEnd);
    let m = rest.match(NUMBER);

    // Layout where the value sits on the following line by itself.
    if (!m && lines[i + 1] && /^[\d.,\s]+$/.test(lines[i + 1])) {
      m = lines[i + 1].match(NUMBER);
    }
    if (!m) continue;

    const value = toNumber(m[0]);
    if (!isPlausible(value)) continue;

    const afterValue = rest.slice((m.index ?? 0) + m[0].length);
    const unit = extractUnit(afterValue) ?? ANALYTE_BY_KEY.get(hit.key)?.unit ?? null;

    found.set(hit.key, { key: hit.key, value, unit, rawLabel: line.slice(0, 60) });
  }

  return [...found.values()];
}

const UNIT_PATTERN = /^\s*((?:10\s*\^?\s*\d|lakhs?|lacs?|thou|million)\s*\/\s*(?:cu\s*mm|cumm|[uµ]l)|g\s*\/\s*dl|mg\s*\/\s*dl|ng\s*\/\s*ml|pg\s*\/\s*ml|[µu]?iu\s*\/\s*ml|mmol\s*\/\s*l|u\s*\/\s*l|mm\s*\/\s*hr|cells?\s*\/\s*(?:cu\s*mm|cumm|[uµ]l)|cu\s*mm|cumm|[uµ]l|fl|pg|%)/i

function extractUnit(str) {
  const m = String(str || '').match(UNIT_PATTERN);
  return m ? m[1].replace(/\s+/g, '') : null;
}

const SEX_WORDS = {
  m: 'male', male: 'male', 'पुरुष': 'male', 'पु': 'male',
  f: 'female', female: 'female', 'स्त्री': 'female', 'महिला': 'female', 'स्त्री.': 'female',
};

/** Pull patient identity + report metadata out of the same raw text. */
export function extractPatient(text) {
  const raw = String(text || '');
  const flat = raw.replace(/\r/g, '');

  const grab = (re) => {
    const m = flat.match(re);
    return m ? m[1].trim() : null;
  };

  let name = grab(/(?:patient(?:'s)?\s*name|patient|रुग्णाचे\s*नाव|नाव)\s*[:\-]\s*([^\n|]{2,60})/i);
  if (name) {
    // Strip trailing columns some templates jam onto the same line.
    name = name.replace(/\s{2,}.*$/, '')
      .replace(/\b(age|sex|gender|ref|date|uhid|lab\s*no)\b.*$/i, '')
      .replace(/^(mr|mrs|ms|miss|master|smt|shri|dr)\.?\s+/i, '')
      .trim();
    if (name.length < 2) name = null;
  }

  // "Age : 45" or "45 Y" or "Age/Sex : 45 Y / M"
  const ageStr = grab(/(?:age|वय)\s*(?:\/\s*(?:sex|gender))?\s*[:\-]\s*(\d{1,3})/i)
    ?? grab(/\b(\d{1,3})\s*(?:y|yrs|years|वर्ष)\b/i);
  const age = ageStr ? Number.parseInt(ageStr, 10) : null;

  const sexStr = grab(/(?:sex|gender|लिंग)\s*[:\-]\s*([A-Za-zऀ-ॿ]+)/i)
    ?? grab(/\d{1,3}\s*(?:y|yrs|years)\s*[\/\-]\s*([mf])\b/i);
  const sex = sexStr ? (SEX_WORDS[sexStr.toLowerCase().trim()] ?? null) : null;

  const phoneRaw = grab(/(?:mobile|mob|phone|contact|cell|whatsapp|मोबाईल|भ्रमणध्वनी)\s*(?:no\.?|number)?\s*[:\-]\s*(\+?[\d][\d\s\-()]{8,17})/i)
    ?? grab(/\b((?:\+?91[\s-]?)?[6-9]\d{9})\b/);
  const phone = normalisePhone(phoneRaw);

  const labNo = grab(/(?:lab\s*(?:no|id)|report\s*no|sample\s*(?:no|id)|uhid|bill\s*no|accession)\s*\.?\s*[:\-]\s*([A-Za-z0-9\/\-]{2,30})/i);

  const collectedAt = grab(/(?:collected|collection|sample\s*date|drawn)\s*(?:on|date)?\s*[:\-]\s*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4}(?:\s+[\d:apm ]{4,10})?)/i);
  const reportedAt = grab(/(?:reported|report\s*date|approved)\s*(?:on|date)?\s*[:\-]\s*([\d]{1,2}[\/\-.][\d]{1,2}[\/\-.][\d]{2,4}(?:\s+[\d:apm ]{4,10})?)/i);

  const doctor = grab(/(?:ref(?:erred)?\.?\s*(?:by|dr)|referring\s*(?:doctor|physician))\s*\.?\s*[:\-]\s*([^\n|]{2,50})/i);

  return {
    name,
    age: Number.isFinite(age) && age > 0 && age < 130 ? age : null,
    sex,
    phone,
    labNo,
    collectedAt,
    reportedAt,
    doctor: doctor ? doctor.replace(/\s{2,}.*$/, '').trim() : null,
  };
}
