/* ---------------------------------------------------------------------------
   Seed content — one source of truth.

   This file is read twice: by `scripts/generate-seed.mjs`, which writes
   supabase/seed.sql, and by src/lib/demo-data.ts, which serves the same rows
   from memory when no Supabase project is configured. Nothing here is written
   twice, so a correction to a farm's Marathi reaches both the database and the
   demo.

   The farms are written for this build. The shape is what a real onboarding
   produces: one family, their own price, their own phone, and the experiences
   they already run on their own land.
--------------------------------------------------------------------------- */

export type Lang = 'en' | 'hi' | 'mr';
export type I18nText = { en: string; hi: string; mr: string };

export type ActivityCategory =
  | 'farming' | 'trekking' | 'water' | 'food' | 'camping' | 'culture' | 'craft' | 'stars';

export type Slot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface RegionSeed {
  slug: string;
  name: I18nText;
  short: I18nText;
  tagline: I18nText;
  description: I18nText;
  districts: I18nText[];
  season: I18nText;
  reach: I18nText;
  heroScene: string;
  accent: string;
  sortOrder: number;
}

export interface ActivitySeed {
  slug: string;
  name: I18nText;
  description: I18nText;
  category: ActivityCategory;
  durationMinutes: number;
  slots: Slot[];
}

export interface FarmSeed {
  slug: string;
  regionSlug: string;
  district: string;
  hostName: I18nText;
  farmName: I18nText;
  village: I18nText;
  bio: I18nText;
  title: I18nText;
  description: I18nText;
  crops: string[];
  stayType: string;
  scene: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number;
  bestMonths: number[];
  languages: Lang[];
  hostingSince: number;
  landAcres: number;
  phone: string;
  lat: number;
  lng: number;
  featured: boolean;
  activities: string[];
}

export interface PackageSeed {
  slug: string;
  regionSlug: string;
  listingSlug: string;
  title: I18nText;
  summary: I18nText;
  pricePerPerson: number;
  featured: boolean;
  itinerary: { day: 1 | 2; slot: Slot; time: string; activity?: string; title?: I18nText; note?: I18nText }[];
}

/* ─── regions (vibhag) ──────────────────────────────────────────────────── */

export const REGIONS: RegionSeed[] = [
  {
    slug: 'kokan',
    name: { en: 'Kokan Vibhag', hi: 'कोंकण विभाग', mr: 'कोकण विभाग' },
    short: { en: 'Kokan', hi: 'कोंकण', mr: 'कोकण' },
    tagline: {
      en: 'Salt air, laterite soil, and shade the whole way down',
      hi: 'नमकीन हवा, जांभा मिट्टी, और नीचे तक छाँव',
      mr: 'खारा वारा, जांभा माती, आणि खालपर्यंत सावली',
    },
    description: {
      en: 'The coastal strip between the Sahyadri and the sea. Mango, cashew and kokum on the slopes, paddy in the valleys, and a beach at the end of most lanes.',
      hi: 'सह्याद्री और समुद्र के बीच की पट्टी। ढलानों पर आम, काजू और कोकम, घाटियों में धान, और ज़्यादातर गलियों के आख़िर में समुद्र।',
      mr: 'सह्याद्री आणि समुद्रामधली पट्टी. उतारावर आंबा, काजू आणि कोकम, दऱ्यांत भात, आणि बहुतेक वाटांच्या टोकाला समुद्र.',
    },
    districts: [
      { en: 'Ratnagiri', hi: 'रत्नागिरी', mr: 'रत्नागिरी' },
      { en: 'Sindhudurg', hi: 'सिंधुदुर्ग', mr: 'सिंधुदुर्ग' },
      { en: 'Raigad', hi: 'रायगड', mr: 'रायगड' },
      { en: 'Palghar', hi: 'पालघर', mr: 'पालघर' },
    ],
    season: { en: 'November – May', hi: 'नवंबर – मई', mr: 'नोव्हेंबर – मे' },
    reach: {
      en: '4–6 hours from Mumbai or Pune, by Konkan Railway or the coastal highway',
      hi: 'मुंबई या पुणे से 4–6 घंटे, कोंकण रेलवे या तटीय महामार्ग से',
      mr: 'मुंबई किंवा पुण्याहून ४–६ तास, कोकण रेल्वेने किंवा किनारी महामार्गाने',
    },
    heroScene: 'coast',
    accent: '#0f8a7e',
    sortOrder: 1,
  },
  {
    slug: 'nashik',
    name: { en: 'Nashik Vibhag', hi: 'नाशिक विभाग', mr: 'नाशिक विभाग' },
    short: { en: 'Nashik', hi: 'नाशिक', mr: 'नाशिक' },
    tagline: {
      en: 'Black soil, vineyards, and the edge of the Sahyadri',
      hi: 'काली मिट्टी, अंगूर के बाग़, और सह्याद्री का किनारा',
      mr: 'काळी माती, द्राक्षमळे, आणि सह्याद्रीची कड',
    },
    description: {
      en: 'The plateau north-east of the ghats. Grapes and onion around Nashik, pomegranate towards Ahilyanagar, waterfalls at Igatpuri, and forest where the Satpuda begins.',
      hi: 'घाटों के उत्तर-पूर्व का पठार। नाशिक के आसपास अंगूर और प्याज़, अहिल्यानगर की ओर अनार, इगतपुरी में झरने, और जहाँ सतपुड़ा शुरू होता है वहाँ जंगल।',
      mr: 'घाटांच्या ईशान्येचं पठार. नाशिकभोवती द्राक्षं आणि कांदा, अहिल्यानगरकडे डाळिंब, इगतपुरीत धबधबे, आणि सातपुडा सुरू होतो तिथं रान.',
    },
    districts: [
      { en: 'Nashik', hi: 'नाशिक', mr: 'नाशिक' },
      { en: 'Ahilyanagar', hi: 'अहिल्यानगर', mr: 'अहिल्यानगर' },
      { en: 'Dhule', hi: 'धुळे', mr: 'धुळे' },
      { en: 'Nandurbar', hi: 'नंदुरबार', mr: 'नंदुरबार' },
      { en: 'Jalgaon', hi: 'जलगाँव', mr: 'जळगाव' },
    ],
    season: { en: 'June – February', hi: 'जून – फ़रवरी', mr: 'जून – फेब्रुवारी' },
    reach: {
      en: '3–5 hours from Mumbai or Pune, by the Nashik highway or the Igatpuri line',
      hi: 'मुंबई या पुणे से 3–5 घंटे, नाशिक महामार्ग या इगतपुरी लाइन से',
      mr: 'मुंबई किंवा पुण्याहून ३–५ तास, नाशिक महामार्गाने किंवा इगतपुरी मार्गाने',
    },
    heroScene: 'vineyard',
    accent: '#7a5cc4',
    sortOrder: 2,
  },
];

/* ─── crops, referenced by slug from a farm ─────────────────────────────── */

export const CROPS: Record<string, I18nText> = {
  alphonso: { en: 'Alphonso mango', hi: 'हापुस आम', mr: 'हापूस आंबा' },
  cashew: { en: 'Cashew', hi: 'काजू', mr: 'काजू' },
  kokum: { en: 'Kokum', hi: 'कोकम', mr: 'कोकम' },
  coconut: { en: 'Coconut', hi: 'नारियल', mr: 'नारळ' },
  betelnut: { en: 'Areca nut', hi: 'सुपारी', mr: 'सुपारी' },
  rice: { en: 'Paddy', hi: 'धान', mr: 'भात' },
  nachni: { en: 'Finger millet', hi: 'नाचनी', mr: 'नाचणी' },
  jackfruit: { en: 'Jackfruit', hi: 'कटहल', mr: 'फणस' },
  pepper: { en: 'Black pepper', hi: 'काली मिर्च', mr: 'काळी मिरी' },
  grapes: { en: 'Table grapes', hi: 'अंगूर', mr: 'द्राक्षं' },
  onion: { en: 'Onion', hi: 'प्याज़', mr: 'कांदा' },
  tomato: { en: 'Tomato', hi: 'टमाटर', mr: 'टोमॅटो' },
  pomegranate: { en: 'Pomegranate', hi: 'अनार', mr: 'डाळिंब' },
  sugarcane: { en: 'Sugarcane', hi: 'गन्ना', mr: 'ऊस' },
  strawberry: { en: 'Strawberry', hi: 'स्ट्रॉबेरी', mr: 'स्ट्रॉबेरी' },
  banana: { en: 'Banana', hi: 'केला', mr: 'केळी' },
  cotton: { en: 'Cotton', hi: 'कपास', mr: 'कापूस' },
  jowar: { en: 'Sorghum', hi: 'ज्वार', mr: 'ज्वारी' },
  custardapple: { en: 'Custard apple', hi: 'सीताफल', mr: 'सीताफळ' },
  wheat: { en: 'Wheat', hi: 'गेहूँ', mr: 'गहू' },
};

export const STAY_TYPES: Record<string, I18nText> = {
  wadi_room: { en: 'A room in the wadi house', hi: 'वाड़ी के घर में एक कमरा', mr: 'वाडीतल्या घरातली खोली' },
  farm_cottage: { en: 'Separate cottage on the farm', hi: 'खेत पर अलग कुटिया', mr: 'शेतातलं स्वतंत्र घर' },
  mud_house: { en: 'Mud-and-cowdung house', hi: 'मिट्टी और गोबर का घर', mr: 'मातीचं-शेणाचं घर' },
  orchard_tent: { en: 'Tent under the orchard', hi: 'बाग़ में तंबू', mr: 'बागेतला तंबू' },
  terrace_room: { en: 'Terrace room, open sky', hi: 'छत का कमरा, खुला आसमान', mr: 'गच्चीवरची खोली, उघडं आकाश' },
};

/* ─── activities ────────────────────────────────────────────────────────── */
/* `slots` is what the trip planner uses to decide where in a day something can
   sit. An activity that only works at first light says so once, here. */

