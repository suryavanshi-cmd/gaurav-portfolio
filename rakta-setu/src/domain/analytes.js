/**
 * रक्त-सेतू — analyte knowledge base
 * ────────────────────────────────────────────────────────────────
 * One entry per test the app understands. Each entry carries:
 *   • the aliases a machine/LIS printout might use (for parsing)
 *   • sex-aware reference ranges (for flagging)
 *   • plain-Marathi explanations and food/lifestyle guidance
 *
 * The Marathi text here is deliberately everyday spoken Marathi, not
 * clinical Marathi — the reader is a patient, often a first-time one.
 *
 * NOTE: reference ranges vary between analyzers. `src/domain/ranges.local.js`
 * (optional, git-ignored) can override any range to match your lab's own
 * printed values — see docs/ARCHITECTURE.md.
 */

export const GROUPS = {
  cbc: { mr: 'संपूर्ण रक्त तपासणी (CBC)', order: 1 },
  diabetes: { mr: 'साखर / मधुमेह', order: 2 },
  lipid: { mr: 'चरबी (लिपिड प्रोफाइल)', order: 3 },
  liver: { mr: 'यकृत (लिव्हर)', order: 4 },
  kidney: { mr: 'मूत्रपिंड (किडनी)', order: 5 },
  thyroid: { mr: 'थायरॉईड', order: 6 },
  vitamin: { mr: 'जीवनसत्त्वे', order: 7 },
  mineral: { mr: 'क्षार व खनिजे', order: 8 },
};

/** Shared advice fragments, so the same guidance stays worded identically. */
const DRINK_WATER = 'दिवसभरात ८–१० ग्लास पाणी प्या.';
const WALK = 'रोज किमान ३० मिनिटे चालणे किंवा हलका व्यायाम करा.';
const SEE_DOCTOR = 'हा निकाल घेऊन डॉक्टरांना दाखवा आणि त्यांच्या सल्ल्यानेच औषध सुरू करा.';
const NO_TOBACCO = 'तंबाखू, गुटखा, धूम्रपान आणि दारू पूर्णपणे टाळा.';

