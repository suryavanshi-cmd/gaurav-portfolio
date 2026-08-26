import { ANALYTE_BY_KEY, GROUPS, rangeFor } from './analytes.js';

/** Result status, in increasing order of concern. */
export const STATUS = {
  NORMAL: 'normal',
  LOW: 'low',
  HIGH: 'high',
  CRITICAL_LOW: 'critical_low',
  CRITICAL_HIGH: 'critical_high',
  UNKNOWN: 'unknown',
};

export const STATUS_MR = {
  normal: 'सामान्य',
  low: 'कमी',
  high: 'जास्त',
  critical_low: 'खूपच कमी',
  critical_high: 'खूपच जास्त',
  unknown: 'माहिती नाही',
};

const SEVERITY = { normal: 0, unknown: 0, low: 1, high: 1, critical_low: 2, critical_high: 2 };

/**
 * Cell counts arrive on wildly different scales:
 *   WBC       7200 /µL   ·  7.2 10^3/µL  ·  7.2 thou/cumm
 *   Platelets 145000 /µL ·  1.45 10^5/µL ·  1.45 lakhs/cumm
 * Getting this wrong is not cosmetic — a mis-scaled platelet count raises a
 * false "critical" alarm — so we scale from the printed unit when we can and
 * only fall back to the plausibility band when the unit is missing.
 */
const UNIT_MULTIPLIERS = [
  [/10\s*\^?\s*6|million|mill/i, 1e6],
  [/10\s*\^?\s*5|lakhs?|lacs?/i, 1e5],
  [/10\s*\^?\s*3|thou/i, 1e3],
];

export function normaliseValue(analyte, value, unit) {
  if (!Number.isFinite(value)) return value;
  // Only count-type analytes are scale-ambiguous; everything else is taken as printed.
  if (!analyte.plausible) return value;

  const [lo, hi] = analyte.plausible;

  if (unit) {
    for (const [pattern, mult] of UNIT_MULTIPLIERS) {
      if (pattern.test(unit)) {
        const scaled = value * mult;
        if (scaled >= lo && scaled <= hi) return scaled;
      }
    }
  }

  if (value >= lo && value <= hi) return value;

  // No usable unit: pick the power of ten that lands inside the plausible band.
  for (const factor of [1e3, 1e5, 1e6, 1e-3]) {
    const scaled = value * factor;
    if (scaled >= lo && scaled <= hi) return scaled;
  }
  return value;
}

/** Classify one measurement against its reference range. */
export function classify(analyteKey, rawValue, sex, unit) {
  const analyte = ANALYTE_BY_KEY.get(analyteKey);
  if (!analyte) return { status: STATUS.UNKNOWN };

  const value = normaliseValue(analyte, Number(rawValue), unit);
  if (!Number.isFinite(value)) return { status: STATUS.UNKNOWN };

  const range = rangeFor(analyte, sex);
  if (!range) return { status: STATUS.UNKNOWN, value };

  const [lo, hi] = range;
  const crit = analyte.critical || {};

  let status = STATUS.NORMAL;
  if (crit.low !== undefined && value < crit.low) status = STATUS.CRITICAL_LOW;
  else if (crit.high !== undefined && value > crit.high) status = STATUS.CRITICAL_HIGH;
  else if (value < lo) status = STATUS.LOW;
  else if (value > hi) status = STATUS.HIGH;

  return { status, value, range, analyte };
}

/** Where the value sits inside (or outside) the range, as 0–1, for the bar UI. */
function positionInRange(value, [lo, hi]) {
  if (hi === lo) return 0.5;
  const span = hi - lo;
  const padded = { lo: lo - span * 0.5, hi: hi + span * 0.5 };
  const pct = (value - padded.lo) / (padded.hi - padded.lo);
  return Math.min(1, Math.max(0, pct));
}

/**
 * Turn raw parsed measurements into the fully-explained, Marathi-language
 * structure the report page and the WhatsApp summary both render from.
 *
 * @param {Array<{key:string, value:number, unit?:string, rawLabel?:string}>} measurements
 * @param {{sex?:string, age?:number}} patient
 */