export const ACTIVITIES: ActivitySeed[] = [
  {
    slug: 'mango-grafting', category: 'farming', durationMinutes: 120, slots: ['morning', 'afternoon'],
    name: { en: 'Grafting mango, and a round of the orchard', hi: 'आम की कलम, और बाग़ का चक्कर', mr: 'आंब्याची कलमं, आणि बागेतली फेरी' },
    description: { en: 'Tie a graft yourself; the tree it becomes will outlive you.', hi: 'ख़ुद एक कलम बाँधिए; वह पेड़ आपसे ज़्यादा जिएगा।', mr: 'स्वतः एक कलम बांधा; ते झाड तुमच्यानंतरही राहील.' },
  },
  {
    slug: 'kokum-syrup', category: 'craft', durationMinutes: 90, slots: ['afternoon'],
    name: { en: 'Making kokum syrup', hi: 'कोकम शरबत बनाना', mr: 'कोकम सरबत करणं' },
    description: { en: 'Rind, sugar, sun. You carry a bottle home.', hi: 'छिलका, चीनी, धूप। एक बोतल साथ जाती है।', mr: 'साल, साखर, ऊन. एक बाटली सोबत जाते.' },
  },
  {
    slug: 'kokan-thali', category: 'food', durationMinutes: 120, slots: ['midday', 'night'],
    name: { en: 'A Kokan thali, cooked with the family', hi: 'परिवार के साथ कोंकणी थाली', mr: 'घरच्यांसोबत कोकणी थाळी' },
    description: { en: 'Wood fire, coconut, kokum. Vegetarian on request, no fuss.', hi: 'चूल्हा, नारियल, कोकम। कहने पर शाकाहारी, बिना हिचक।', mr: 'चूल, नारळ, कोकम. सांगितलं तर शाकाहारी, विनातक्रार.' },
  },
  {
    slug: 'low-tide-walk', category: 'water', durationMinutes: 90, slots: ['morning', 'evening'],
    name: { en: 'The reef at low tide', hi: 'उतरते पानी में चट्टान', mr: 'ओहोटीतला खडक' },
    description: { en: 'Crabs, anemones, and whatever the sea left behind.', hi: 'केकड़े, समुद्री फूल, और जो समुद्र छोड़ गया।', mr: 'खेकडे, सागरफुलं, आणि समुद्रानं मागं ठेवलेलं.' },
  },
  {
    slug: 'night-stars', category: 'stars', durationMinutes: 60, slots: ['night'],
    name: { en: 'Lying out for the stars', hi: 'तारों के नीचे लेटना', mr: 'चांदण्याखाली पडून राहणं' },
    description: { en: 'The lights go off at ten. Then you understand the point.', hi: 'दस बजे बत्ती बंद। तब बात समझ आती है।', mr: 'दहाला दिवे बंद. मग गोष्ट लक्षात येते.' },
  },
  {
    slug: 'cashew-roast', category: 'craft', durationMinutes: 90, slots: ['afternoon'],
    name: { en: 'Roasting and shelling cashew', hi: 'काजू भूनना और छीलना', mr: 'काजू भाजणं आणि सोलणं' },
    description: { en: 'Gloves on — the shell oil bites. Worth it for the first warm one.', hi: 'दस्ताने पहनिए — छिलके का तेल जलाता है। पहला गरम काजू उसका मोल है।', mr: 'हातमोजे घाला — सालीचं तेल चटका देतं. पहिल्या गरम काजूसाठी ते सोसवतं.' },
  },
  {
    slug: 'backwater-kayak', category: 'water', durationMinutes: 120, slots: ['morning', 'evening'],
    name: { en: 'Kayaking the backwater', hi: 'खाड़ी में कयाकिंग', mr: 'खाडीत कयाकिंग' },
    description: { en: 'Flat water, mangrove on both sides, kingfishers.', hi: 'शांत पानी, दोनों ओर कच्छ वन, किलकिले।', mr: 'शांत पाणी, दोन्ही बाजूंना खारफुटी, खंड्या.' },
  },
  {
    slug: 'fish-curry', category: 'food', durationMinutes: 120, slots: ['afternoon', 'night'],
    name: { en: 'Coastal fish curry, start to finish', hi: 'तटीय मछली करी, शुरू से आख़िर', mr: 'माशाचं कालवण, सुरुवातीपासून' },
    description: { en: 'From the morning catch. A vegetable version runs alongside.', hi: 'सुबह की पकड़ से। साथ में सब्ज़ी वाला रूप भी बनता है।', mr: 'सकाळच्या पाटीतून. सोबत भाजीचं कालवणही होतं.' },
  },
  {
    slug: 'beach-sunrise', category: 'water', durationMinutes: 90, slots: ['morning'],
    name: { en: 'Sunrise on an empty beach', hi: 'सुनसान समुद्र तट पर सूर्योदय', mr: 'निर्जन किनाऱ्यावर सूर्योदय' },
    description: { en: 'Ten minutes on foot, and nobody else is up.', hi: 'दस मिनट पैदल, और कोई जागा नहीं होता।', mr: 'दहा मिनिटं चालत, आणि दुसरं कुणी उठलेलं नसतं.' },
  },
  {
    slug: 'paddy-work', category: 'farming', durationMinutes: 120, slots: ['morning'],
    name: { en: 'Paddy work, ankle deep', hi: 'धान के खेत में काम', mr: 'भातशेतीत काम' },
    description: { en: 'Transplanting in July, cutting in October. Both hurt the back.', hi: 'जुलाई में रोपाई, अक्तूबर में कटाई। दोनों में कमर दुखती है।', mr: 'जुलैत लावणी, ऑक्टोबरात कापणी. दोन्हींत कंबर दुखते.' },
  },
  {
    slug: 'river-swim', category: 'water', durationMinutes: 90, slots: ['afternoon'],
    name: { en: 'The river pool', hi: 'नदी का कुंड', mr: 'नदीचा डोह' },
    description: { en: 'Chest deep, cold, and the only clock is the light.', hi: 'छाती तक, ठंडा, और घड़ी सिर्फ़ रोशनी है।', mr: 'छातीइतकं, गार, आणि घड्याळ म्हणजे फक्त उजेड.' },
  },
  {
    slug: 'bhakri-making', category: 'food', durationMinutes: 60, slots: ['evening', 'midday'],
    name: { en: 'Bhakri on a wood fire', hi: 'चूल्हे पर भाकरी', mr: 'चुलीवर भाकरी' },
    description: { en: 'Yours will tear. Theirs will not. That is the lesson.', hi: 'आपकी फटेगी। उनकी नहीं। सीख यही है।', mr: 'तुमची फाटेल. त्यांची नाही. शिकवण तीच.' },
  },
  {
    slug: 'waterfall-walk', category: 'trekking', durationMinutes: 150, slots: ['morning', 'afternoon'],
    name: { en: 'Walking to the waterfall', hi: 'झरने तक पैदल', mr: 'धबधब्यापर्यंत चालणं' },
    description: { en: 'An hour up through the fields, longer coming back wet.', hi: 'खेतों से एक घंटा ऊपर, भीगकर लौटने में ज़्यादा।', mr: 'शेतांतून तासभर वर, भिजून परतायला जास्त.' },
  },
  {
    slug: 'warli-painting', category: 'craft', durationMinutes: 120, slots: ['afternoon', 'evening'],
    name: { en: 'Warli painting on the wall', hi: 'दीवार पर वारली चित्र', mr: 'भिंतीवर वारली चित्र' },
    description: { en: 'Rice paste, a bamboo stick, and the grandmother correcting you.', hi: 'चावल का घोल, बाँस की तीली, और दादी की टोक।', mr: 'तांदळाचं पीठ, बांबूची काडी, आणि आजीची दुरुस्ती.' },
  },
  {
    slug: 'forest-walk', category: 'trekking', durationMinutes: 120, slots: ['morning'],
    name: { en: 'Forest walk with the family', hi: 'परिवार के साथ जंगल की सैर', mr: 'घरच्यांसोबत रानातली फेरी' },
    description: { en: 'They name every tree, and what each one is for.', hi: 'हर पेड़ का नाम, और उसका काम भी बताते हैं।', mr: 'प्रत्येक झाडाचं नाव, आणि त्याचा उपयोगही सांगतात.' },
  },
  {
    slug: 'hilltop-sunset', category: 'trekking', durationMinutes: 90, slots: ['evening'],
    name: { en: 'Sunset from the hill above', hi: 'ऊपर की पहाड़ी से सूर्यास्त', mr: 'वरच्या टेकडीवरून सूर्यास्त' },
    description: { en: 'Twenty minutes up. Tea carried in a steel flask.', hi: 'बीस मिनट की चढ़ाई। चाय स्टील की बोतल में साथ।', mr: 'वीस मिनिटं चढण. चहा स्टीलच्या बाटलीत सोबत.' },
  },
  {
    slug: 'jackfruit-harvest', category: 'farming', durationMinutes: 90, slots: ['morning', 'afternoon'],
    name: { en: 'Bringing down jackfruit', hi: 'कटहल उतारना', mr: 'फणस उतरवणं' },
    description: { en: 'Oil your hands first, or the sap stays for a week.', hi: 'पहले हाथों पर तेल, वरना चीप हफ़्ता भर रहती है।', mr: 'आधी हाताला तेल, नाहीतर चीक आठवडाभर राहतो.' },
  },
  {
    slug: 'spice-trail', category: 'farming', durationMinutes: 90, slots: ['morning'],
    name: { en: 'The pepper and spice rows', hi: 'काली मिर्च और मसालों की क़तारें', mr: 'मिरी आणि मसाल्याच्या ओळी' },
    description: { en: 'Pepper climbing the areca, cinnamon at the edge.', hi: 'सुपारी पर चढ़ती काली मिर्च, किनारे दालचीनी।', mr: 'सुपारीवर चढणारी मिरी, कडेला दालचिनी.' },
  },
  {
    slug: 'coconut-climb', category: 'craft', durationMinutes: 45, slots: ['morning'],
    name: { en: 'Watching the tree climber work', hi: 'नारियल पर चढ़ते देखना', mr: 'माडावर चढणाऱ्याला बघणं' },
    description: { en: 'Sixty feet in ninety seconds, and one tender coconut each.', hi: 'नब्बे सेकंड में साठ फुट, और हर एक को एक नारियल।', mr: 'नव्वद सेकंदांत साठ फूट, आणि प्रत्येकाला एक शहाळं.' },
  },
  {
    slug: 'temple-walk', category: 'culture', durationMinutes: 60, slots: ['evening'],
    name: { en: 'Evening at the village temple', hi: 'गाँव के मंदिर में शाम', mr: 'गावच्या देवळात संध्याकाळ' },
    description: { en: 'The bell, the lamp, and half the village on the steps.', hi: 'घंटा, दीया, और सीढ़ियों पर आधा गाँव।', mr: 'घंटा, दिवा, आणि पायऱ्यांवर अर्धं गाव.' },
  },
  {
    slug: 'bird-walk', category: 'trekking', durationMinutes: 90, slots: ['morning'],
    name: { en: 'Birds before breakfast', hi: 'नाश्ते से पहले पक्षी', mr: 'न्याहारीआधी पक्षी' },
    description: { en: 'Bring nothing. The names come in Marathi first.', hi: 'कुछ मत लाइए। नाम पहले मराठी में आते हैं।', mr: 'काही आणू नका. नावं आधी मराठीत येतात.' },
  },
  {
    slug: 'grape-pruning', category: 'farming', durationMinutes: 120, slots: ['morning'],
    name: { en: 'Pruning and tying the vines', hi: 'बेलों की छँटाई और बँधाई', mr: 'वेलींची छाटणी आणि बांधणी' },
    description: { en: 'Every cut decides a bunch six months from now.', hi: 'हर कटाई छह महीने बाद का गुच्छा तय करती है।', mr: 'प्रत्येक छाटणी सहा महिन्यांनंतरचा घड ठरवते.' },
  },
  {
    slug: 'raisin-making', category: 'craft', durationMinutes: 60, slots: ['afternoon'],
    name: { en: 'Turning grapes into raisins', hi: 'अंगूर से किशमिश', mr: 'द्राक्षांचे बेदाणे' },
    description: { en: 'The dipping, the racks, the eighteen days of waiting.', hi: 'डुबाना, रैक, और अठारह दिन का इंतज़ार।', mr: 'बुडवणं, रॅक, आणि अठरा दिवसांची वाट.' },
  },
  {
    slug: 'vineyard-dinner', category: 'food', durationMinutes: 120, slots: ['night'],
    name: { en: 'Dinner between the vines', hi: 'बेलों के बीच रात का खाना', mr: 'वेलींमध्ये रात्रीचं जेवण' },
    description: { en: 'Lanterns on the wire, food off the same soil.', hi: 'तार पर लालटेन, उसी मिट्टी का खाना।', mr: 'तारेवर कंदील, त्याच मातीचं जेवण.' },
  },
  {
    slug: 'kalsubai-climb', category: 'trekking', durationMinutes: 300, slots: ['morning'],
    name: { en: 'Early climb towards Kalsubai', hi: 'कलसुबाई की ओर सुबह की चढ़ाई', mr: 'कळसूबाईकडे पहाटेची चढाई' },
    description: { en: 'Leave at five. The highest point in Maharashtra by nine.', hi: 'पाँच बजे निकलिए। नौ बजे तक महाराष्ट्र का सबसे ऊँचा बिंदु।', mr: 'पाचला निघा. नऊपर्यंत महाराष्ट्राचं सर्वोच्च टोक.' },
  },
  {
    slug: 'strawberry-pick', category: 'farming', durationMinutes: 90, slots: ['morning', 'afternoon'],
    name: { en: 'Picking strawberries', hi: 'स्ट्रॉबेरी तोड़ना', mr: 'स्ट्रॉबेरी तोडणं' },
    description: { en: 'December to March, and the count never matches the basket.', hi: 'दिसंबर से मार्च, और गिनती टोकरी से कभी नहीं मिलती।', mr: 'डिसेंबर ते मार्च, आणि मोजणी कधीच टोपलीशी जुळत नाही.' },
  },
  {
    slug: 'campfire', category: 'camping', durationMinutes: 120, slots: ['night'],
    name: { en: 'Campfire and old songs', hi: 'अलाव और पुराने गीत', mr: 'शेकोटी आणि जुनी गाणी' },
    description: { en: 'Someone always has a dholki. It is never planned.', hi: 'किसी के पास ढोलकी होती ही है। तय कभी नहीं होता।', mr: 'कुणाकडे तरी ढोलकी असतेच. ठरवून कधीच होत नाही.' },
  },
  {
    slug: 'pomegranate-harvest', category: 'farming', durationMinutes: 120, slots: ['morning'],
    name: { en: 'Pomegranate picking and grading', hi: 'अनार तोड़ना और छाँटना', mr: 'डाळिंब तोडणं आणि प्रतवारी' },
    description: { en: 'Export grade, local grade, and the ones the family keeps.', hi: 'निर्यात वाली, स्थानीय, और वे जो घर रखता है।', mr: 'निर्यातीची, स्थानिक, आणि घरात ठेवायची.' },
  },
  {
    slug: 'gur-making', category: 'craft', durationMinutes: 150, slots: ['afternoon'],
    name: { en: 'Jaggery at the crusher', hi: 'गुड़ बनाना', mr: 'गुऱ्हाळात गूळ' },
    description: { en: 'Four hours of boiling for one tray. Taste it warm.', hi: 'एक थाल के लिए चार घंटे की उबाल। गरम चखिए।', mr: 'एका थाळीसाठी चार तासांची उकळ. गरमच चाखा.' },
  },
  {
    slug: 'bullock-cart', category: 'culture', durationMinutes: 60, slots: ['afternoon', 'evening'],
    name: { en: 'Bullock cart to the far field', hi: 'बैलगाड़ी से दूर के खेत तक', mr: 'बैलगाडीनं लांबच्या शेतात' },
    description: { en: 'Slower than walking, and nobody minds.', hi: 'पैदल से धीमी, और किसी को फ़र्क़ नहीं पड़ता।', mr: 'चालण्यापेक्षा सावकाश, आणि कुणाला घाई नाही.' },
  },
  {
    slug: 'banana-harvest', category: 'farming', durationMinutes: 90, slots: ['morning'],
    name: { en: 'Cutting a banana bunch', hi: 'केले का घड़ काटना', mr: 'केळीचा घड कापणं' },
    description: { en: 'Forty kilos on one shoulder. You will try once.', hi: 'एक कंधे पर चालीस किलो। एक बार आज़माइएगा ज़रूर।', mr: 'एका खांद्यावर चाळीस किलो. एकदा तरी प्रयत्न कराल.' },
  },
  {
    slug: 'khandeshi-kitchen', category: 'food', durationMinutes: 120, slots: ['evening', 'night'],
    name: { en: 'Khandeshi kitchen, chillies and all', hi: 'खानदेशी रसोई, मिर्च समेत', mr: 'खानदेशी स्वयंपाक, तिखटासह' },
    description: { en: 'Shev bhaji, wangyache bharit, and a warning you will ignore.', hi: 'शेव भाजी, बैंगन का भरता, और एक चेतावनी जो आप अनसुनी करेंगे।', mr: 'शेव भाजी, वांग्याचं भरीत, आणि तुम्ही न ऐकणारी सूचना.' },
  },
  {
    slug: 'folk-music', category: 'culture', durationMinutes: 90, slots: ['night'],
    name: { en: 'Folk songs on the veranda', hi: 'ओसारी पर लोकगीत', mr: 'ओसरीवर लोकगीतं' },
    description: { en: 'Ovi and pawri, sung the way they are sung at work.', hi: 'ओवी और पावरी, वैसे ही जैसे काम पर गाई जाती हैं।', mr: 'ओवी आणि पावरी, कामावर गातात तशीच.' },
  },
  {
    slug: 'satpuda-walk', category: 'trekking', durationMinutes: 180, slots: ['morning'],
    name: { en: 'Into the Satpuda edge', hi: 'सतपुड़ा के किनारे तक', mr: 'सातपुड्याच्या कडेपर्यंत' },
    description: { en: 'Teak, mahua, and a view that drops into Madhya Pradesh.', hi: 'सागौन, महुआ, और मध्य प्रदेश तक गिरता नज़ारा।', mr: 'साग, मोह, आणि मध्य प्रदेशात उतरणारा नजारा.' },
  },
  {
    slug: 'honey-gather', category: 'craft', durationMinutes: 90, slots: ['afternoon'],
    name: { en: 'Watching the honey come out', hi: 'शहद निकलते देखना', mr: 'मध काढताना बघणं' },
    description: { en: 'Smoke, patience, and a jar that tastes of mahua.', hi: 'धुआँ, धीरज, और महुए के स्वाद वाला जार।', mr: 'धूर, संयम, आणि मोहाची चव असलेली बरणी.' },
  },
  {
    slug: 'onion-market', category: 'culture', durationMinutes: 120, slots: ['morning'],
    name: { en: 'Dawn at the onion market', hi: 'सुबह प्याज़ मंडी', mr: 'पहाटे कांदा बाजार' },
    description: { en: 'Lasalgaon sets the price of onion for the country. Watch it happen.', hi: 'लासलगाँव देश में प्याज़ का भाव तय करता है। होते देखिए।', mr: 'लासलगाव देशाचा कांदाभाव ठरवतं. ते होताना बघा.' },
  },
  {
    slug: 'cotton-walk', category: 'farming', durationMinutes: 90, slots: ['afternoon'],
    name: { en: 'Picking cotton, one row', hi: 'एक क़तार कपास चुनना', mr: 'एक ओळ कापूस वेचणं' },
    description: { en: 'A kilo takes an hour. The rate for it takes a minute to explain.', hi: 'एक किलो में एक घंटा। उसका भाव समझाने में एक मिनट।', mr: 'एक किलोला तासभर. त्याचा भाव सांगायला एक मिनिट.' },
  },
];

