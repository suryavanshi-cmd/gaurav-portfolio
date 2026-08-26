import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { log } from '../logger.js';
import { ANALYTE_BY_KEY } from '../domain/analytes.js';

let client = null;
function getClient() {
  if (!config.ai.enabled) return null;
  if (!client) client = new Anthropic({ apiKey: config.ai.apiKey });
  return client;
}

/**
 * The guardrails here are the important part of this file. The reader is a
 * patient, often anxious, reading their own abnormal results with no clinician
 * present. The assistant explains and reassures; it must never diagnose,
 * never name or dose a medicine, and never talk the patient out of seeing
 * their doctor.
 */
const SYSTEM_PROMPT = `तुम्ही "रक्त-सेतू" या मराठी आरोग्य-सहाय्यकाची भूमिका बजावत आहात.

तुमचं काम: रुग्णाला त्याचा रक्त तपासणी अहवाल सोप्या मराठीत समजावून सांगणं आणि आहार-जीवनशैलीबद्दल सर्वसाधारण मार्गदर्शन करणं.

भाषा आणि शैली:
- उत्तर नेहमी सोप्या, बोलीभाषेतल्या मराठीत द्या. इंग्रजी वाक्यं वापरू नका. तपासणीचं इंग्रजी नाव कंसात देऊ शकता.
- ३ ते ६ वाक्यांत उत्तर द्या. रुग्ण हे उत्तर ऐकणार आहे, त्यामुळे लांबलचक यादी टाळा.
- रुग्णाला "तुम्ही" म्हणून संबोधा. शांत आणि आश्वासक स्वरात बोला. घाबरवू नका.
- कठीण वैद्यकीय शब्द टाळा; वापरावेच लागले तर लगेच त्याचा अर्थ सांगा.

महत्त्वाच्या मर्यादा — या कधीही ओलांडू नका:
- निदान (diagnosis) करू नका. "तुम्हाला अमुक आजार आहे" असं कधीही म्हणू नका. "अशी शक्यता असू शकते, पण हे डॉक्टरच ठरवतील" अशा भाषेत बोला.
- कोणत्याही औषधाचं नाव, डोस किंवा किती दिवस घ्यायचं हे सांगू नका. औषधाबद्दल विचारल्यास "हे तुमचे डॉक्टरच ठरवतील" असं सांगा.
- खालील अहवालात जी माहिती दिली आहे तेवढीच वापरा. जे मूल्य अहवालात नाही त्याबद्दल अंदाज बांधू नका — "ही तपासणी तुमच्या अहवालात नाही" असं स्पष्ट सांगा.
- गर्भारपण, लहान मुलं, किंवा तातडीची लक्षणं (छातीत दुखणं, खूप रक्तस्राव, बेशुद्धी) यांचा उल्लेख आल्यास लगेच डॉक्टरांना भेटायला सांगा.
- अहवालात "खूपच कमी" किंवा "खूपच जास्त" असं मूल्य असल्यास प्रत्येक उत्तरात डॉक्टरांना लवकर भेटण्याची आठवण करून द्या.
- विषय आरोग्याशी संबंधित नसेल तर नम्रपणे सांगा की तुम्ही फक्त या अहवालाबद्दल मदत करू शकता.

प्रत्येक उत्तराच्या शेवटी वेगळ्या ओळीवर हे वाक्य द्या:
"हा सल्ला सर्वसाधारण माहितीसाठी आहे — औषधोपचारासाठी तुमच्या डॉक्टरांचाच सल्ला घ्या."`;

/** Compact, token-cheap rendering of the report for the model. */
function reportContext(report) {
  const lines = [];
  const p = report.patient;
  lines.push(`रुग्ण: ${p.name || 'माहिती नाही'} | वय: ${p.age ?? 'माहिती नाही'} | लिंग: ${p.sex === 'male' ? 'पुरुष' : p.sex === 'female' ? 'स्त्री' : 'माहिती नाही'}`);
  lines.push('');
  lines.push('तपासणीचे निकाल:');
  for (const item of report.interpretation.items) {
    lines.push(`- ${item.mr} (${item.en}): ${item.value} ${item.unit} — ${item.statusMr} (सामान्य मर्यादा ${item.rangeText})`);
  }
  const abnormal = report.interpretation.items.filter((i) => i.severity > 0);
  if (abnormal.length) {
    lines.push('');
    lines.push('मर्यादेबाहेरच्या तपासण्यांचा अर्थ:');
    for (const item of abnormal) lines.push(`- ${item.mr}: ${item.meaning}`);
  }
  return lines.join('\n');
}

/**
 * Answers a patient question about their own report.
 * Falls back to the rule-based answer when no API key is configured or the
 * call fails — the page must keep working for a lab with no AI budget.
 */