export const ANALYTES = [
  // ─────────────────────────── CBC ───────────────────────────
  {
    key: 'hemoglobin',
    mr: 'हिमोग्लोबिन',
    en: 'Hemoglobin (Hb)',
    unit: 'g/dL',
    group: 'cbc',
    aliases: ['haemoglobin', 'hemoglobin', 'hb', 'hgb', 'हिमोग्लोबिन'],
    ranges: { male: [13, 17], female: [12, 15], default: [12, 16] },
    critical: { low: 7 },
    about: 'हिमोग्लोबिन हे रक्तातील लाल पेशींमधलं प्रथिन आहे. ते फुफ्फुसातून प्राणवायू घेऊन शरीराच्या प्रत्येक भागापर्यंत पोहोचवतं.',
    low: {
      meaning: 'हिमोग्लोबिन कमी असणं म्हणजे रक्तक्षय (ॲनिमिया). त्यामुळे थकवा, चक्कर येणे, धाप लागणे, हातपाय गार पडणे आणि चेहरा फिकट दिसणे असे त्रास होतात.',
      causes: ['आहारात लोहाची कमतरता', 'पोटातील जंत', 'मासिक पाळीत जास्त रक्तस्राव', 'वारंवार होणारा रक्तस्राव'],
      advice: [
        'जेवणात रोज हिरव्या पालेभाज्या घ्या — पालक, मेथी, शेपू, चवळीची पानं.',
        'गूळ-शेंगदाणे, खजूर, मनुका, अंजीर यांचा थोडा-थोडा रोज समावेश करा.',
        'नाचणी, राजगिरा, बाजरी अशी भरड धान्यं वापरा.',
        'लोह नीट शोषलं जाण्यासाठी जेवणानंतर आवळा, लिंबू, संत्रं किंवा पेरू असं क-जीवनसत्त्वाचं फळ खा.',
        'जेवणाबरोबर लगेच चहा-कॉफी घेऊ नका — त्याने लोहाचं शोषण कमी होतं. किमान एक तासाचं अंतर ठेवा.',
      ],
    },
    high: {
      meaning: 'हिमोग्लोबिन जास्त असणं हे बहुतेक वेळा शरीरात पाणी कमी असल्यामुळे होतं. धूम्रपान किंवा जास्त उंचीवर राहणं हीसुद्धा कारणं असू शकतात.',
      causes: ['शरीरात पाण्याची कमतरता', 'धूम्रपान', 'जास्त उंचीवरचं वास्तव्य'],
      advice: [DRINK_WATER, NO_TOBACCO, SEE_DOCTOR],
    },
  },
  {
    key: 'rbc',
    mr: 'लाल रक्तपेशी',
    en: 'RBC Count',
    unit: 'million/µL',
    group: 'cbc',
    aliases: ['rbc count', 'rbc', 'red blood cell', 'erythrocyte count', 'total rbc'],
    ranges: { male: [4.5, 5.9], female: [4.1, 5.1], default: [4.1, 5.9] },
    about: 'लाल रक्तपेशी शरीरभर प्राणवायू वाहून नेतात. यांची संख्या हिमोग्लोबिनबरोबर वाचली जाते.',
    low: {
      meaning: 'लाल पेशी कमी असणं हे रक्तक्षयाचं लक्षण आहे. थकवा आणि अशक्तपणा जाणवू शकतो.',
      advice: ['लोहयुक्त आणि प्रथिनयुक्त आहार वाढवा — डाळी, कडधान्यं, अंडी, पालेभाज्या.', SEE_DOCTOR],
    },
    high: {
      meaning: 'लाल पेशी जास्त असणं बहुतेक वेळा पाणी कमी पडल्यामुळे किंवा धूम्रपानामुळे दिसतं.',
      advice: [DRINK_WATER, NO_TOBACCO],
    },
  },
  {
    key: 'wbc',
    mr: 'पांढऱ्या रक्तपेशी',
    en: 'WBC / Total Leucocyte Count',
    unit: '/µL',
    group: 'cbc',
    aliases: ['total leucocyte count', 'total leukocyte count', 'wbc count', 'tlc', 'wbc', 'leucocyte count'],
    // Analyzers print WBC as 7200, 7.2 (10^3/µL) or 7.2 thou/cumm — see normaliseValue().
    plausible: [1000, 100000],
    ranges: { default: [4000, 11000] },
    critical: { low: 2000, high: 30000 },
    about: 'पांढऱ्या रक्तपेशी शरीराला जंतुसंसर्गापासून वाचवतात. त्या शरीराचं सैन्य आहेत.',
    low: {
      meaning: 'पांढऱ्या पेशी कमी असल्यास शरीराची रोगप्रतिकारशक्ती कमी झालेली असू शकते. काही विषाणूजन्य आजारांनंतर किंवा काही औषधांमुळेही असं होतं.',
      advice: ['गर्दीच्या ठिकाणी मास्क वापरा आणि हात वारंवार धुवा.', 'ताजं, गरम आणि स्वच्छ शिजवलेलं अन्न खा.', SEE_DOCTOR],
    },
    high: {
      meaning: 'पांढऱ्या पेशी वाढणं म्हणजे शरीरात कुठेतरी जंतुसंसर्ग किंवा सूज असण्याची शक्यता आहे.',
      advice: ['ताप, खोकला, लघवीला जळजळ असे त्रास असल्यास लगेच डॉक्टरांना सांगा.', 'पुरेशी विश्रांती घ्या आणि भरपूर पाणी प्या.', SEE_DOCTOR],
    },
  },
  {
    key: 'platelet',
    mr: 'रक्तबिंबिका (प्लेटलेट्स)',
    en: 'Platelet Count',
    unit: '/µL',
    group: 'cbc',
    aliases: ['platelet count', 'platelets', 'plt', 'thrombocyte count'],
    // Indian labs commonly print platelets in lakhs (1.45 lakhs/cumm = 145000).
    plausible: [10000, 1500000],
    ranges: { default: [150000, 450000] },
    critical: { low: 50000, high: 1000000 },
    about: 'प्लेटलेट्स रक्त गोठवण्याचं काम करतात. जखम झाल्यावर रक्त थांबवायला त्या मदत करतात.',
    low: {
      meaning: 'प्लेटलेट्स कमी झाल्यास रक्तस्राव लवकर थांबत नाही. डेंग्यू, मलेरिया किंवा विषाणूजन्य तापात असं होऊ शकतं.',
      advice: [
        'हिरडीतून रक्त येणे, नाकातून रक्त येणे किंवा अंगावर लाल ठिपके दिसल्यास तातडीने डॉक्टरांकडे जा.',
        'पपई, पपईच्या पानांचा रस, नारळपाणी आणि डाळिंब यांचा आहारात समावेश करा.',
        'जड वजन उचलणं आणि इजा होईल असे खेळ काही दिवस टाळा.',
      ],
    },
    high: {
      meaning: 'प्लेटलेट्स जास्त असणं हे संसर्गानंतर तात्पुरतं असू शकतं, पण सतत जास्त राहिल्यास तपासणी आवश्यक आहे.',
      advice: [DRINK_WATER, SEE_DOCTOR],
    },
  },
  {
    key: 'pcv',
    mr: 'पीसीव्ही / हिमॅटोक्रिट',
    en: 'PCV / Hematocrit',
    unit: '%',
    group: 'cbc',
    aliases: ['pcv', 'packed cell volume', 'hematocrit', 'haematocrit', 'hct'],
    ranges: { male: [40, 52], female: [36, 46], default: [36, 52] },
    about: 'एकूण रक्तापैकी किती भाग लाल पेशींनी व्यापला आहे हे पीसीव्ही दाखवतं.',
    low: { meaning: 'पीसीव्ही कमी असणं रक्तक्षयाकडे निर्देश करतं.', advice: ['लोहयुक्त आहार वाढवा.', SEE_DOCTOR] },
    high: { meaning: 'पीसीव्ही जास्त असणं बहुतेक वेळा पाणी कमी पडल्याचं लक्षण आहे.', advice: [DRINK_WATER] },
  },
  {
    key: 'mcv',
    mr: 'एमसीव्ही (पेशीचा आकार)',
    en: 'MCV',
    unit: 'fL',
    group: 'cbc',
    aliases: ['mcv', 'mean corpuscular volume'],
    ranges: { default: [80, 100] },
    about: 'लाल रक्तपेशीचा सरासरी आकार. रक्तक्षय कोणत्या प्रकारचा आहे हे यावरून कळतं.',
    low: {
      meaning: 'पेशी लहान आहेत — हे बहुधा लोहाच्या कमतरतेमुळे होणाऱ्या रक्तक्षयात दिसतं.',
      advice: ['लोहयुक्त पदार्थ वाढवा — गूळ, खजूर, पालेभाज्या, कडधान्यं.', SEE_DOCTOR],
    },
    high: {
      meaning: 'पेशी मोठ्या आहेत — हे ब१२ किंवा फॉलिक ॲसिडच्या कमतरतेमुळे होऊ शकतं.',
      advice: ['दूध, दही, अंडी, आणि हिरव्या पालेभाज्या आहारात ठेवा.', 'डॉक्टरांना विचारून ब१२ ची तपासणी करून घ्या.'],
    },
  },
  {
    key: 'mch',
    mr: 'एमसीएच',
    en: 'MCH',
    unit: 'pg',
    group: 'cbc',
    aliases: ['mch', 'mean corpuscular hemoglobin', 'mean corpuscular haemoglobin'],
    ranges: { default: [27, 33] },
    about: 'प्रत्येक लाल पेशीत सरासरी किती हिमोग्लोबिन आहे याचं मोजमाप.',
    low: { meaning: 'प्रत्येक पेशीतलं हिमोग्लोबिन कमी आहे — लोहाच्या कमतरतेचं लक्षण असू शकतं.', advice: ['लोहयुक्त आहार वाढवा.'] },
    high: { meaning: 'हे मूल्य वाढलेलं असणं ब१२ किंवा फॉलेटच्या कमतरतेशी जोडलेलं असू शकतं.', advice: [SEE_DOCTOR] },
  },
  {
    key: 'mchc',
    mr: 'एमसीएचसी',
    en: 'MCHC',
    unit: 'g/dL',
    group: 'cbc',
    aliases: ['mchc', 'mean corpuscular hemoglobin concentration'],
    ranges: { default: [32, 36] },
    about: 'लाल पेशींमधल्या हिमोग्लोबिनची घनता.',
    low: { meaning: 'घनता कमी आहे — लोहाच्या कमतरतेत असं दिसतं.', advice: ['लोहयुक्त आहार वाढवा.'] },
    high: { meaning: 'हे मूल्य क्वचितच वाढतं; डॉक्टरांच्या सल्ल्याने पुन्हा तपासणी करा.', advice: [SEE_DOCTOR] },
  },
  {
    key: 'neutrophils',
    mr: 'न्यूट्रोफिल्स',
    en: 'Neutrophils',
    unit: '%',
    group: 'cbc',
    aliases: ['neutrophils', 'neutrophil', 'polymorphs', 'polymorphonuclear'],
    ranges: { default: [40, 75] },
    about: 'पांढऱ्या पेशींचा एक प्रकार, जो प्रामुख्याने जिवाणूंच्या संसर्गाशी लढतो.',
    low: { meaning: 'हे प्रमाण कमी असणं विषाणूजन्य आजारानंतर दिसू शकतं.', advice: [SEE_DOCTOR] },
    high: { meaning: 'हे प्रमाण वाढणं जिवाणूंचा संसर्ग असल्याचं सुचवतं.', advice: ['ताप किंवा दुखणं असल्यास डॉक्टरांना दाखवा.', 'विश्रांती घ्या आणि पाणी भरपूर प्या.'] },
  },
  {
    key: 'lymphocytes',
    mr: 'लिम्फोसाइट्स',
    en: 'Lymphocytes',
    unit: '%',
    group: 'cbc',
    aliases: ['lymphocytes', 'lymphocyte'],
    ranges: { default: [20, 45] },
    about: 'पांढऱ्या पेशींचा प्रकार जो विषाणूंशी लढतो आणि रोगप्रतिकारशक्तीची आठवण ठेवतो.',
    low: { meaning: 'हे प्रमाण कमी असल्यास रोगप्रतिकारशक्ती तपासून घेणं योग्य ठरतं.', advice: [SEE_DOCTOR] },
    high: { meaning: 'हे प्रमाण वाढणं बहुतेक वेळा विषाणूजन्य संसर्ग दर्शवतं.', advice: ['विश्रांती घ्या, भरपूर द्रव पदार्थ घ्या.', SEE_DOCTOR] },
  },
  {
    key: 'eosinophils',
    mr: 'इओसिनोफिल्स',
    en: 'Eosinophils',
    unit: '%',
    group: 'cbc',
    aliases: ['eosinophils', 'eosinophil'],
    ranges: { default: [1, 6] },
    about: 'ॲलर्जी आणि जंतांशी संबंधित पांढऱ्या पेशींचा प्रकार.',
    low: { meaning: 'हे प्रमाण कमी असणं सहसा काळजीचं कारण नसतं.', advice: [] },
    high: {
      meaning: 'हे प्रमाण वाढणं ॲलर्जी, दमा किंवा पोटातील जंत यांमुळे असू शकतं.',
      advice: ['धूळ, धूर आणि ॲलर्जी होणारे पदार्थ टाळा.', 'डॉक्टरांना विचारून जंतांचं औषध घ्यायचं का ते ठरवा.'],
    },
  },
  {
    key: 'monocytes',
    mr: 'मोनोसाइट्स',
    en: 'Monocytes',
    unit: '%',
    group: 'cbc',
    aliases: ['monocytes', 'monocyte'],
    ranges: { default: [2, 10] },
    about: 'जुनाट संसर्गाशी लढणाऱ्या पांढऱ्या पेशी.',
    low: { meaning: 'सहसा याचं वेगळं महत्त्व नसतं.', advice: [] },
    high: { meaning: 'दीर्घकाळ चालणारा संसर्ग किंवा सूज असल्यास हे प्रमाण वाढतं.', advice: [SEE_DOCTOR] },
  },
  {
    key: 'esr',
    mr: 'ईएसआर',
    en: 'ESR',
    unit: 'mm/hr',
    group: 'cbc',
    aliases: ['esr', 'erythrocyte sedimentation rate', 'sedimentation rate'],
    ranges: { male: [0, 15], female: [0, 20], default: [0, 20] },
    direction: 'lower_better',
    about: 'शरीरात कुठे सूज किंवा संसर्ग आहे का, याचा ढोबळ अंदाज देणारी तपासणी.',
    low: { meaning: 'हे मूल्य कमी असणं सामान्य आहे.', advice: [] },
    high: {
      meaning: 'ईएसआर वाढणं म्हणजे शरीरात कुठेतरी सूज किंवा संसर्ग असू शकतो. हे एकटं निदान नाही — इतर तपासण्यांबरोबर वाचावं लागतं.',
      advice: ['सतत ताप, वजन घटणं किंवा सांधेदुखी असल्यास डॉक्टरांना नक्की सांगा.', SEE_DOCTOR],
    },
  },

  // ───────────────────────── मधुमेह ─────────────────────────
  {
    key: 'glucose_fasting',
    mr: 'उपाशीपोटी साखर',
    en: 'Fasting Blood Sugar',
    unit: 'mg/dL',
    group: 'diabetes',
    aliases: ['fasting blood sugar', 'blood sugar fasting', 'fasting glucose', 'glucose fasting', 'fbs', 'sugar (f)', 'plasma glucose fasting'],
    ranges: { default: [70, 100] },
    critical: { low: 50, high: 400 },
    about: 'रात्रभर (८–१२ तास) काहीही न खाता सकाळी घेतलेल्या रक्तातील साखरेचं प्रमाण.',
    low: {
      meaning: 'साखर कमी झाल्यास घाम येणे, हातपाय थरथरणे, चक्कर आणि अशक्तपणा जाणवतो.',
      advice: [
        'लगेच थोडा गूळ, साखर किंवा फळांचा रस घ्या.',
        'जास्त वेळ उपाशी राहू नका — दर ३–४ तासांनी थोडं खा.',
        'मधुमेहाचं औषध घेत असाल तर डोस डॉक्टरांकडून तपासून घ्या.',
      ],
    },
    high: {
      meaning: '१०० ते १२५ हे "पूर्व-मधुमेह" (prediabetes) मानलं जातं, आणि १२६ किंवा त्यापेक्षा जास्त हे मधुमेहाकडे निर्देश करतं. एकाच तपासणीवरून निदान होत नाही — डॉक्टर पुन्हा तपासणी करायला सांगतील.',
      advice: [
        'भात, मैदा, साखर, बेकरीचे पदार्थ आणि गोड पेयं कमी करा.',
        'ज्वारी, बाजरी, नाचणीची भाकरी आणि भरपूर भाज्या यांना प्राधान्य द्या.',
        'जेवणात कोशिंबीर आणि सॅलड आधी खा, नंतर भाकरी-भात — त्याने साखर हळू वाढते.',
        WALK,
        'वजन जास्त असल्यास ५–१०% वजन कमी केल्यानेही मोठा फरक पडतो.',
        SEE_DOCTOR,
      ],
    },
  },
  {
    key: 'glucose_pp',
    mr: 'जेवणानंतरची साखर',
    en: 'Post-Prandial Blood Sugar',
    unit: 'mg/dL',
    group: 'diabetes',
    aliases: ['post prandial', 'postprandial', 'pp blood sugar', 'blood sugar pp', 'ppbs', 'sugar (pp)', '2 hour glucose'],
    ranges: { default: [70, 140] },
    critical: { high: 400 },
    about: 'जेवणानंतर बरोबर दोन तासांनी घेतलेल्या रक्तातील साखरेचं प्रमाण.',
    low: { meaning: 'जेवणानंतरही साखर कमी असणं हे डॉक्टरांना दाखवण्यासारखं आहे.', advice: [SEE_DOCTOR] },
    high: {
      meaning: '१४० ते १९९ हे पूर्व-मधुमेह, आणि २०० किंवा त्यापुढे मधुमेहाकडे निर्देश करतं.',
      advice: [
        'एका वेळी भरपूर भात/भाकरी खाण्याऐवजी थोडं-थोडं अनेकदा खा.',
        'जेवणानंतर १५ मिनिटं सावकाश चाला.',
        'गोड पदार्थ आणि थंड पेयं टाळा.',
        SEE_DOCTOR,
      ],
    },
  },
  {
    key: 'hba1c',
    mr: 'एचबीए१सी (तीन महिन्यांची सरासरी साखर)',
    en: 'HbA1c',
    unit: '%',
    group: 'diabetes',
    aliases: ['hba1c', 'hb a1c', 'glycosylated hemoglobin', 'glycated haemoglobin', 'a1c'],
    ranges: { default: [4.0, 5.6] },
    direction: 'lower_better',
    about: 'मागच्या साधारण तीन महिन्यांतली रक्तातील साखरेची सरासरी. एका दिवसाच्या तपासणीपेक्षा हे जास्त विश्वासार्ह चित्र देतं.',
    low: { meaning: 'हे मूल्य कमी असणं सहसा चांगलं आहे, पण खूपच कमी असल्यास डॉक्टरांना विचारा.', advice: [] },
    high: {
      meaning: '५.७ ते ६.४ म्हणजे पूर्व-मधुमेह, आणि ६.५ किंवा त्यापुढे म्हणजे मधुमेहाची शक्यता. आधीच मधुमेह असल्यास ७ च्या आत ठेवण्याचा सल्ला दिला जातो.',
      advice: [
        'साखर, गूळ, मैदा आणि गोड पेयं कटाक्षाने कमी करा.',
        'रोजच्या जेवणात प्रथिनं ठेवा — डाळ, कडधान्यं, अंडी, दही.',
        WALK,
        'दर ३ महिन्यांनी ही तपासणी पुन्हा करा.',
        SEE_DOCTOR,
      ],
    },
  },

  // ─────────────────────── लिपिड प्रोफाइल ───────────────────────
  {
    key: 'cholesterol_total',
    mr: 'एकूण कोलेस्टेरॉल',
    en: 'Total Cholesterol',
    unit: 'mg/dL',
    group: 'lipid',
    aliases: ['total cholesterol', 'cholesterol total', 'serum cholesterol', 'cholesterol'],
    ranges: { default: [125, 200] },
    direction: 'lower_better',
    about: 'रक्तातील एकूण चरबीचं प्रमाण. जास्त झाल्यास हृदयाच्या नसा अरुंद होण्याचा धोका वाढतो.',
    low: { meaning: 'खूप कमी कोलेस्टेरॉल असल्यास डॉक्टरांना दाखवा.', advice: [] },
    high: {
      meaning: 'कोलेस्टेरॉल वाढल्यास हृदयविकार आणि पक्षाघाताचा धोका वाढतो.',
      advice: [
        'तळलेले पदार्थ, वनस्पती तूप (डालडा), बेकरीचे पदार्थ आणि फरसाण टाळा.',
        'तेल दिवसाला ३–४ चमचेच वापरा; एकच तेल न वापरता बदलत रहा.',
        'आहारात ओट्स, नाचणी, कडधान्यं, अक्रोड, बदाम आणि जवस यांचा समावेश करा.',
        WALK,
        NO_TOBACCO,
      ],
    },
  },
  {
    key: 'hdl',
    mr: 'एचडीएल (चांगलं कोलेस्टेरॉल)',
    en: 'HDL Cholesterol',
    unit: 'mg/dL',
    group: 'lipid',
    aliases: ['hdl cholesterol', 'hdl', 'high density lipoprotein'],
    ranges: { male: [40, 90], female: [50, 95], default: [40, 90] },
    direction: 'higher_better',
    about: 'एचडीएल हे "चांगलं" कोलेस्टेरॉल आहे. ते नसांमधली अतिरिक्त चरबी यकृताकडे परत नेतं.',
    low: {
      meaning: 'चांगलं कोलेस्टेरॉल कमी असणं हृदयासाठी धोक्याचं आहे.',
      advice: ['रोज चालणं किंवा व्यायाम वाढवा — एचडीएल वाढवण्याचा हा सर्वात चांगला मार्ग आहे.', 'अक्रोड, बदाम, जवस, मासे आहारात ठेवा.', NO_TOBACCO],
    },
    high: { meaning: 'एचडीएल जास्त असणं हृदयासाठी चांगलं मानलं जातं.', advice: ['हाच आहार आणि व्यायाम चालू ठेवा.'] },
  },
  {
    key: 'ldl',
    mr: 'एलडीएल (वाईट कोलेस्टेरॉल)',
    en: 'LDL Cholesterol',
    unit: 'mg/dL',
    group: 'lipid',
    aliases: ['ldl cholesterol', 'ldl', 'low density lipoprotein'],
    ranges: { default: [0, 100] },
    direction: 'lower_better',
    about: 'एलडीएल हे "वाईट" कोलेस्टेरॉल आहे. ते नसांच्या भिंतींवर साठून त्या अरुंद करतं.',
    low: { meaning: 'हे मूल्य कमी असणं चांगलं आहे.', advice: [] },
    high: {
      meaning: 'एलडीएल वाढणं म्हणजे हृदयविकाराचा धोका वाढणं.',
      advice: [
        'तळलेलं, तूपकट आणि बाहेरचं जेवण कमी करा.',
        'रोज एक वाटी कडधान्य किंवा डाळ खा — त्यातलं तंतुमय पदार्थ एलडीएल कमी करतात.',
        'लसूण, मेथीदाणे आणि जवस यांचा वापर वाढवा.',
        WALK,
        SEE_DOCTOR,
      ],
    },
  },
  {
    key: 'triglycerides',
    mr: 'ट्रायग्लिसराइड्स',
    en: 'Triglycerides',
    unit: 'mg/dL',
    group: 'lipid',
    aliases: ['triglycerides', 'triglyceride', 'serum triglycerides', 'tg'],
    ranges: { default: [0, 150] },
    direction: 'lower_better',
    about: 'रक्तातली साठवलेली चरबी. गोड पदार्थ, दारू आणि जास्त भात-मैदा यामुळे हे प्रमाण वाढतं.',
    low: { meaning: 'हे मूल्य कमी असणं चांगलं आहे.', advice: [] },
    high: {
      meaning: 'ट्रायग्लिसराइड्स वाढल्यास हृदयविकार आणि स्वादुपिंडाला सूज येण्याचा धोका वाढतो.',
      advice: [
        'साखर, गोड पेयं, मिठाई आणि बेकरीचे पदार्थ बंद करा.',
        'दारू पूर्णपणे टाळा — याचा या मूल्यावर थेट परिणाम होतो.',
        'भाताचं प्रमाण कमी करून भाजी आणि कोशिंबीर वाढवा.',
        WALK,
      ],
    },
  },

  // ───────────────────────── यकृत ─────────────────────────
  {
    key: 'sgpt',
    mr: 'एसजीपीटी (ALT)',
    en: 'SGPT / ALT',
    unit: 'U/L',
    group: 'liver',
    aliases: ['sgpt', 'alt', 'alanine aminotransferase', 'alanine transaminase'],
    ranges: { male: [0, 45], female: [0, 35], default: [0, 45] },
    direction: 'lower_better',
    about: 'यकृतामधलं एक विकर (enzyme). यकृतावर ताण आल्यास ते रक्तात वाढतं.',
    low: { meaning: 'हे मूल्य कमी असणं काळजीचं कारण नाही.', advice: [] },
    high: {
      meaning: 'एसजीपीटी वाढणं म्हणजे यकृतावर ताण आहे. दारू, चरबीयुक्त यकृत (fatty liver), काही औषधं किंवा कावीळ ही कारणं असू शकतात.',
      advice: [
        'दारू पूर्णपणे बंद करा.',
        'तळलेले आणि तूपकट पदार्थ, बाहेरचं जेवण टाळा.',
        'वजन जास्त असल्यास हळूहळू कमी करा — फॅटी लिव्हरमध्ये हेच सर्वात परिणामकारक आहे.',
        'डॉक्टरांच्या सल्ल्याशिवाय वेदनाशामक गोळ्या घेऊ नका.',
        SEE_DOCTOR,
      ],
    },
  },
  {
    key: 'sgot',
    mr: 'एसजीओटी (AST)',
    en: 'SGOT / AST',
    unit: 'U/L',
    group: 'liver',
    aliases: ['sgot', 'ast', 'aspartate aminotransferase', 'aspartate transaminase'],
    ranges: { default: [0, 40] },
    direction: 'lower_better',
    about: 'यकृत आणि स्नायूंमध्ये आढळणारं विकर. एसजीपीटीबरोबर वाचलं जातं.',
    low: { meaning: 'हे मूल्य कमी असणं काळजीचं कारण नाही.', advice: [] },
    high: {
      meaning: 'हे मूल्य वाढणं यकृतावरचा ताण किंवा जास्त व्यायामामुळे स्नायूंवरचा ताण दर्शवू शकतं.',
      advice: ['दारू टाळा आणि हलका आहार घ्या.', SEE_DOCTOR],
    },
  },
  {
    key: 'bilirubin_total',
    mr: 'एकूण बिलिरुबिन',
    en: 'Total Bilirubin',
    unit: 'mg/dL',
    group: 'liver',
    aliases: ['total bilirubin', 'bilirubin total', 'bilirubin (total)', 'serum bilirubin'],
    ranges: { default: [0.3, 1.2] },
    direction: 'lower_better',
    about: 'जुन्या लाल पेशी तुटल्यावर तयार होणारा पिवळा पदार्थ. यकृत तो शरीराबाहेर टाकतं.',
    low: { meaning: 'हे मूल्य कमी असणं काळजीचं कारण नाही.', advice: [] },
    high: {
      meaning: 'बिलिरुबिन वाढल्यास डोळे आणि त्वचा पिवळी दिसू शकते — याला कावीळ म्हणतात.',
      advice: ['भरपूर पाणी, नारळपाणी आणि सहज पचणारा हलका आहार घ्या.', 'तेलकट, तिखट आणि बाहेरचं अन्न टाळा.', 'दारू पूर्णपणे बंद करा.', SEE_DOCTOR],
    },
  },

  // ──────────────────────── मूत्रपिंड ────────────────────────
  {
    key: 'creatinine',
    mr: 'क्रिएटिनिन',
    en: 'Serum Creatinine',
    unit: 'mg/dL',
    group: 'kidney',
    aliases: ['creatinine', 'serum creatinine', 's. creatinine'],
    ranges: { male: [0.7, 1.3], female: [0.6, 1.1], default: [0.6, 1.3] },
    critical: { high: 4 },
    direction: 'lower_better',
    about: 'स्नायूंमधून तयार होणारा टाकाऊ पदार्थ, जो मूत्रपिंड गाळून लघवीवाटे बाहेर टाकतं. मूत्रपिंडाचं काम कसं चाललंय हे यावरून कळतं.',
    low: { meaning: 'हे मूल्य कमी असणं सहसा काळजीचं कारण नसतं.', advice: [] },
    high: {
      meaning: 'क्रिएटिनिन वाढणं म्हणजे मूत्रपिंडावर ताण असू शकतो. हे लवकर लक्षात आलं तर बरंच काही करता येतं.',
      advice: [
        DRINK_WATER,
        'मीठ कमी करा — लोणची, पापड, फरसाण आणि तयार पदार्थ टाळा.',
        'डॉक्टरांच्या सल्ल्याशिवाय वेदनाशामक गोळ्या (पेनकिलर) घेऊ नका.',
        'रक्तदाब आणि साखर नियंत्रणात ठेवा.',
        SEE_DOCTOR,
      ],
    },
  },
  {
    key: 'urea',
    mr: 'युरिया',
    en: 'Blood Urea',
    unit: 'mg/dL',
    group: 'kidney',
    aliases: ['blood urea', 'urea', 's. urea', 'serum urea'],
    ranges: { default: [15, 45] },
    direction: 'lower_better',
    about: 'प्रथिनं पचल्यावर तयार होणारा टाकाऊ पदार्थ, जो मूत्रपिंड बाहेर टाकतं.',
    low: { meaning: 'हे मूल्य कमी असणं सहसा काळजीचं कारण नसतं.', advice: [] },
    high: {
      meaning: 'युरिया वाढणं शरीरात पाणी कमी असल्यामुळे किंवा मूत्रपिंडाच्या कामावर परिणाम झाल्यामुळे असू शकतं.',
      advice: [DRINK_WATER, 'मीठ आणि खूप जास्त प्रथिनं (प्रोटीन पावडर) कमी करा.', SEE_DOCTOR],
    },
  },
  {
    key: 'uric_acid',
    mr: 'युरिक ॲसिड',
    en: 'Uric Acid',
    unit: 'mg/dL',
    group: 'kidney',
    aliases: ['uric acid', 'serum uric acid', 's. uric acid'],
    ranges: { male: [3.4, 7.0], female: [2.4, 6.0], default: [2.4, 7.0] },
    direction: 'lower_better',
    about: 'शरीरातील एक टाकाऊ पदार्थ. जास्त झाल्यास सांध्यांमध्ये — विशेषतः अंगठ्याच्या सांध्यात — दुखणं आणि सूज येते.',
    low: { meaning: 'हे मूल्य कमी असणं काळजीचं कारण नाही.', advice: [] },
    high: {
      meaning: 'युरिक ॲसिड वाढल्यास गाउट (सांधेदुखी) आणि मुतखड्याचा धोका वाढतो.',
      advice: [
        DRINK_WATER,
        'दारू, विशेषतः बीअर, पूर्णपणे टाळा.',
        'मटण, यकृत आणि कलेजी असे पदार्थ कमी करा.',
        'डाळींचं प्रमाण मर्यादित ठेवा आणि पालक, मशरूम थोडे कमी करा.',
        'चेरी, आवळा आणि लिंबूपाणी उपयोगी ठरतात.',
      ],
    },
  },

  // ──────────────────────── थायरॉईड ────────────────────────
  {
    key: 'tsh',
    mr: 'टीएसएच (थायरॉईड)',
    en: 'TSH',
    unit: 'µIU/mL',
    group: 'thyroid',
    aliases: ['tsh', 'thyroid stimulating hormone', 's. tsh'],
    ranges: { default: [0.4, 4.0] },
    about: 'थायरॉईड ग्रंथी नीट काम करते आहे का हे तपासणारा संप्रेरक. ही ग्रंथी शरीराचा वेग ठरवते.',
    low: {
      meaning: 'टीएसएच कमी असणं म्हणजे थायरॉईड जास्त काम करत असण्याची शक्यता (हायपरथायरॉईड). वजन घटणं, धडधड, घाम आणि चिडचिड जाणवू शकते.',
      advice: ['चहा-कॉफी कमी करा.', 'पुरेशी झोप घ्या.', SEE_DOCTOR],
    },
    high: {
      meaning: 'टीएसएच वाढणं म्हणजे थायरॉईड कमी काम करत असण्याची शक्यता (हायपोथायरॉईड). वजन वाढणं, थकवा, थंडी वाजणं, केस गळणं आणि कोरडी त्वचा ही लक्षणं दिसतात.',
      advice: [
        'आयोडिनयुक्त मीठ वापरा.',
        'कोबी, फ्लॉवर आणि सोयाबीन कच्चे न खाता शिजवून खा.',
        'औषध सुरू असेल तर ते सकाळी उपाशीपोटी, पाण्यासोबत आणि रोज एकाच वेळी घ्या.',
        'औषधानंतर अर्धा तास काहीही खाऊ-पिऊ नका.',
        SEE_DOCTOR,
      ],
    },
  },

  // ──────────────────────── जीवनसत्त्वे ────────────────────────
  {
    key: 'vitamin_d',
    mr: 'ड जीवनसत्त्व',
    en: 'Vitamin D (25-OH)',
    unit: 'ng/mL',
    group: 'vitamin',
    aliases: ['vitamin d', '25 oh vitamin d', '25-hydroxy vitamin d', 'vit d', 'vitamin d3'],
    ranges: { default: [30, 100] },
    direction: 'higher_better',
    about: 'हाडं मजबूत ठेवण्यासाठी आणि कॅल्शियम शोषण्यासाठी आवश्यक. आपल्याकडे ऊन भरपूर असूनही याची कमतरता खूप सामान्य आहे.',
    low: {
      meaning: 'ड जीवनसत्त्व कमी असल्यास हाडं आणि पाठ दुखणं, पायात गोळे येणं, थकवा आणि वारंवार आजारी पडणं असे त्रास होतात.',
      advice: [
        'सकाळी १०–११ च्या दरम्यान रोज १५–२० मिनिटं हातपायांवर ऊन घ्या.',
        'अंड्याचा बलक, मासे, दूध आणि दही आहारात ठेवा.',
        'डॉक्टरांच्या सल्ल्याने आठवड्याची गोळी (सप्लिमेंट) घ्यावी लागू शकते.',
      ],
    },
    high: { meaning: 'हे मूल्य खूप जास्त असणं बहुधा जास्त सप्लिमेंट घेतल्यामुळे होतं.', advice: ['सप्लिमेंट घेणं थांबवण्याआधी डॉक्टरांना विचारा.'] },
  },
  {
    key: 'vitamin_b12',
    mr: 'ब१२ जीवनसत्त्व',
    en: 'Vitamin B12',
    unit: 'pg/mL',
    group: 'vitamin',
    aliases: ['vitamin b12', 'vit b12', 'b12', 'cyanocobalamin', 'cobalamin'],
    ranges: { default: [200, 900] },
    direction: 'higher_better',
    about: 'मज्जासंस्था आणि रक्त तयार होण्यासाठी आवश्यक. पूर्ण शाकाहारी आहार घेणाऱ्यांमध्ये याची कमतरता जास्त आढळते.',
    low: {
      meaning: 'ब१२ कमी असल्यास हातपाय बधीर होणं, मुंग्या येणं, थकवा, विसराळूपणा आणि तोंड येणं असे त्रास होतात.',
      advice: [
        'दूध, दही, ताक, पनीर आणि अंडी आहारात वाढवा.',
        'पूर्ण शाकाहारी असाल तर डॉक्टरांच्या सल्ल्याने ब१२ ची गोळी किंवा इंजेक्शन घ्यावं लागू शकतं.',
        'हे लवकर दुरुस्त केलं नाही तर मज्जातंतूंवर परिणाम होऊ शकतो — दुर्लक्ष करू नका.',
      ],
    },
    high: { meaning: 'हे मूल्य जास्त असणं बहुधा नुकत्याच घेतलेल्या इंजेक्शन किंवा गोळ्यांमुळे असतं.', advice: [] },
  },

  // ───────────────────── क्षार व खनिजे ─────────────────────
  {
    key: 'ferritin',
    mr: 'फेरिटिन (लोहाचा साठा)',
    en: 'Serum Ferritin',
    unit: 'ng/mL',
    group: 'mineral',
    aliases: ['ferritin', 'serum ferritin', 's. ferritin'],
    ranges: { male: [30, 400], female: [15, 150], default: [15, 300] },
    about: 'शरीरात लोहाचा किती साठा शिल्लक आहे हे फेरिटिन दाखवतं. हिमोग्लोबिन कमी होण्याआधीच हे कमी व्हायला लागतं.',
    low: {
      meaning: 'लोहाचा साठा संपत आला आहे. हिमोग्लोबिन अजून सामान्य असलं तरी हे लवकर भरून काढणं गरजेचं आहे.',
      advice: ['गूळ, खजूर, मनुका, पालेभाज्या आणि कडधान्यं वाढवा.', 'लोहाच्या गोळ्या डॉक्टरांच्या सल्ल्यानेच सुरू करा आणि पूर्ण कोर्स करा.'],
    },
    high: { meaning: 'फेरिटिन जास्त असणं शरीरात सूज असल्यामुळे किंवा लोह जास्त साठल्यामुळे असू शकतं.', advice: [SEE_DOCTOR] },
  },
  {
    key: 'calcium',
    mr: 'कॅल्शियम',
    en: 'Serum Calcium',
    unit: 'mg/dL',
    group: 'mineral',
    aliases: ['calcium', 'serum calcium', 's. calcium', 'total calcium'],
    ranges: { default: [8.6, 10.3] },
    about: 'हाडं, दात, स्नायू आणि हृदयाच्या कामासाठी आवश्यक खनिज.',
    low: {
      meaning: 'कॅल्शियम कमी असल्यास स्नायूंमध्ये गोळे येणं, हातापायांना मुंग्या आणि थकवा जाणवतो.',
      advice: ['दूध, दही, ताक, पनीर, नाचणी, तीळ आणि हिरव्या पालेभाज्या वाढवा.', 'ड जीवनसत्त्वही तपासून घ्या — त्याशिवाय कॅल्शियम नीट शोषलं जात नाही.'],
    },
    high: { meaning: 'कॅल्शियम जास्त असल्यास मळमळ, वारंवार लघवी आणि थकवा जाणवू शकतो.', advice: [DRINK_WATER, SEE_DOCTOR] },
  },
  {
    key: 'sodium',
    mr: 'सोडियम',
    en: 'Serum Sodium',
    unit: 'mmol/L',
    group: 'mineral',
    aliases: ['sodium', 'serum sodium', 's. sodium', 'na+', 'na'],
    ranges: { default: [135, 145] },
    critical: { low: 120, high: 160 },
    about: 'शरीरातील पाण्याचं संतुलन राखणारा क्षार.',
    low: { meaning: 'सोडियम कमी असल्यास गोंधळल्यासारखं वाटणं, मळमळ आणि अशक्तपणा येऊ शकतो.', advice: ['हे डॉक्टरांना लगेच दाखवा — स्वतःहून मीठ वाढवू नका.'] },
    high: { meaning: 'सोडियम जास्त असणं बहुधा शरीरात पाणी कमी असल्याचं लक्षण आहे.', advice: [DRINK_WATER, 'मीठ आणि खारट पदार्थ कमी करा.'] },
  },
  {
    key: 'potassium',
    mr: 'पोटॅशियम',
    en: 'Serum Potassium',
    unit: 'mmol/L',
    group: 'mineral',
    aliases: ['potassium', 'serum potassium', 's. potassium', 'k+'],
    ranges: { default: [3.5, 5.1] },
    critical: { low: 2.8, high: 6.5 },
    about: 'हृदयाचे ठोके आणि स्नायूंचं काम नियमित ठेवणारा क्षार.',
    low: {
      meaning: 'पोटॅशियम कमी असल्यास अशक्तपणा, स्नायूंमध्ये गोळे आणि हृदयाचे ठोके अनियमित होऊ शकतात.',
      advice: ['केळं, नारळपाणी, संत्रं, बटाटा आणि पालेभाज्या आहारात घ्या.', SEE_DOCTOR],
    },
    high: {
      meaning: 'पोटॅशियम जास्त असणं हृदयासाठी धोक्याचं ठरू शकतं. मूत्रपिंडाच्या त्रासात असं होतं.',
      advice: ['केळं, नारळपाणी, संत्रं आणि टोमॅटो तात्पुरते कमी करा.', 'हा निकाल आजच डॉक्टरांना दाखवा.'],
    },
  },
];

export const ANALYTE_BY_KEY = new Map(ANALYTES.map((a) => [a.key, a]));

/**
 * Alias lookup table, longest-first so that "total cholesterol" wins over
 * "cholesterol" and "blood sugar fasting" wins over "fasting glucose".
 */
export const ALIAS_INDEX = ANALYTES.flatMap((a) =>
  a.aliases.map((alias) => ({ alias: alias.toLowerCase(), key: a.key })),
).sort((x, y) => y.alias.length - x.alias.length);

/** Reference range for an analyte given the patient's sex. */
export function rangeFor(analyte, sex) {
  if (!analyte?.ranges) return null;
  const s = String(sex || '').toLowerCase();
  if ((s === 'male' || s === 'm' || s === 'पुरुष') && analyte.ranges.male) return analyte.ranges.male;
  if ((s === 'female' || s === 'f' || s === 'स्त्री' || s === 'महिला') && analyte.ranges.female) return analyte.ranges.female;
  return analyte.ranges.default ?? analyte.ranges.male ?? analyte.ranges.female ?? null;
}