/* ─── the farms already onboarded ───────────────────────────────────────── */
/* No rating or review count here on purpose. A rating is what the reviews say,
   maintained by the trigger in 20260907090100_functions.sql, and a number
   written next to a farm that no one has reviewed is just a number someone made
   up. Farms with no reviews yet say so on their page. */
/* Month numbers are 1–12. `scene` selects the procedural artwork drawn for a
   listing that has not uploaded photographs yet — see components/Scene.tsx. */

export const FARMS: FarmSeed[] = [
  {
    slug: 'amrai-wadi-pawas', regionSlug: 'kokan', district: 'Ratnagiri',
    hostName: { en: 'Sadanand Sawant', hi: 'सदानंद सावंत', mr: 'सदानंद सावंत' },
    farmName: { en: 'Amrai Wadi', hi: 'आम्रा वाड़ी', mr: 'आम्रा वाडी' },
    village: { en: 'Pawas', hi: 'पावस', mr: 'पावस' },
    title: {
      en: 'Two days in an Alphonso wadi above Pawas',
      hi: 'पावस के ऊपर हापुस की वाड़ी में दो दिन',
      mr: 'पावसच्या वर हापूसच्या वाडीत दोन दिवस',
    },
    description: {
      en: 'Four hundred mango trees on a laterite slope, kokum along the boundary, and the sea eleven kilometres down the road. You get the room at the end of the house, its own door, and a veranda that faces the trees.',
      hi: 'जांभा ढलान पर चार सौ आम के पेड़, सीमा पर कोकम, और ग्यारह किलोमीटर नीचे समुद्र। घर के आख़िर वाला कमरा आपका — अपना दरवाज़ा, और पेड़ों की ओर खुलती ओसारी।',
      mr: 'जांभ्या उतारावर चारशे आंब्याची झाडं, बांधावर कोकम, आणि अकरा किलोमीटरवर समुद्र. घराच्या टोकाची खोली तुमची — स्वतःचा दरवाजा, आणि झाडांकडे तोंड असलेली ओसरी.',
    },
    bio: {
      en: 'Sadanand has worked this wadi since 1989 and grafts for half the village. His wife Sunanda cooks; their son handles the phone and the booking.',
      hi: '1989 से सदानंद इसी वाड़ी में हैं और आधे गाँव की कलम बाँधते हैं। पत्नी सुनंदा रसोई सँभालती हैं; बेटा फ़ोन और बुकिंग।',
      mr: 'सदानंद १९८९ पासून ह्याच वाडीत आहेत आणि अर्ध्या गावाची कलमं बांधतात. पत्नी सुनंदा स्वयंपाक बघतात; मुलगा फोन आणि बुकिंग.',
    },
    crops: ['alphonso', 'kokum', 'coconut'], stayType: 'wadi_room', scene: 'orchard',
    basePrice: 2400, maxGuests: 8, bedrooms: 2, bestMonths: [11, 12, 1, 2, 3, 4, 5],
    languages: ['mr', 'hi'], hostingSince: 2023, landAcres: 6, phone: '+91 98230 11045',
    lat: 16.9331, lng: 73.3255, featured: true,
    activities: ['mango-grafting', 'kokum-syrup', 'kokan-thali', 'low-tide-walk', 'night-stars', 'bird-walk'],
  },
  {
    slug: 'kaju-mala-achara', regionSlug: 'kokan', district: 'Sindhudurg',
    hostName: { en: 'Vaishali Parab', hi: 'वैशाली पराब', mr: 'वैशाली पराब' },
    farmName: { en: 'Kaju Mala', hi: 'काजू माळ', mr: 'काजू माळ' },
    village: { en: 'Achara', hi: 'आचरा', mr: 'आचरा' },
    title: {
      en: 'A cashew slope, and the creek at the bottom of it',
      hi: 'काजू की ढलान, और उसके नीचे की खाड़ी',
      mr: 'काजूचा माळ, आणि त्याखालची खाडी',
    },
    description: {
      en: 'A separate cottage under the cashew, ten minutes from Achara beach and five from the creek where the kayaks are kept. Roasting happens in February and March; the rest of the year the slope is just quiet.',
      hi: 'काजू के नीचे अलग कुटिया, आचरा समुद्र तट से दस मिनट और उस खाड़ी से पाँच जहाँ कयाक रखे हैं। भूनना फ़रवरी-मार्च में; बाक़ी साल ढलान बस शांत रहती है।',
      mr: 'काजूखाली स्वतंत्र घर, आचरा किनाऱ्यापासून दहा मिनिटं आणि कयाक ठेवलेल्या खाडीपासून पाच. भाजणी फेब्रुवारी-मार्चमध्ये; बाकी वर्षभर माळ नुसताच शांत.',
    },
    bio: {
      en: 'Vaishali runs the farm and a self-help group of nineteen women who process the cashew. She was the first host in Sindhudurg to finish onboarding.',
      hi: 'वैशाली खेत भी सँभालती हैं और उन्नीस महिलाओं का बचत गट भी, जो काजू तैयार करता है। सिंधुदुर्ग में जुड़ाव पूरा करने वाली वे पहली मेज़बान हैं।',
      mr: 'वैशाली शेतीही बघतात आणि काजू तयार करणारा एकोणीस बायकांचा बचत गटही. सिंधुदुर्गात नोंदणी पूर्ण करणाऱ्या त्या पहिल्या यजमान.',
    },
    crops: ['cashew', 'coconut', 'betelnut'], stayType: 'farm_cottage', scene: 'coast',
    basePrice: 2900, maxGuests: 10, bedrooms: 3, bestMonths: [10, 11, 12, 1, 2, 3, 4],
    languages: ['mr', 'hi', 'en'], hostingSince: 2022, landAcres: 9, phone: '+91 94220 33871',
    lat: 16.1793, lng: 73.4402, featured: true,
    activities: ['cashew-roast', 'backwater-kayak', 'fish-curry', 'beach-sunrise', 'low-tide-walk', 'night-stars'],
  },
  {
    slug: 'bhat-shet-roha', regionSlug: 'kokan', district: 'Raigad',
    hostName: { en: 'Ramesh Mhatre', hi: 'रमेश म्हात्रे', mr: 'रमेश म्हात्रे' },
    farmName: { en: 'Bhat Shet', hi: 'भात शेत', mr: 'भात शेत' },
    village: { en: 'Roha', hi: 'रोहा', mr: 'रोहा' },
    title: {
      en: 'Paddy, a river pool, and a house made of mud',
      hi: 'धान, नदी का कुंड, और मिट्टी का घर',
      mr: 'भात, नदीचा डोह, आणि मातीचं घर',
    },
    description: {
      en: 'The cheapest stay on the platform and the one people write the longest reviews about. Two rooms in a mud-and-cowdung house that stays cool at two in the afternoon, and the Kundalika ten minutes away on foot.',
      hi: 'मंच पर सबसे सस्ता ठिकाना, और सबसे लंबी समीक्षाएँ इसी की आती हैं। मिट्टी-गोबर के घर में दो कमरे, जो दोपहर दो बजे भी ठंडे रहते हैं, और दस मिनट पैदल पर कुंडलिका।',
      mr: 'साइटवरचा सगळ्यात स्वस्त मुक्काम, आणि सगळ्यात लांब अभिप्राय ह्याच्याच येतात. मातीच्या-शेणाच्या घरात दोन खोल्या, दुपारी दोनलाही गार, आणि दहा मिनिटांवर कुंडलिका.',
    },
    bio: {
      en: 'Ramesh farms four acres of paddy and drives a school van in the dry months. He asks guests to work one hour in the field, and does not charge for it.',
      hi: 'रमेश चार एकड़ धान करते हैं और सूखे महीनों में स्कूल वैन चलाते हैं। वे मेहमानों से खेत में एक घंटा काम माँगते हैं, और उसका पैसा नहीं लेते।',
      mr: 'रमेश चार एकर भात करतात आणि कोरड्या महिन्यांत स्कूल व्हॅन चालवतात. पाहुण्यांकडून शेतात एक तास काम मागतात, आणि त्याचे पैसे घेत नाहीत.',
    },
    crops: ['rice', 'betelnut'], stayType: 'mud_house', scene: 'river',
    basePrice: 1900, maxGuests: 6, bedrooms: 2, bestMonths: [7, 8, 9, 10, 11, 12, 1],
    languages: ['mr', 'hi'], hostingSince: 2024, landAcres: 4, phone: '+91 90280 44219',
    lat: 18.4386, lng: 73.1198, featured: false,
    activities: ['paddy-work', 'river-swim', 'bhakri-making', 'waterfall-walk', 'bullock-cart', 'night-stars'],
  },
  {
    slug: 'warli-angan-jawhar', regionSlug: 'kokan', district: 'Palghar',
    hostName: { en: 'Sunita Bhoir', hi: 'सुनीता भोईर', mr: 'सुनीता भोईर' },
    farmName: { en: 'Warli Angan', hi: 'वारली आँगन', mr: 'वारली अंगण' },
    village: { en: 'Jawhar', hi: 'जव्हार', mr: 'जव्हार' },
    title: {
      en: 'Warli country: nachni, a painted wall, and no phone signal',
      hi: 'वारली इलाक़ा: नाचनी, चित्रित दीवार, और नेटवर्क नहीं',
      mr: 'वारली मुलूख: नाचणी, चित्रं काढलेली भिंत, आणि रेंज नाही',
    },
    description: {
      en: 'Eight hundred metres up, where Jawhar gets cold in December. The front wall of the house is repainted every year, and you will be handed a bamboo stick and asked to add something.',
      hi: 'आठ सौ मीटर ऊपर, जहाँ दिसंबर में जव्हार ठंडा हो जाता है। घर की अगली दीवार हर साल फिर से रँगती है, और आपको बाँस की तीली देकर कुछ जोड़ने को कहा जाएगा।',
      mr: 'आठशे मीटर उंचीवर, जिथं डिसेंबरात जव्हार गार होतं. घराची पुढची भिंत दरवर्षी नव्यानं रंगते, आणि तुमच्या हातात बांबूची काडी देऊन काहीतरी काढायला सांगतील.',
    },
    bio: {
      en: 'Sunita paints Warli for a living and farms nachni for the house. Her daughter is doing a diploma in Nashik and translates on calls.',
      hi: 'सुनीता वारली चित्र से कमाती हैं और घर के लिए नाचनी उगाती हैं। बेटी नाशिक में डिप्लोमा कर रही है और फ़ोन पर अनुवाद करती है।',
      mr: 'सुनीता वारली चित्रांतून कमावतात आणि घरासाठी नाचणी करतात. मुलगी नाशिकला डिप्लोमा करते आणि फोनवर भाषांतर करते.',
    },
    crops: ['rice', 'nachni'], stayType: 'mud_house', scene: 'hills',
    basePrice: 1700, maxGuests: 8, bedrooms: 2, bestMonths: [8, 9, 10, 11, 12, 1, 2],
    languages: ['mr', 'hi'], hostingSince: 2023, landAcres: 3, phone: '+91 89999 20714',
    lat: 19.9117, lng: 73.2270, featured: true,
    activities: ['warli-painting', 'forest-walk', 'hilltop-sunset', 'bhakri-making', 'folk-music', 'night-stars'],
  },
  {
    slug: 'supari-bagayat-guhagar', regionSlug: 'kokan', district: 'Ratnagiri',
    hostName: { en: 'Anil Gurav', hi: 'अनिल गुरव', mr: 'अनिल गुरव' },
    farmName: { en: 'Supari Bagayat', hi: 'सुपारी बग़ीचा', mr: 'सुपारी बागायत' },
    village: { en: 'Guhagar', hi: 'गुहागर', mr: 'गुहागर' },
    title: {
      en: 'Tents under the areca, two lanes from Guhagar beach',
      hi: 'सुपारी के नीचे तंबू, गुहागर तट से दो गली दूर',
      mr: 'सुपारीखाली तंबू, गुहागर किनाऱ्यापासून दोन गल्ल्या',
    },
    description: {
      en: 'Twelve people fit here, which is why cousins book it. Canvas tents on wooden platforms between the areca rows, proper bathrooms at the end, and the beach at walking distance.',
      hi: 'यहाँ बारह लोग समाते हैं, इसीलिए भाई-बहन मिलकर बुक करते हैं। सुपारी की क़तारों के बीच लकड़ी के चबूतरों पर तंबू, आख़िर में ढंग के स्नानघर, और पैदल दूरी पर समुद्र।',
      mr: 'इथं बारा माणसं मावतात, म्हणून भावंडं मिळून बुक करतात. सुपारीच्या ओळींमध्ये लाकडी चौथऱ्यांवर तंबू, टोकाला नीट स्नानगृहं, आणि चालत जाण्याइतक्या अंतरावर समुद्र.',
    },
    bio: {
      en: 'Anil left a hotel job in Ratnagiri to take over his father’s bagayat. He is the one who will make you climb down to the beach for sunrise.',
      hi: 'अनिल ने रत्नागिरी की होटल नौकरी छोड़कर पिता की बग़ीची सँभाली। सूर्योदय के लिए आपको समुद्र तक उतारने वाले वही हैं।',
      mr: 'अनिलनं रत्नागिरीतली हॉटेलची नोकरी सोडून वडिलांची बागायत हाती घेतली. सूर्योदयासाठी तुम्हाला किनाऱ्यावर उतरवणारे तेच.',
    },
    crops: ['betelnut', 'coconut', 'jackfruit'], stayType: 'orchard_tent', scene: 'coast',
    basePrice: 2200, maxGuests: 12, bedrooms: 4, bestMonths: [10, 11, 12, 1, 2, 3],
    languages: ['mr', 'hi', 'en'], hostingSince: 2024, landAcres: 5, phone: '+91 97650 88123',
    lat: 17.4805, lng: 73.1935, featured: false,
    activities: ['coconut-climb', 'jackfruit-harvest', 'beach-sunrise', 'temple-walk', 'kokan-thali', 'campfire'],
  },
  {
    slug: 'kokam-aali-kudal', regionSlug: 'kokan', district: 'Sindhudurg',
    hostName: { en: 'Shubhangi Naik', hi: 'शुभांगी नाईक', mr: 'शुभांगी नाईक' },
    farmName: { en: 'Kokam Aali', hi: 'कोकम आळी', mr: 'कोकम आळी' },
    village: { en: 'Kudal', hi: 'कुडाळ', mr: 'कुडाळ' },
    title: {
      en: 'Kokum, pepper, and a kitchen worth the drive',
      hi: 'कोकम, काली मिर्च, और उस रसोई के लिए इतना सफ़र सही',
      mr: 'कोकम, मिरी, आणि एवढा प्रवास करावा असा स्वयंपाक',
    },
    description: {
      en: 'A small cottage for six, deliberately kept small. Pepper climbs the areca, kokum dries in the yard from April, and every meal here starts with sol kadhi.',
      hi: 'छह लोगों की छोटी कुटिया, जान-बूझकर छोटी रखी गई। सुपारी पर काली मिर्च चढ़ती है, अप्रैल से आँगन में कोकम सूखता है, और हर खाना सोल कढ़ी से शुरू होता है।',
      mr: 'सहा जणांचं छोटं घर, मुद्दाम छोटं ठेवलेलं. सुपारीवर मिरी चढते, एप्रिलपासून अंगणात कोकम वाळतं, आणि इथलं प्रत्येक जेवण सोलकढीनं सुरू होतं.',
    },
    bio: {
      en: 'Shubhangi taught school for twenty-two years and now sells kokum agal to three cities. Nothing leaves her kitchen unlabelled.',
      hi: 'शुभांगी बाईस साल स्कूल में पढ़ाती रहीं, अब तीन शहरों में कोकम आगळ भेजती हैं। उनकी रसोई से कुछ भी बिना लेबल नहीं निकलता।',
      mr: 'शुभांगी बावीस वर्षं शाळेत शिकवत होत्या, आता तीन शहरांत कोकम आगळ पाठवतात. त्यांच्या स्वयंपाकघरातून काहीही लेबलशिवाय बाहेर जात नाही.',
    },
    crops: ['kokum', 'alphonso', 'pepper'], stayType: 'farm_cottage', scene: 'orchard',
    basePrice: 2600, maxGuests: 6, bedrooms: 2, bestMonths: [11, 12, 1, 2, 3, 4, 5],
    languages: ['mr', 'hi', 'en'], hostingSince: 2022, landAcres: 7, phone: '+91 99230 65540',
    lat: 16.0114, lng: 73.6885, featured: false,
    activities: ['kokum-syrup', 'spice-trail', 'kokan-thali', 'bird-walk', 'mango-grafting', 'night-stars'],
  },
  {
    slug: 'draksha-mala-ozar', regionSlug: 'nashik', district: 'Nashik',
    hostName: { en: 'Dattatray Gaikwad', hi: 'दत्तात्रय गायकवाड', mr: 'दत्तात्रय गायकवाड' },
    farmName: { en: 'Draksha Mala', hi: 'द्राक्ष माळ', mr: 'द्राक्ष मळा' },
    village: { en: 'Ozar', hi: 'ओझर', mr: 'ओझर' },
    title: {
      en: 'A working vineyard, and dinner served between the rows',
      hi: 'चलता हुआ अंगूर का बाग़, और क़तारों के बीच रात का खाना',
      mr: 'चालू द्राक्षमळा, आणि ओळींमध्ये वाढलेलं जेवण',
    },
    description: {
      en: 'Fourteen acres of Thompson and Sonaka, a raisin shed at the back, and a cottage that looks straight down a row. In January the whole farm smells of grape.',
      hi: 'थॉम्पसन और सोनाका के चौदह एकड़, पीछे किशमिश का शेड, और एक कुटिया जिससे सीधी क़तार दिखती है। जनवरी में पूरा खेत अंगूर की गंध से भर जाता है।',
      mr: 'थॉम्पसन आणि सोनाकाचे चौदा एकर, मागं बेदाण्याचं शेड, आणि सरळ ओळीकडे बघणारं घर. जानेवारीत सगळा मळा द्राक्षाचा वास घेतो.',
    },
    bio: {
      en: 'Dattatray exports to Europe and still prunes himself. Ask him about the 2019 rain and you will lose an evening, happily.',
      hi: 'दत्तात्रय यूरोप को निर्यात करते हैं और छँटाई आज भी ख़ुद करते हैं। 2019 की बारिश पूछिए, तो एक शाम ख़ुशी से चली जाएगी।',
      mr: 'दत्तात्रय युरोपला निर्यात करतात आणि छाटणी आजही स्वतः करतात. २०१९ चा पाऊस विचारा, एक संध्याकाळ आनंदानं जाईल.',
    },
    crops: ['grapes', 'onion'], stayType: 'farm_cottage', scene: 'vineyard',
    basePrice: 2700, maxGuests: 10, bedrooms: 3, bestMonths: [11, 12, 1, 2, 3],
    languages: ['mr', 'hi', 'en'], hostingSince: 2022, landAcres: 14, phone: '+91 98600 41277',
    lat: 20.0967, lng: 73.9280, featured: true,
    activities: ['grape-pruning', 'raisin-making', 'vineyard-dinner', 'onion-market', 'bullock-cart', 'night-stars'],
  },
  {
    slug: 'igatpuri-dhara-ghoti', regionSlug: 'nashik', district: 'Nashik',
    hostName: { en: 'Manisha Pawar', hi: 'मनीषा पवार', mr: 'मनीषा पवार' },
    farmName: { en: 'Igatpuri Dhara', hi: 'इगतपुरी धारा', mr: 'इगतपुरी धारा' },
    village: { en: 'Ghoti', hi: 'घोटी', mr: 'घोटी' },
    title: {
      en: 'Monsoon country: waterfalls, strawberries, and Kalsubai at dawn',
      hi: 'बरसात का इलाक़ा: झरने, स्ट्रॉबेरी, और भोर में कलसुबाई',
      mr: 'पावसाळी मुलूख: धबधबे, स्ट्रॉबेरी, आणि पहाटे कळसूबाई',
    },
    description: {
      en: 'Tents on a rice terrace at the foot of the Kalsubai range. July to September it rains without apology; December to March the strawberries come in. Both are worth it.',
      hi: 'कलसुबाई शृंखला के पैर पर धान की सीढ़ी पर तंबू। जुलाई से सितंबर बिना माफ़ी के बरसता है; दिसंबर से मार्च स्ट्रॉबेरी आती है। दोनों सही हैं।',
      mr: 'कळसूबाई रांगेच्या पायथ्याशी भातखाचरावर तंबू. जुलै ते सप्टेंबर माफी न मागता पाऊस; डिसेंबर ते मार्च स्ट्रॉबेरी. दोन्ही योग्य.',
    },
    bio: {
      en: 'Manisha and her brother run the farm and the treks. She has taken guests up Kalsubai forty-one times and counts.',
      hi: 'मनीषा और उनके भाई खेत और ट्रेक दोनों सँभालते हैं। वे इकतालीस बार मेहमानों को कलसुबाई ले जा चुकी हैं, और गिनती रखती हैं।',
      mr: 'मनीषा आणि त्यांचा भाऊ शेती आणि ट्रेक दोन्ही बघतात. त्यांनी एकेचाळीस वेळा पाहुण्यांना कळसूबाईवर नेलंय, आणि मोजणी ठेवलीय.',
    },
    crops: ['rice', 'strawberry'], stayType: 'orchard_tent', scene: 'hills',
    basePrice: 2300, maxGuests: 8, bedrooms: 3, bestMonths: [7, 8, 9, 12, 1, 2, 3],
    languages: ['mr', 'hi', 'en'], hostingSince: 2023, landAcres: 5, phone: '+91 90110 78432',
    lat: 19.7118, lng: 73.6285, featured: true,
    activities: ['kalsubai-climb', 'waterfall-walk', 'strawberry-pick', 'campfire', 'bhakri-making', 'night-stars'],
  },
  {
    slug: 'dalimb-bagh-rahuri', regionSlug: 'nashik', district: 'Ahilyanagar',
    hostName: { en: 'Balasaheb Shinde', hi: 'बालासाहेब शिंदे', mr: 'बाळासाहेब शिंदे' },
    farmName: { en: 'Dalimb Bagh', hi: 'अनार बाग़', mr: 'डाळिंब बाग' },
    village: { en: 'Rahuri', hi: 'राहुरी', mr: 'राहुरी' },
    title: {
      en: 'Pomegranate rows, and jaggery boiling at the crusher',
      hi: 'अनार की क़तारें, और गुऱ्हाळ में उबलता गुड़',
      mr: 'डाळिंबाच्या ओळी, आणि गुऱ्हाळात उकळणारा गूळ',
    },
    description: {
      en: 'Dry-country farming done well: drip everywhere, netting over the fruit, and a cottage that stays cool with nothing but a roof of country tiles.',
      hi: 'सूखे इलाक़े की सलीक़े वाली खेती: हर जगह ड्रिप, फलों पर जाली, और देसी खपरैल भर से ठंडी रहने वाली कुटिया।',
      mr: 'कोरडवाहू शेती नीट केलेली: सगळीकडे ठिबक, फळांवर जाळी, आणि नुसत्या देशी कौलांनी गार राहणारं घर.',
    },
    bio: {
      en: 'Balasaheb chairs the local farmer producer company and will explain the mandi rate to anyone who sits still.',
      hi: 'बालासाहेब स्थानीय किसान उत्पादक कंपनी के अध्यक्ष हैं और जो बैठ जाए उसे मंडी का भाव समझा देते हैं।',
      mr: 'बाळासाहेब इथल्या शेतकरी उत्पादक कंपनीचे अध्यक्ष आहेत आणि जो बसेल त्याला बाजारभाव समजावून सांगतात.',
    },
    crops: ['pomegranate', 'sugarcane', 'wheat'], stayType: 'farm_cottage', scene: 'orchard',
    basePrice: 2100, maxGuests: 8, bedrooms: 2, bestMonths: [10, 11, 12, 1, 2, 3],
    languages: ['mr', 'hi'], hostingSince: 2023, landAcres: 11, phone: '+91 94040 21908',
    lat: 19.3925, lng: 74.6480, featured: false,
    activities: ['pomegranate-harvest', 'gur-making', 'bullock-cart', 'bhakri-making', 'night-stars', 'folk-music'],
  },
  {
    slug: 'kelibaug-raver', regionSlug: 'nashik', district: 'Jalgaon',
    hostName: { en: 'Jayshri Patil', hi: 'जयश्री पाटील', mr: 'जयश्री पाटील' },
    farmName: { en: 'Kelibaug', hi: 'केलीबाग़', mr: 'केळीबाग' },
    village: { en: 'Raver', hi: 'रावेर', mr: 'रावेर' },
    title: {
      en: 'Banana country, cotton at the edge, and a kitchen that does not hold back',
      hi: 'केले का इलाक़ा, किनारे कपास, और बिना कंजूसी वाली रसोई',
      mr: 'केळीचा मुलूख, कडेला कापूस, आणि हात न आखडणारा स्वयंपाक',
    },
    description: {
      en: 'Raver sends bananas to the whole country. Stay in the old mud house at the edge of the plantation, eat Khandeshi food, and accept that the chilli is not negotiable.',
      hi: 'रावेर पूरे देश को केला भेजता है। बाग़ान के किनारे पुराने मिट्टी के घर में रुकिए, खानदेशी खाना खाइए, और मान लीजिए कि मिर्च पर मोल-भाव नहीं है।',
      mr: 'रावेर अख्ख्या देशाला केळी पाठवतं. बागेच्या कडेच्या जुन्या मातीच्या घरात राहा, खानदेशी जेवा, आणि तिखटावर घासाघीस चालत नाही हे मान्य करा.',
    },
    bio: {
      en: 'Jayshri took over eight acres after her husband’s death in 2019 and doubled what the land returns. She hosts to pay for her son’s college.',
      hi: '2019 में पति के जाने के बाद जयश्री ने आठ एकड़ सँभाले और उपज दोगुनी की। बेटे की पढ़ाई के लिए मेज़बानी करती हैं।',
      mr: '२०१९ मध्ये पतीच्या जाण्यानंतर जयश्रींनी आठ एकर हाती घेतले आणि उत्पन्न दुप्पट केलं. मुलाच्या शिक्षणासाठी त्या यजमानी करतात.',
    },
    crops: ['banana', 'cotton'], stayType: 'mud_house', scene: 'plateau',
    basePrice: 1800, maxGuests: 10, bedrooms: 3, bestMonths: [10, 11, 12, 1, 2],
    languages: ['mr', 'hi'], hostingSince: 2024, landAcres: 8, phone: '+91 88880 34617',
    lat: 21.2470, lng: 76.0330, featured: false,
    activities: ['banana-harvest', 'cotton-walk', 'khandeshi-kitchen', 'folk-music', 'bullock-cart', 'night-stars'],
  },
  {
    slug: 'satpuda-padar-toranmal', regionSlug: 'nashik', district: 'Nandurbar',
    hostName: { en: 'Kailas Gavit', hi: 'कैलास गावित', mr: 'कैलास गावित' },
    farmName: { en: 'Satpuda Padar', hi: 'सतपुड़ा पदर', mr: 'सातपुडा पदर' },
    village: { en: 'Toranmal', hi: 'तोरणमाळ', mr: 'तोरणमाळ' },
    title: {
      en: 'The far end of Maharashtra, at eleven hundred metres',
      hi: 'महाराष्ट्र का आख़िरी छोर, ग्यारह सौ मीटर पर',
      mr: 'महाराष्ट्राचं शेवटचं टोक, अकराशे मीटरवर',
    },
    description: {
      en: 'A Pawra family’s house on the Toranmal plateau, jowar and custard apple around it, and the Satpuda dropping away to the north. The furthest farm on the platform, and the quietest.',
      hi: 'तोरणमाळ पठार पर पावरा परिवार का घर, चारों ओर ज्वार और सीताफल, और उत्तर की ओर गिरता सतपुड़ा। मंच का सबसे दूर का और सबसे शांत खेत।',
      mr: 'तोरणमाळ पठारावर पावरा कुटुंबाचं घर, भोवती ज्वारी आणि सीताफळ, आणि उत्तरेला उतरणारा सातपुडा. साइटवरची सगळ्यात लांबची आणि सगळ्यात शांत वाडी.',
    },
    bio: {
      en: 'Kailas keeps bees, farms jowar, and guides in the forest. He speaks Pawri at home and Marathi with guests.',
      hi: 'कैलास मधुमक्खियाँ पालते हैं, ज्वार करते हैं, और जंगल में राह दिखाते हैं। घर में पावरी बोलते हैं, मेहमानों से मराठी।',
      mr: 'कैलास मधमाश्या पाळतात, ज्वारी करतात, आणि रानात वाट दाखवतात. घरात पावरी बोलतात, पाहुण्यांशी मराठी.',
    },
    crops: ['jowar', 'custardapple'], stayType: 'mud_house', scene: 'hills',
    basePrice: 1600, maxGuests: 6, bedrooms: 2, bestMonths: [8, 9, 10, 11, 12, 1, 2],
    languages: ['mr', 'hi'], hostingSince: 2024, landAcres: 4, phone: '+91 70570 19286',
    lat: 21.8790, lng: 74.4640, featured: false,
    activities: ['satpuda-walk', 'honey-gather', 'folk-music', 'forest-walk', 'campfire', 'night-stars'],
  },
  {
    slug: 'kanda-ghar-lasalgaon', regionSlug: 'nashik', district: 'Nashik',
    hostName: { en: 'Rekha Ahire', hi: 'रेखा अहिरे', mr: 'रेखा अहिरे' },
    farmName: { en: 'Kanda Ghar', hi: 'कांदा घर', mr: 'कांदा घर' },
    village: { en: 'Lasalgaon', hi: 'लासलगाँव', mr: 'लासलगाव' },
    title: {
      en: 'Onion, and the market that sets the country’s price',
      hi: 'प्याज़, और वह मंडी जो देश का भाव तय करती है',
      mr: 'कांदा, आणि देशाचा भाव ठरवणारा बाजार',
    },
    description: {
      en: 'A terrace room with the sky over it, on a farm ten minutes from the Lasalgaon mandi. Be at the auction by six in the morning and you will never look at an onion the same way.',
      hi: 'खुले आसमान वाला छत का कमरा, लासलगाँव मंडी से दस मिनट के खेत पर। सुबह छह बजे नीलामी में पहुँचिए, फिर प्याज़ पहले जैसा नहीं लगेगा।',
      mr: 'उघड्या आकाशाखालची गच्चीवरची खोली, लासलगाव बाजारापासून दहा मिनिटांवरच्या शेतात. सकाळी सहाला लिलावात पोहोचा, मग कांदा पूर्वीसारखा दिसणार नाही.',
    },
    bio: {
      en: 'Rekha grades and stores onion for eleven neighbouring families. She is on the platform because storage does not pay in a bad year, and rooms do.',
      hi: 'रेखा ग्यारह पड़ोसी परिवारों का प्याज़ छाँटती और भंडारित करती हैं। ख़राब साल में भंडारण नहीं चलता, कमरे चलते हैं — इसीलिए वे यहाँ हैं।',
      mr: 'रेखा अकरा शेजारच्या कुटुंबांचा कांदा प्रतवारी करून साठवतात. वाईट वर्षात साठवणूक परवडत नाही, खोल्या परवडतात — म्हणून त्या इथं आहेत.',
    },
    crops: ['onion', 'tomato', 'wheat'], stayType: 'terrace_room', scene: 'plateau',
    basePrice: 1950, maxGuests: 12, bedrooms: 4, bestMonths: [10, 11, 12, 1, 2, 3],
    languages: ['mr', 'hi'], hostingSince: 2023, landAcres: 10, phone: '+91 93710 55204',
    lat: 20.1447, lng: 74.2380, featured: false,
    activities: ['onion-market', 'bhakri-making', 'bullock-cart', 'night-stars', 'bird-walk', 'gur-making'],
  },
];