export function interpretReport(measurements, patient = {}) {
  const items = [];

  for (const m of measurements) {
    const analyte = ANALYTE_BY_KEY.get(m.key);
    if (!analyte) continue;

    const { status, value, range } = classify(m.key, m.value, patient.sex, m.unit);
    if (!Number.isFinite(value)) continue;

    // If the value was rescaled we must drop the printed unit with it —
    // showing "2,60,000 lakhs/cumm" instead of "2,60,000 /µL" turns a normal
    // platelet count into something alarming and meaningless.
    const rescaled = value !== Number(m.value);
    const unit = rescaled ? analyte.unit : (m.unit || analyte.unit);

    const side = status === STATUS.LOW || status === STATUS.CRITICAL_LOW ? 'low'
      : status === STATUS.HIGH || status === STATUS.CRITICAL_HIGH ? 'high'
        : null;

    const detail = side ? analyte[side] : null;

    items.push({
      key: analyte.key,
      mr: analyte.mr,
      en: analyte.en,
      group: analyte.group,
      groupMr: GROUPS[analyte.group]?.mr ?? '',
      unit,
      value,
      rawLabel: m.rawLabel ?? null,
      range,
      rangeText: range ? `${range[0]} – ${range[1]}` : '—',
      status,
      statusMr: STATUS_MR[status],
      severity: SEVERITY[status] ?? 0,
      position: range ? positionInRange(value, range) : 0.5,
      about: analyte.about,
      meaning: detail?.meaning ?? 'हा निकाल सामान्य मर्यादेत आहे. सध्या काळजीचं कारण नाही.',
      causes: detail?.causes ?? [],
      advice: detail?.advice ?? [],
    });
  }

  // Most concerning first inside each group; groups in clinical reading order.
  items.sort((a, b) => {
    const g = (GROUPS[a.group]?.order ?? 99) - (GROUPS[b.group]?.order ?? 99);
    if (g !== 0) return g;
    return b.severity - a.severity;
  });

  const abnormal = items.filter((i) => i.severity > 0);
  const critical = items.filter((i) => i.severity === 2);

  return {
    items,
    groups: groupItems(items),
    counts: {
      total: items.length,
      normal: items.length - abnormal.length,
      abnormal: abnormal.length,
      critical: critical.length,
    },
    critical,
    headline: buildHeadline(items, abnormal, critical),
    topAdvice: buildTopAdvice(abnormal),
  };
}

function groupItems(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.group)) {
      map.set(item.group, { key: item.group, mr: item.groupMr, order: GROUPS[item.group]?.order ?? 99, items: [] });
    }
    map.get(item.group).items.push(item);
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

/** One-paragraph Marathi summary — this is what goes into the WhatsApp message. */
function buildHeadline(items, abnormal, critical) {
  if (items.length === 0) {
    return 'या अहवालातून आम्हाला कोणतीही तपासणी वाचता आली नाही. कृपया प्रयोगशाळेशी संपर्क साधा.';
  }
  if (critical.length > 0) {
    const names = critical.map((c) => c.mr).join(', ');
    return `तुमच्या अहवालात ${names} हे मूल्य नेहमीच्या मर्यादेपेक्षा बरंच वेगळं आलं आहे. कृपया हा अहवाल घेऊन आजच डॉक्टरांना भेटा.`;
  }
  if (abnormal.length === 0) {
    return `तुमच्या अहवालातील सर्व ${items.length} तपासण्या सामान्य मर्यादेत आहेत. हीच जीवनशैली चालू ठेवा.`;
  }
  const names = abnormal.slice(0, 3).map((a) => `${a.mr} (${a.statusMr})`).join(', ');
  const more = abnormal.length > 3 ? ` आणि आणखी ${abnormal.length - 3} तपासण्या` : '';
  return `एकूण ${items.length} पैकी ${abnormal.length} तपासण्या मर्यादेबाहेर आहेत — ${names}${more}. खाली प्रत्येकाचा अर्थ आणि आहाराचा सल्ला दिला आहे.`;
}

/** De-duplicated, priority-ordered advice list across all abnormal results. */
function buildTopAdvice(abnormal, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const item of [...abnormal].sort((a, b) => b.severity - a.severity)) {
    for (const tip of item.advice) {
      if (seen.has(tip)) continue;
      seen.add(tip);
      out.push({ tip, because: item.mr });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** Compact Marathi text used for the WhatsApp message body. */
export function whatsappSummary(interpretation, { patientName, labName, url }) {
  const lines = [];
  lines.push(`नमस्कार ${patientName || ''},`.trim());
  lines.push('');
  lines.push('तुमचा रक्त तपासणी अहवाल तयार आहे.');
  lines.push('');
  lines.push(interpretation.headline);

  if (interpretation.counts.abnormal > 0) {
    lines.push('');
    for (const item of interpretation.items.filter((i) => i.severity > 0).slice(0, 5)) {
      lines.push(`• ${item.mr}: ${item.value} ${item.unit} (${item.statusMr}) — सामान्य: ${item.rangeText}`);
    }
  }

  lines.push('');
  lines.push('संपूर्ण अहवाल, मराठीत समजावून सांगितलेला अर्थ आणि आहाराचा सल्ला इथे पहा 👇');
  lines.push(url);
  lines.push('');
  lines.push('या पानावर तुम्ही मराठीत बोलून प्रश्नही विचारू शकता.');
  lines.push('');
  lines.push(`— ${labName}`);
  lines.push('');
  lines.push('टीप: हा सल्ला सर्वसाधारण माहितीसाठी आहे. औषधोपचारासाठी तुमच्या डॉक्टरांचाच सल्ला घ्या.');

  return lines.join('\n');
}