export async function answerQuestion({ report, question, history = [] }) {
  const anthropic = getClient();
  if (!anthropic) {
    return { answer: answerFromRules(report, question), source: 'rule' };
  }

  try {
    const context = reportContext(report);
    const messages = [
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      {
        role: 'user',
        content: `रुग्णाचा अहवाल:\n\n${context}\n\n---\n\nरुग्णाचा प्रश्न: ${question}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: config.ai.model,
      // Answers are read aloud to the patient — deliberately short.
      max_tokens: 1500,
      output_config: { effort: 'low' },
      system: [
        // Stable prefix first so the cache holds across every question on every report.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages,
    });

    if (response.stop_reason === 'refusal') {
      log.warn('AI declined to answer a report question');
      return { answer: answerFromRules(report, question), source: 'rule' };
    }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) return { answer: answerFromRules(report, question), source: 'rule' };
    return { answer: text, source: 'ai' };
  } catch (err) {
    log.error(`AI question failed, falling back to rules: ${err.message}`);
    return { answer: answerFromRules(report, question), source: 'rule' };
  }
}

const DISCLAIMER = 'हा सल्ला सर्वसाधारण माहितीसाठी आहे — औषधोपचारासाठी तुमच्या डॉक्टरांचाच सल्ला घ्या.';

/**
 * Zero-dependency Marathi answering. Matches the question against analyte
 * names (Marathi and English) and replays the curated explanation. This is
 * what runs when ANTHROPIC_API_KEY is empty.
 */
export function answerFromRules(report, question) {
  const q = String(question || '').toLowerCase().trim();
  const items = report.interpretation.items;

  if (!q) return `तुम्हाला तुमच्या अहवालाबद्दल काय विचारायचं आहे?\n\n${DISCLAIMER}`;

  // Which analyte is the patient asking about?
  const matched = items.filter((item) => {
    const analyte = ANALYTE_BY_KEY.get(item.key);
    const names = [item.mr, item.en, ...(analyte?.aliases ?? [])];
    return names.some((n) => n && q.includes(String(n).toLowerCase()));
  });

  if (matched.length > 0) {
    const item = matched[0];
    const parts = [
      `${item.mr}: तुमचं मूल्य ${item.value} ${item.unit} आहे — हे ${item.statusMr} आहे. (सामान्य मर्यादा ${item.rangeText})`,
      item.about,
      item.meaning,
    ];
    if (item.advice.length) {
      parts.push('काय करावं:');
      parts.push(item.advice.map((a) => `• ${a}`).join('\n'));
    }
    parts.push(DISCLAIMER);
    return parts.join('\n\n');
  }

  // Diet / food questions.
  if (/आहार|खाण|खाऊ|जेवण|अन्न|काय खा|diet|food|eat/.test(q)) {
    const tips = report.interpretation.topAdvice;
    if (tips.length === 0) {
      return `तुमच्या अहवालातील सर्व तपासण्या सामान्य आहेत, त्यामुळे विशेष पथ्य नाही. समतोल आहार, भरपूर भाज्या आणि रोजचा व्यायाम चालू ठेवा.\n\n${DISCLAIMER}`;
    }
    return `तुमच्या अहवालानुसार आहारात हे बदल उपयोगी ठरतील:\n\n${tips.map((t) => `• ${t.tip}  (${t.because}साठी)`).join('\n')}\n\n${DISCLAIMER}`;
  }

  // "Is my report okay?" style questions.
  if (/कस|काय आल|ठीक|नॉर्मल|सामान्य|बरोबर|report|summary|सारांश/.test(q)) {
    return `${report.interpretation.headline}\n\n${DISCLAIMER}`;
  }

  // Doctor / next-steps questions.
  if (/डॉक्टर|दवाखान|कधी|भेट|doctor|when/.test(q)) {
    const urgent = report.interpretation.counts.critical > 0;
    return urgent
      ? `तुमच्या अहवालातलं एक मूल्य बरंच वेगळं आलं आहे. कृपया हा अहवाल घेऊन आजच डॉक्टरांना भेटा.\n\n${DISCLAIMER}`
      : `हा अहवाल घेऊन तुमच्या नेहमीच्या डॉक्टरांना दाखवा. तातडीचं काही दिसत नाही, पण डॉक्टरांचा सल्ला घेणं आवश्यक आहे.\n\n${DISCLAIMER}`;
  }

  const abnormalNames = items.filter((i) => i.severity > 0).map((i) => i.mr).join(', ');
  return `मला तुमचा प्रश्न नीट समजला नाही. तुम्ही एखाद्या तपासणीचं नाव घेऊन विचारू शकता${abnormalNames ? ` — उदाहरणार्थ ${abnormalNames.split(', ')[0]}` : ''}.\n\nकिंवा "माझा अहवाल कसा आहे?" किंवा "मी काय खावं?" असं विचारा.\n\n${DISCLAIMER}`;
}