/* ─── curated two-day packages ──────────────────────────────────────────── */
/* An itinerary row either points at an activity (and inherits its name in three
   languages) or carries its own title — meals, arrival, the drive home. */

export const PACKAGES: PackageSeed[] = [
  {
    slug: 'kokan-mango-weekend', regionSlug: 'kokan', listingSlug: 'amrai-wadi-pawas',
    pricePerPerson: 2400, featured: true,
    title: {
      en: 'The mango weekend', hi: 'आम वाला सप्ताहांत', mr: 'आंब्याचा शनिवार-रविवार',
    },
    summary: {
      en: 'Two days in an Alphonso wadi: grafting in the morning, kokum syrup in the afternoon, the reef at low tide, and the sky when the lights go off.',
      hi: 'हापुस की वाड़ी में दो दिन: सुबह कलम, दोपहर कोकम शरबत, उतरते पानी में चट्टान, और बत्ती बुझने पर आसमान।',
      mr: 'हापूसच्या वाडीत दोन दिवस: सकाळी कलमं, दुपारी कोकम सरबत, ओहोटीतला खडक, आणि दिवे गेल्यावरचं आकाश.',
    },
    itinerary: [
      { day: 1, slot: 'morning', time: '10:30', title: { en: 'Arrive, tea on the veranda', hi: 'पहुँचना, ओसारी पर चाय', mr: 'पोहोचणं, ओसरीवर चहा' }, note: { en: 'The family meets you at the Pawas stand.', hi: 'परिवार पावस स्टैंड पर मिलता है।', mr: 'घरचे पावस स्टँडवर भेटतात.' } },
      { day: 1, slot: 'midday', time: '13:00', activity: 'kokan-thali' },
      { day: 1, slot: 'afternoon', time: '16:00', activity: 'kokum-syrup' },
      { day: 1, slot: 'evening', time: '18:15', activity: 'low-tide-walk' },
      { day: 1, slot: 'night', time: '21:30', activity: 'night-stars' },
      { day: 2, slot: 'morning', time: '06:30', activity: 'bird-walk' },
      { day: 2, slot: 'morning', time: '08:30', title: { en: 'Breakfast after the first round', hi: 'पहले चक्कर के बाद नाश्ता', mr: 'पहिल्या फेरीनंतर न्याहारी' }, note: { en: 'Poha, and tea you will think about later.', hi: 'पोहा, और वह चाय जो याद रहेगी।', mr: 'पोहे, आणि नंतर आठवत राहणारा चहा.' } },
      { day: 2, slot: 'midday', time: '10:30', activity: 'mango-grafting' },
      { day: 2, slot: 'afternoon', time: '13:30', title: { en: 'Last lunch, and goodbye', hi: 'आख़िरी खाना, और विदा', mr: 'शेवटचं जेवण, आणि निरोप' }, note: { en: 'You leave with whatever is in season.', hi: 'मौसम की उपज साथ जाती है।', mr: 'हंगामातलं काहीतरी सोबत जातं.' } },
    ],
  },
  {
    slug: 'kokan-creek-and-cashew', regionSlug: 'kokan', listingSlug: 'kaju-mala-achara',
    pricePerPerson: 2900, featured: true,
    title: { en: 'Creek, cashew and a fish curry', hi: 'खाड़ी, काजू और मछली करी', mr: 'खाडी, काजू आणि माशाचं कालवण' },
    summary: {
      en: 'Kayak the Achara backwater at first light, roast cashew after lunch, and learn a curry that takes twenty minutes and forty years.',
      hi: 'भोर में आचरा की खाड़ी में कयाक, दोपहर बाद काजू भूनना, और वह करी सीखना जिसमें बीस मिनट और चालीस साल लगते हैं।',
      mr: 'पहाटे आचऱ्याच्या खाडीत कयाक, दुपारनंतर काजू भाजणं, आणि वीस मिनिटं व चाळीस वर्षं लागणारं कालवण शिकणं.',
    },
    itinerary: [
      { day: 1, slot: 'morning', time: '11:00', title: { en: 'Arrive, cold kokum drink', hi: 'पहुँचना, ठंडा कोकम', mr: 'पोहोचणं, गार कोकम' } },
      { day: 1, slot: 'midday', time: '13:30', activity: 'fish-curry' },
      { day: 1, slot: 'afternoon', time: '16:30', activity: 'cashew-roast' },
      { day: 1, slot: 'evening', time: '18:00', activity: 'backwater-kayak' },
      { day: 1, slot: 'night', time: '22:00', activity: 'night-stars' },
      { day: 2, slot: 'morning', time: '06:00', activity: 'beach-sunrise' },
      { day: 2, slot: 'morning', time: '09:00', title: { en: 'Breakfast on the sand', hi: 'रेत पर नाश्ता', mr: 'वाळूवर न्याहारी' } },
      { day: 2, slot: 'midday', time: '11:00', activity: 'low-tide-walk' },
      { day: 2, slot: 'afternoon', time: '14:00', title: { en: 'Lunch, then the road home', hi: 'खाना, फिर घर की राह', mr: 'जेवण, मग परतीचा रस्ता' } },
    ],
  },
  {
    slug: 'nashik-vineyard-two-days', regionSlug: 'nashik', listingSlug: 'draksha-mala-ozar',
    pricePerPerson: 2700, featured: true,
    title: { en: 'Two days in a vineyard', hi: 'अंगूर के बाग़ में दो दिन', mr: 'द्राक्षमळ्यात दोन दिवस' },
    summary: {
      en: 'Prune a vine, watch raisins being made, eat dinner between the rows under lantern light, and stand in the Lasalgaon auction at six in the morning.',
      hi: 'एक बेल छाँटिए, किशमिश बनते देखिए, लालटेन की रोशनी में क़तारों के बीच खाइए, और सुबह छह बजे लासलगाँव की नीलामी में खड़े रहिए।',
      mr: 'एक वेल छाटा, बेदाणे होताना बघा, कंदिलाच्या उजेडात ओळींमध्ये जेवा, आणि सकाळी सहाला लासलगावच्या लिलावात उभे राहा.',
    },
    itinerary: [
      { day: 1, slot: 'morning', time: '11:00', title: { en: 'Arrive, walk the rows', hi: 'पहुँचना, क़तारों में चलना', mr: 'पोहोचणं, ओळींतून फेरी' } },
      { day: 1, slot: 'midday', time: '13:00', title: { en: 'Lunch under the shed', hi: 'शेड के नीचे खाना', mr: 'शेडखाली जेवण' } },
      { day: 1, slot: 'afternoon', time: '16:00', activity: 'raisin-making' },
      { day: 1, slot: 'evening', time: '18:30', activity: 'bullock-cart' },
      { day: 1, slot: 'night', time: '20:30', activity: 'vineyard-dinner' },
      { day: 2, slot: 'morning', time: '05:45', activity: 'onion-market' },
      { day: 2, slot: 'morning', time: '09:00', title: { en: 'Breakfast back at the farm', hi: 'खेत लौटकर नाश्ता', mr: 'मळ्यात परत येऊन न्याहारी' } },
      { day: 2, slot: 'midday', time: '10:30', activity: 'grape-pruning' },
      { day: 2, slot: 'afternoon', time: '13:30', title: { en: 'Lunch, and a box of grapes', hi: 'खाना, और अंगूर का एक डिब्बा', mr: 'जेवण, आणि द्राक्षांचा एक बॉक्स' } },
    ],
  },
  {
    slug: 'nashik-monsoon-climb', regionSlug: 'nashik', listingSlug: 'igatpuri-dhara-ghoti',
    pricePerPerson: 2300, featured: false,
    title: { en: 'Waterfalls and the Kalsubai dawn', hi: 'झरने और कलसुबाई की भोर', mr: 'धबधबे आणि कळसूबाईची पहाट' },
    summary: {
      en: 'Walk to the fall on the first afternoon, sleep early, and leave at five for the highest point in Maharashtra. Back down for bhakri by noon.',
      hi: 'पहली दोपहर झरने तक, जल्दी सोइए, और पाँच बजे महाराष्ट्र की सबसे ऊँची चोटी की ओर। दोपहर तक लौटकर भाकरी।',
      mr: 'पहिल्या दुपारी धबधब्यापर्यंत, लवकर झोपा, आणि पाचला महाराष्ट्राच्या सर्वोच्च टोकाकडे. दुपारपर्यंत परत येऊन भाकरी.',
    },
    itinerary: [
      { day: 1, slot: 'morning', time: '10:00', title: { en: 'Arrive, tents and tea', hi: 'पहुँचना, तंबू और चाय', mr: 'पोहोचणं, तंबू आणि चहा' } },
      { day: 1, slot: 'midday', time: '13:00', title: { en: 'Rice-plate lunch', hi: 'भात-थाली', mr: 'भाताचं ताट' } },
      { day: 1, slot: 'afternoon', time: '15:30', activity: 'waterfall-walk' },
      { day: 1, slot: 'evening', time: '18:30', activity: 'bhakri-making' },
      { day: 1, slot: 'night', time: '20:30', activity: 'campfire' },
      { day: 2, slot: 'morning', time: '05:00', activity: 'kalsubai-climb' },
      { day: 2, slot: 'midday', time: '11:30', title: { en: 'Late breakfast, everything hurts', hi: 'देर से नाश्ता, सब कुछ दुखता है', mr: 'उशिरा न्याहारी, सगळं दुखतंय' } },
      { day: 2, slot: 'afternoon', time: '14:00', activity: 'strawberry-pick' },
    ],
  },
];

/* ─── reviews ───────────────────────────────────────────────────────────── */
/* Each one is attached to a completed booking in the seed, because that is the
   only way a review can exist: the policy in 20260907090200_rls.sql will not
   accept one otherwise. */

export const REVIEWS: {
  listingSlug: string;
  guest: string;
  phone: string;
  rating: number;
  daysAgo: number;
  comment: I18nText;
}[] = [
  {
    listingSlug: 'amrai-wadi-pawas', guest: 'Aditi Ranade', phone: '+91 98201 44512', rating: 5, daysAgo: 24,
    comment: {
      en: 'I went to switch off and ended up tying grafts for two hours. Sunanda tai fed us like we were relatives. The room is simple and spotless.',
      hi: 'सोचा था बस बंद हो जाऊँगी, और दो घंटे कलम बाँधती रही। सुनंदा ताई ने रिश्तेदारों जैसा खिलाया। कमरा सादा और बिल्कुल साफ़।',
      mr: 'नुसतं शांत बसायला गेले होते, आणि दोन तास कलमं बांधत राहिले. सुनंदा ताईंनी नात्यातलं असल्यासारखं खाऊ घातलं. खोली साधी आणि लख्ख.',
    },
  },
  {
    listingSlug: 'amrai-wadi-pawas', guest: 'Faisal Shaikh', phone: '+91 99870 23310', rating: 5, daysAgo: 61,
    comment: {
      en: 'Took my parents. They have not stopped talking about the kokum. Sadanand kaka called twice before we left to check on the road.',
      hi: 'माता-पिता को ले गया। कोकम की बात अब तक कर रहे हैं। निकलने से पहले सदानंद काका ने दो बार रास्ते का हाल पूछा।',
      mr: 'आई-वडिलांना नेलं होतं. कोकमाबद्दल अजूनही बोलतायत. निघण्याआधी सदानंद काकांनी दोनदा फोन करून रस्त्याची चौकशी केली.',
    },
  },
  {
    listingSlug: 'kaju-mala-achara', guest: 'Neha Kulkarni', phone: '+91 88790 55102', rating: 5, daysAgo: 12,
    comment: {
      en: 'The kayak at six in the morning, alone on the creek, was the best hour of my year. Vaishali tai’s fish curry is not a demonstration, it is lunch.',
      hi: 'सुबह छह बजे खाड़ी में अकेले कयाक — साल का सबसे अच्छा घंटा। वैशाली ताई की मछली करी दिखावा नहीं, खाना है।',
      mr: 'सकाळी सहाला खाडीत एकटीनं कयाक — वर्षातला सगळ्यात चांगला तास. वैशाली ताईंचं कालवण प्रात्यक्षिक नाही, जेवण आहे.',
    },
  },
  {
    listingSlug: 'warli-angan-jawhar', guest: 'Rohit Deshmukh', phone: '+91 90040 71183', rating: 5, daysAgo: 38,
    comment: {
      en: 'No signal for two days and I did not notice until the drive back. My daughter painted half a wall. Sunita tai let her.',
      hi: 'दो दिन नेटवर्क नहीं था, और लौटते वक़्त तक पता ही नहीं चला। बेटी ने आधी दीवार रँग दी। सुनीता ताई ने रँगने दी।',
      mr: 'दोन दिवस रेंज नव्हती, आणि परतीच्या रस्त्यापर्यंत लक्षातही आलं नाही. मुलीनं अर्धी भिंत रंगवली. सुनीता ताईंनी रंगवू दिली.',
    },
  },
  {
    listingSlug: 'draksha-mala-ozar', guest: 'Sneha Joshi', phone: '+91 97640 90021', rating: 5, daysAgo: 8,
    comment: {
      en: 'Dinner between the vines is exactly as good as it sounds. Dattatray sir explained export grading for an hour and I was never bored.',
      hi: 'बेलों के बीच का खाना उतना ही अच्छा है जितना सुनने में लगता है। दत्तात्रय सर ने एक घंटा निर्यात ग्रेडिंग समझाई और ऊब नहीं हुई।',
      mr: 'वेलींमध्ये जेवण जितकं छान वाटतं तितकंच छान आहे. दत्तात्रय सरांनी तासभर निर्यात प्रतवारी समजावली आणि कंटाळा आलाच नाही.',
    },
  },
  {
    listingSlug: 'draksha-mala-ozar', guest: 'Imran Qureshi', phone: '+91 98220 61470', rating: 4, daysAgo: 45,
    comment: {
      en: 'Wonderful farm, but book the cottage and not the extra beds if you are four adults. The market trip at 5:45 is worth losing sleep for.',
      hi: 'बढ़िया खेत, पर चार बड़े हों तो कुटिया लीजिए, अतिरिक्त बिस्तर नहीं। 5:45 की मंडी के लिए नींद क़ुर्बान की जा सकती है।',
      mr: 'मळा छान, पण चार मोठी माणसं असतील तर घरच घ्या, जादा बिछाने नको. ५:४५ चा बाजार झोप सोडून बघण्यासारखा.',
    },
  },
  {
    listingSlug: 'igatpuri-dhara-ghoti', guest: 'Prachi Nikam', phone: '+91 91680 30752', rating: 5, daysAgo: 19,
    comment: {
      en: 'Manisha tai got four of us up Kalsubai and down again without a single scare. The tent stayed dry in serious rain.',
      hi: 'मनीषा ताई हम चारों को कलसुबाई चढ़ा-उतार लाईं, एक बार भी डर नहीं लगा। तेज़ बारिश में भी तंबू सूखा रहा।',
      mr: 'मनीषा ताईंनी आम्हा चौघांना कळसूबाई चढवून-उतरवून आणलं, एकदाही भीती वाटली नाही. जोरदार पावसातही तंबू कोरडा राहिला.',
    },
  },
  {
    listingSlug: 'satpuda-padar-toranmal', guest: 'Yogesh Bhamre', phone: '+91 70301 88264', rating: 5, daysAgo: 33,
    comment: {
      en: 'Eight hours from Pune and worth every one. The honey, the walk, and a night so quiet it was almost loud.',
      hi: 'पुणे से आठ घंटे, और हर घंटा सही। शहद, वह सैर, और इतनी शांत रात कि लगभग शोर लगे।',
      mr: 'पुण्याहून आठ तास, आणि प्रत्येक तास सार्थ. मध, ती भटकंती, आणि इतकी शांत रात्र की जवळजवळ आवाज वाटावा.',
    },
  },
];

/* District names, keyed by the value stored in listings.district — which is the
   English name, because it is also what an admin types when adding a vibhag.
   The display name comes from the region's own district list, so a Marathi
   reader is never shown "Pawas, Ratnagiri" with half of it in Latin. */
export const DISTRICT_NAMES: Record<string, I18nText> = Object.fromEntries(
  REGIONS.flatMap((region) => region.districts.map((district) => [district.en, district])),
);
