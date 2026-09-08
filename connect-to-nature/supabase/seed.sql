-- ============================================================================
-- Connect to Nature — seed data
--
-- GENERATED FILE. Do not edit by hand: change src/lib/seed-content.ts and run
--   node scripts/generate-seed.mjs
--
-- Applied automatically by `supabase db reset`, or by hand with
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Every statement is guarded, so running it twice adds nothing twice.
-- ============================================================================

-- ─── vibhags ────────────────────────────────────────────────────────────────
insert into public.regions (slug, name, tagline, description, districts, season, reach, hero_scene, accent, sort_order)
values ('kokan', '{"en":"Kokan Vibhag","hi":"कोंकण विभाग","mr":"कोकण विभाग"}'::jsonb, '{"en":"Salt air, laterite soil, and shade the whole way down","hi":"नमकीन हवा, जांभा मिट्टी, और नीचे तक छाँव","mr":"खारा वारा, जांभा माती, आणि खालपर्यंत सावली"}'::jsonb, '{"en":"The coastal strip between the Sahyadri and the sea. Mango, cashew and kokum on the slopes, paddy in the valleys, and a beach at the end of most lanes.","hi":"सह्याद्री और समुद्र के बीच की पट्टी। ढलानों पर आम, काजू और कोकम, घाटियों में धान, और ज़्यादातर गलियों के आख़िर में समुद्र।","mr":"सह्याद्री आणि समुद्रामधली पट्टी. उतारावर आंबा, काजू आणि कोकम, दऱ्यांत भात, आणि बहुतेक वाटांच्या टोकाला समुद्र."}'::jsonb,
        '[{"en":"Ratnagiri","hi":"रत्नागिरी","mr":"रत्नागिरी"},{"en":"Sindhudurg","hi":"सिंधुदुर्ग","mr":"सिंधुदुर्ग"},{"en":"Raigad","hi":"रायगड","mr":"रायगड"},{"en":"Palghar","hi":"पालघर","mr":"पालघर"}]'::jsonb, '{"en":"November – May","hi":"नवंबर – मई","mr":"नोव्हेंबर – मे"}'::jsonb, '{"en":"4–6 hours from Mumbai or Pune, by Konkan Railway or the coastal highway","hi":"मुंबई या पुणे से 4–6 घंटे, कोंकण रेलवे या तटीय महामार्ग से","mr":"मुंबई किंवा पुण्याहून ४–६ तास, कोकण रेल्वेने किंवा किनारी महामार्गाने"}'::jsonb,
        'coast', '#0f8a7e', 1)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  districts = excluded.districts, season = excluded.season, reach = excluded.reach,
  hero_scene = excluded.hero_scene, accent = excluded.accent, sort_order = excluded.sort_order;

insert into public.regions (slug, name, tagline, description, districts, season, reach, hero_scene, accent, sort_order)
values ('nashik', '{"en":"Nashik Vibhag","hi":"नाशिक विभाग","mr":"नाशिक विभाग"}'::jsonb, '{"en":"Black soil, vineyards, and the edge of the Sahyadri","hi":"काली मिट्टी, अंगूर के बाग़, और सह्याद्री का किनारा","mr":"काळी माती, द्राक्षमळे, आणि सह्याद्रीची कड"}'::jsonb, '{"en":"The plateau north-east of the ghats. Grapes and onion around Nashik, pomegranate towards Ahilyanagar, waterfalls at Igatpuri, and forest where the Satpuda begins.","hi":"घाटों के उत्तर-पूर्व का पठार। नाशिक के आसपास अंगूर और प्याज़, अहिल्यानगर की ओर अनार, इगतपुरी में झरने, और जहाँ सतपुड़ा शुरू होता है वहाँ जंगल।","mr":"घाटांच्या ईशान्येचं पठार. नाशिकभोवती द्राक्षं आणि कांदा, अहिल्यानगरकडे डाळिंब, इगतपुरीत धबधबे, आणि सातपुडा सुरू होतो तिथं रान."}'::jsonb,
        '[{"en":"Nashik","hi":"नाशिक","mr":"नाशिक"},{"en":"Ahilyanagar","hi":"अहिल्यानगर","mr":"अहिल्यानगर"},{"en":"Dhule","hi":"धुळे","mr":"धुळे"},{"en":"Nandurbar","hi":"नंदुरबार","mr":"नंदुरबार"},{"en":"Jalgaon","hi":"जलगाँव","mr":"जळगाव"}]'::jsonb, '{"en":"June – February","hi":"जून – फ़रवरी","mr":"जून – फेब्रुवारी"}'::jsonb, '{"en":"3–5 hours from Mumbai or Pune, by the Nashik highway or the Igatpuri line","hi":"मुंबई या पुणे से 3–5 घंटे, नाशिक महामार्ग या इगतपुरी लाइन से","mr":"मुंबई किंवा पुण्याहून ३–५ तास, नाशिक महामार्गाने किंवा इगतपुरी मार्गाने"}'::jsonb,
        'vineyard', '#7a5cc4', 2)
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  districts = excluded.districts, season = excluded.season, reach = excluded.reach,
  hero_scene = excluded.hero_scene, accent = excluded.accent, sort_order = excluded.sort_order;

-- ─── activities ─────────────────────────────────────────────────────────────
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('mango-grafting', '{"en":"Grafting mango, and a round of the orchard","hi":"आम की कलम, और बाग़ का चक्कर","mr":"आंब्याची कलमं, आणि बागेतली फेरी"}'::jsonb, '{"en":"Tie a graft yourself; the tree it becomes will outlive you.","hi":"ख़ुद एक कलम बाँधिए; वह पेड़ आपसे ज़्यादा जिएगा।","mr":"स्वतः एक कलम बांधा; ते झाड तुमच्यानंतरही राहील."}'::jsonb,
        'farming'::activity_category, 120, array['morning', 'afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('kokum-syrup', '{"en":"Making kokum syrup","hi":"कोकम शरबत बनाना","mr":"कोकम सरबत करणं"}'::jsonb, '{"en":"Rind, sugar, sun. You carry a bottle home.","hi":"छिलका, चीनी, धूप। एक बोतल साथ जाती है।","mr":"साल, साखर, ऊन. एक बाटली सोबत जाते."}'::jsonb,
        'craft'::activity_category, 90, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('kokan-thali', '{"en":"A Kokan thali, cooked with the family","hi":"परिवार के साथ कोंकणी थाली","mr":"घरच्यांसोबत कोकणी थाळी"}'::jsonb, '{"en":"Wood fire, coconut, kokum. Vegetarian on request, no fuss.","hi":"चूल्हा, नारियल, कोकम। कहने पर शाकाहारी, बिना हिचक।","mr":"चूल, नारळ, कोकम. सांगितलं तर शाकाहारी, विनातक्रार."}'::jsonb,
        'food'::activity_category, 120, array['midday', 'night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('low-tide-walk', '{"en":"The reef at low tide","hi":"उतरते पानी में चट्टान","mr":"ओहोटीतला खडक"}'::jsonb, '{"en":"Crabs, anemones, and whatever the sea left behind.","hi":"केकड़े, समुद्री फूल, और जो समुद्र छोड़ गया।","mr":"खेकडे, सागरफुलं, आणि समुद्रानं मागं ठेवलेलं."}'::jsonb,
        'water'::activity_category, 90, array['morning', 'evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('night-stars', '{"en":"Lying out for the stars","hi":"तारों के नीचे लेटना","mr":"चांदण्याखाली पडून राहणं"}'::jsonb, '{"en":"The lights go off at ten. Then you understand the point.","hi":"दस बजे बत्ती बंद। तब बात समझ आती है।","mr":"दहाला दिवे बंद. मग गोष्ट लक्षात येते."}'::jsonb,
        'stars'::activity_category, 60, array['night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('cashew-roast', '{"en":"Roasting and shelling cashew","hi":"काजू भूनना और छीलना","mr":"काजू भाजणं आणि सोलणं"}'::jsonb, '{"en":"Gloves on — the shell oil bites. Worth it for the first warm one.","hi":"दस्ताने पहनिए — छिलके का तेल जलाता है। पहला गरम काजू उसका मोल है।","mr":"हातमोजे घाला — सालीचं तेल चटका देतं. पहिल्या गरम काजूसाठी ते सोसवतं."}'::jsonb,
        'craft'::activity_category, 90, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('backwater-kayak', '{"en":"Kayaking the backwater","hi":"खाड़ी में कयाकिंग","mr":"खाडीत कयाकिंग"}'::jsonb, '{"en":"Flat water, mangrove on both sides, kingfishers.","hi":"शांत पानी, दोनों ओर कच्छ वन, किलकिले।","mr":"शांत पाणी, दोन्ही बाजूंना खारफुटी, खंड्या."}'::jsonb,
        'water'::activity_category, 120, array['morning', 'evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('fish-curry', '{"en":"Coastal fish curry, start to finish","hi":"तटीय मछली करी, शुरू से आख़िर","mr":"माशाचं कालवण, सुरुवातीपासून"}'::jsonb, '{"en":"From the morning catch. A vegetable version runs alongside.","hi":"सुबह की पकड़ से। साथ में सब्ज़ी वाला रूप भी बनता है।","mr":"सकाळच्या पाटीतून. सोबत भाजीचं कालवणही होतं."}'::jsonb,
        'food'::activity_category, 120, array['afternoon', 'night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('beach-sunrise', '{"en":"Sunrise on an empty beach","hi":"सुनसान समुद्र तट पर सूर्योदय","mr":"निर्जन किनाऱ्यावर सूर्योदय"}'::jsonb, '{"en":"Ten minutes on foot, and nobody else is up.","hi":"दस मिनट पैदल, और कोई जागा नहीं होता।","mr":"दहा मिनिटं चालत, आणि दुसरं कुणी उठलेलं नसतं."}'::jsonb,
        'water'::activity_category, 90, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('paddy-work', '{"en":"Paddy work, ankle deep","hi":"धान के खेत में काम","mr":"भातशेतीत काम"}'::jsonb, '{"en":"Transplanting in July, cutting in October. Both hurt the back.","hi":"जुलाई में रोपाई, अक्तूबर में कटाई। दोनों में कमर दुखती है।","mr":"जुलैत लावणी, ऑक्टोबरात कापणी. दोन्हींत कंबर दुखते."}'::jsonb,
        'farming'::activity_category, 120, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('river-swim', '{"en":"The river pool","hi":"नदी का कुंड","mr":"नदीचा डोह"}'::jsonb, '{"en":"Chest deep, cold, and the only clock is the light.","hi":"छाती तक, ठंडा, और घड़ी सिर्फ़ रोशनी है।","mr":"छातीइतकं, गार, आणि घड्याळ म्हणजे फक्त उजेड."}'::jsonb,
        'water'::activity_category, 90, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('bhakri-making', '{"en":"Bhakri on a wood fire","hi":"चूल्हे पर भाकरी","mr":"चुलीवर भाकरी"}'::jsonb, '{"en":"Yours will tear. Theirs will not. That is the lesson.","hi":"आपकी फटेगी। उनकी नहीं। सीख यही है।","mr":"तुमची फाटेल. त्यांची नाही. शिकवण तीच."}'::jsonb,
        'food'::activity_category, 60, array['evening', 'midday'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('waterfall-walk', '{"en":"Walking to the waterfall","hi":"झरने तक पैदल","mr":"धबधब्यापर्यंत चालणं"}'::jsonb, '{"en":"An hour up through the fields, longer coming back wet.","hi":"खेतों से एक घंटा ऊपर, भीगकर लौटने में ज़्यादा।","mr":"शेतांतून तासभर वर, भिजून परतायला जास्त."}'::jsonb,
        'trekking'::activity_category, 150, array['morning', 'afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('warli-painting', '{"en":"Warli painting on the wall","hi":"दीवार पर वारली चित्र","mr":"भिंतीवर वारली चित्र"}'::jsonb, '{"en":"Rice paste, a bamboo stick, and the grandmother correcting you.","hi":"चावल का घोल, बाँस की तीली, और दादी की टोक।","mr":"तांदळाचं पीठ, बांबूची काडी, आणि आजीची दुरुस्ती."}'::jsonb,
        'craft'::activity_category, 120, array['afternoon', 'evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('forest-walk', '{"en":"Forest walk with the family","hi":"परिवार के साथ जंगल की सैर","mr":"घरच्यांसोबत रानातली फेरी"}'::jsonb, '{"en":"They name every tree, and what each one is for.","hi":"हर पेड़ का नाम, और उसका काम भी बताते हैं।","mr":"प्रत्येक झाडाचं नाव, आणि त्याचा उपयोगही सांगतात."}'::jsonb,
        'trekking'::activity_category, 120, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('hilltop-sunset', '{"en":"Sunset from the hill above","hi":"ऊपर की पहाड़ी से सूर्यास्त","mr":"वरच्या टेकडीवरून सूर्यास्त"}'::jsonb, '{"en":"Twenty minutes up. Tea carried in a steel flask.","hi":"बीस मिनट की चढ़ाई। चाय स्टील की बोतल में साथ।","mr":"वीस मिनिटं चढण. चहा स्टीलच्या बाटलीत सोबत."}'::jsonb,
        'trekking'::activity_category, 90, array['evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('jackfruit-harvest', '{"en":"Bringing down jackfruit","hi":"कटहल उतारना","mr":"फणस उतरवणं"}'::jsonb, '{"en":"Oil your hands first, or the sap stays for a week.","hi":"पहले हाथों पर तेल, वरना चीप हफ़्ता भर रहती है।","mr":"आधी हाताला तेल, नाहीतर चीक आठवडाभर राहतो."}'::jsonb,
        'farming'::activity_category, 90, array['morning', 'afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('spice-trail', '{"en":"The pepper and spice rows","hi":"काली मिर्च और मसालों की क़तारें","mr":"मिरी आणि मसाल्याच्या ओळी"}'::jsonb, '{"en":"Pepper climbing the areca, cinnamon at the edge.","hi":"सुपारी पर चढ़ती काली मिर्च, किनारे दालचीनी।","mr":"सुपारीवर चढणारी मिरी, कडेला दालचिनी."}'::jsonb,
        'farming'::activity_category, 90, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('coconut-climb', '{"en":"Watching the tree climber work","hi":"नारियल पर चढ़ते देखना","mr":"माडावर चढणाऱ्याला बघणं"}'::jsonb, '{"en":"Sixty feet in ninety seconds, and one tender coconut each.","hi":"नब्बे सेकंड में साठ फुट, और हर एक को एक नारियल।","mr":"नव्वद सेकंदांत साठ फूट, आणि प्रत्येकाला एक शहाळं."}'::jsonb,
        'craft'::activity_category, 45, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('temple-walk', '{"en":"Evening at the village temple","hi":"गाँव के मंदिर में शाम","mr":"गावच्या देवळात संध्याकाळ"}'::jsonb, '{"en":"The bell, the lamp, and half the village on the steps.","hi":"घंटा, दीया, और सीढ़ियों पर आधा गाँव।","mr":"घंटा, दिवा, आणि पायऱ्यांवर अर्धं गाव."}'::jsonb,
        'culture'::activity_category, 60, array['evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('bird-walk', '{"en":"Birds before breakfast","hi":"नाश्ते से पहले पक्षी","mr":"न्याहारीआधी पक्षी"}'::jsonb, '{"en":"Bring nothing. The names come in Marathi first.","hi":"कुछ मत लाइए। नाम पहले मराठी में आते हैं।","mr":"काही आणू नका. नावं आधी मराठीत येतात."}'::jsonb,
        'trekking'::activity_category, 90, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('grape-pruning', '{"en":"Pruning and tying the vines","hi":"बेलों की छँटाई और बँधाई","mr":"वेलींची छाटणी आणि बांधणी"}'::jsonb, '{"en":"Every cut decides a bunch six months from now.","hi":"हर कटाई छह महीने बाद का गुच्छा तय करती है।","mr":"प्रत्येक छाटणी सहा महिन्यांनंतरचा घड ठरवते."}'::jsonb,
        'farming'::activity_category, 120, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('raisin-making', '{"en":"Turning grapes into raisins","hi":"अंगूर से किशमिश","mr":"द्राक्षांचे बेदाणे"}'::jsonb, '{"en":"The dipping, the racks, the eighteen days of waiting.","hi":"डुबाना, रैक, और अठारह दिन का इंतज़ार।","mr":"बुडवणं, रॅक, आणि अठरा दिवसांची वाट."}'::jsonb,
        'craft'::activity_category, 60, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('vineyard-dinner', '{"en":"Dinner between the vines","hi":"बेलों के बीच रात का खाना","mr":"वेलींमध्ये रात्रीचं जेवण"}'::jsonb, '{"en":"Lanterns on the wire, food off the same soil.","hi":"तार पर लालटेन, उसी मिट्टी का खाना।","mr":"तारेवर कंदील, त्याच मातीचं जेवण."}'::jsonb,
        'food'::activity_category, 120, array['night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('kalsubai-climb', '{"en":"Early climb towards Kalsubai","hi":"कलसुबाई की ओर सुबह की चढ़ाई","mr":"कळसूबाईकडे पहाटेची चढाई"}'::jsonb, '{"en":"Leave at five. The highest point in Maharashtra by nine.","hi":"पाँच बजे निकलिए। नौ बजे तक महाराष्ट्र का सबसे ऊँचा बिंदु।","mr":"पाचला निघा. नऊपर्यंत महाराष्ट्राचं सर्वोच्च टोक."}'::jsonb,
        'trekking'::activity_category, 300, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('strawberry-pick', '{"en":"Picking strawberries","hi":"स्ट्रॉबेरी तोड़ना","mr":"स्ट्रॉबेरी तोडणं"}'::jsonb, '{"en":"December to March, and the count never matches the basket.","hi":"दिसंबर से मार्च, और गिनती टोकरी से कभी नहीं मिलती।","mr":"डिसेंबर ते मार्च, आणि मोजणी कधीच टोपलीशी जुळत नाही."}'::jsonb,
        'farming'::activity_category, 90, array['morning', 'afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('campfire', '{"en":"Campfire and old songs","hi":"अलाव और पुराने गीत","mr":"शेकोटी आणि जुनी गाणी"}'::jsonb, '{"en":"Someone always has a dholki. It is never planned.","hi":"किसी के पास ढोलकी होती ही है। तय कभी नहीं होता।","mr":"कुणाकडे तरी ढोलकी असतेच. ठरवून कधीच होत नाही."}'::jsonb,
        'camping'::activity_category, 120, array['night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('pomegranate-harvest', '{"en":"Pomegranate picking and grading","hi":"अनार तोड़ना और छाँटना","mr":"डाळिंब तोडणं आणि प्रतवारी"}'::jsonb, '{"en":"Export grade, local grade, and the ones the family keeps.","hi":"निर्यात वाली, स्थानीय, और वे जो घर रखता है।","mr":"निर्यातीची, स्थानिक, आणि घरात ठेवायची."}'::jsonb,
        'farming'::activity_category, 120, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('gur-making', '{"en":"Jaggery at the crusher","hi":"गुड़ बनाना","mr":"गुऱ्हाळात गूळ"}'::jsonb, '{"en":"Four hours of boiling for one tray. Taste it warm.","hi":"एक थाल के लिए चार घंटे की उबाल। गरम चखिए।","mr":"एका थाळीसाठी चार तासांची उकळ. गरमच चाखा."}'::jsonb,
        'craft'::activity_category, 150, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('bullock-cart', '{"en":"Bullock cart to the far field","hi":"बैलगाड़ी से दूर के खेत तक","mr":"बैलगाडीनं लांबच्या शेतात"}'::jsonb, '{"en":"Slower than walking, and nobody minds.","hi":"पैदल से धीमी, और किसी को फ़र्क़ नहीं पड़ता।","mr":"चालण्यापेक्षा सावकाश, आणि कुणाला घाई नाही."}'::jsonb,
        'culture'::activity_category, 60, array['afternoon', 'evening'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('banana-harvest', '{"en":"Cutting a banana bunch","hi":"केले का घड़ काटना","mr":"केळीचा घड कापणं"}'::jsonb, '{"en":"Forty kilos on one shoulder. You will try once.","hi":"एक कंधे पर चालीस किलो। एक बार आज़माइएगा ज़रूर।","mr":"एका खांद्यावर चाळीस किलो. एकदा तरी प्रयत्न कराल."}'::jsonb,
        'farming'::activity_category, 90, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('khandeshi-kitchen', '{"en":"Khandeshi kitchen, chillies and all","hi":"खानदेशी रसोई, मिर्च समेत","mr":"खानदेशी स्वयंपाक, तिखटासह"}'::jsonb, '{"en":"Shev bhaji, wangyache bharit, and a warning you will ignore.","hi":"शेव भाजी, बैंगन का भरता, और एक चेतावनी जो आप अनसुनी करेंगे।","mr":"शेव भाजी, वांग्याचं भरीत, आणि तुम्ही न ऐकणारी सूचना."}'::jsonb,
        'food'::activity_category, 120, array['evening', 'night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('folk-music', '{"en":"Folk songs on the veranda","hi":"ओसारी पर लोकगीत","mr":"ओसरीवर लोकगीतं"}'::jsonb, '{"en":"Ovi and pawri, sung the way they are sung at work.","hi":"ओवी और पावरी, वैसे ही जैसे काम पर गाई जाती हैं।","mr":"ओवी आणि पावरी, कामावर गातात तशीच."}'::jsonb,
        'culture'::activity_category, 90, array['night'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('satpuda-walk', '{"en":"Into the Satpuda edge","hi":"सतपुड़ा के किनारे तक","mr":"सातपुड्याच्या कडेपर्यंत"}'::jsonb, '{"en":"Teak, mahua, and a view that drops into Madhya Pradesh.","hi":"सागौन, महुआ, और मध्य प्रदेश तक गिरता नज़ारा।","mr":"साग, मोह, आणि मध्य प्रदेशात उतरणारा नजारा."}'::jsonb,
        'trekking'::activity_category, 180, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('honey-gather', '{"en":"Watching the honey come out","hi":"शहद निकलते देखना","mr":"मध काढताना बघणं"}'::jsonb, '{"en":"Smoke, patience, and a jar that tastes of mahua.","hi":"धुआँ, धीरज, और महुए के स्वाद वाला जार।","mr":"धूर, संयम, आणि मोहाची चव असलेली बरणी."}'::jsonb,
        'craft'::activity_category, 90, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('onion-market', '{"en":"Dawn at the onion market","hi":"सुबह प्याज़ मंडी","mr":"पहाटे कांदा बाजार"}'::jsonb, '{"en":"Lasalgaon sets the price of onion for the country. Watch it happen.","hi":"लासलगाँव देश में प्याज़ का भाव तय करता है। होते देखिए।","mr":"लासलगाव देशाचा कांदाभाव ठरवतं. ते होताना बघा."}'::jsonb,
        'culture'::activity_category, 120, array['morning'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;
insert into public.activities (slug, name, description, category, duration_minutes, slots)
values ('cotton-walk', '{"en":"Picking cotton, one row","hi":"एक क़तार कपास चुनना","mr":"एक ओळ कापूस वेचणं"}'::jsonb, '{"en":"A kilo takes an hour. The rate for it takes a minute to explain.","hi":"एक किलो में एक घंटा। उसका भाव समझाने में एक मिनट।","mr":"एक किलोला तासभर. त्याचा भाव सांगायला एक मिनिट."}'::jsonb,
        'farming'::activity_category, 90, array['afternoon'])
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, category = excluded.category,
  duration_minutes = excluded.duration_minutes, slots = excluded.slots;

-- ─── farms: host profile, listing, activities, and an open calendar ─────────
do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'amrai-wadi-pawas') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Amrai Wadi","hi":"आम्रा वाड़ी","mr":"आम्रा वाडी"}'::jsonb, '{"en":"Sadanand Sawant","hi":"सदानंद सावंत","mr":"सदानंद सावंत"}'::jsonb, '{"en":"Sadanand has worked this wadi since 1989 and grafts for half the village. His wife Sunanda cooks; their son handles the phone and the booking.","hi":"1989 से सदानंद इसी वाड़ी में हैं और आधे गाँव की कलम बाँधते हैं। पत्नी सुनंदा रसोई सँभालती हैं; बेटा फ़ोन और बुकिंग।","mr":"सदानंद १९८९ पासून ह्याच वाडीत आहेत आणि अर्ध्या गावाची कलमं बांधतात. पत्नी सुनंदा स्वयंपाक बघतात; मुलगा फोन आणि बुकिंग."}'::jsonb, v_region,
    'Ratnagiri', '{"en":"Pawas","hi":"पावस","mr":"पावस"}'::jsonb, '+91 98230 11045', 6,
    array['mr', 'hi'], 'approved', now(), 2023
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'amrai-wadi-pawas', '{"en":"Two days in an Alphonso wadi above Pawas","hi":"पावस के ऊपर हापुस की वाड़ी में दो दिन","mr":"पावसच्या वर हापूसच्या वाडीत दोन दिवस"}'::jsonb, '{"en":"Four hundred mango trees on a laterite slope, kokum along the boundary, and the sea eleven kilometres down the road. You get the room at the end of the house, its own door, and a veranda that faces the trees.","hi":"जांभा ढलान पर चार सौ आम के पेड़, सीमा पर कोकम, और ग्यारह किलोमीटर नीचे समुद्र। घर के आख़िर वाला कमरा आपका — अपना दरवाज़ा, और पेड़ों की ओर खुलती ओसारी।","mr":"जांभ्या उतारावर चारशे आंब्याची झाडं, बांधावर कोकम, आणि अकरा किलोमीटरवर समुद्र. घराच्या टोकाची खोली तुमची — स्वतःचा दरवाजा, आणि झाडांकडे तोंड असलेली ओसरी."}'::jsonb, v_region,
    'Ratnagiri', '{"en":"Pawas","hi":"पावस","mr":"पावस"}'::jsonb, 'wadi_room', 'orchard',
    array['alphonso', 'kokum', 'coconut'], 2400, 8, 2,
    array[11, 12, 1, 2, 3, 4, 5]::integer[], 16.9331, 73.3255, 'published', 0,
    0, true, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['mango-grafting', 'kokum-syrup', 'kokan-thali', 'low-tide-walk', 'night-stars', 'bird-walk']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'kaju-mala-achara') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Kaju Mala","hi":"काजू माळ","mr":"काजू माळ"}'::jsonb, '{"en":"Vaishali Parab","hi":"वैशाली पराब","mr":"वैशाली पराब"}'::jsonb, '{"en":"Vaishali runs the farm and a self-help group of nineteen women who process the cashew. She was the first host in Sindhudurg to finish onboarding.","hi":"वैशाली खेत भी सँभालती हैं और उन्नीस महिलाओं का बचत गट भी, जो काजू तैयार करता है। सिंधुदुर्ग में जुड़ाव पूरा करने वाली वे पहली मेज़बान हैं।","mr":"वैशाली शेतीही बघतात आणि काजू तयार करणारा एकोणीस बायकांचा बचत गटही. सिंधुदुर्गात नोंदणी पूर्ण करणाऱ्या त्या पहिल्या यजमान."}'::jsonb, v_region,
    'Sindhudurg', '{"en":"Achara","hi":"आचरा","mr":"आचरा"}'::jsonb, '+91 94220 33871', 9,
    array['mr', 'hi', 'en'], 'approved', now(), 2022
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'kaju-mala-achara', '{"en":"A cashew slope, and the creek at the bottom of it","hi":"काजू की ढलान, और उसके नीचे की खाड़ी","mr":"काजूचा माळ, आणि त्याखालची खाडी"}'::jsonb, '{"en":"A separate cottage under the cashew, ten minutes from Achara beach and five from the creek where the kayaks are kept. Roasting happens in February and March; the rest of the year the slope is just quiet.","hi":"काजू के नीचे अलग कुटिया, आचरा समुद्र तट से दस मिनट और उस खाड़ी से पाँच जहाँ कयाक रखे हैं। भूनना फ़रवरी-मार्च में; बाक़ी साल ढलान बस शांत रहती है।","mr":"काजूखाली स्वतंत्र घर, आचरा किनाऱ्यापासून दहा मिनिटं आणि कयाक ठेवलेल्या खाडीपासून पाच. भाजणी फेब्रुवारी-मार्चमध्ये; बाकी वर्षभर माळ नुसताच शांत."}'::jsonb, v_region,
    'Sindhudurg', '{"en":"Achara","hi":"आचरा","mr":"आचरा"}'::jsonb, 'farm_cottage', 'coast',
    array['cashew', 'coconut', 'betelnut'], 2900, 10, 3,
    array[10, 11, 12, 1, 2, 3, 4]::integer[], 16.1793, 73.4402, 'published', 0,
    0, true, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['cashew-roast', 'backwater-kayak', 'fish-curry', 'beach-sunrise', 'low-tide-walk', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'bhat-shet-roha') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Bhat Shet","hi":"भात शेत","mr":"भात शेत"}'::jsonb, '{"en":"Ramesh Mhatre","hi":"रमेश म्हात्रे","mr":"रमेश म्हात्रे"}'::jsonb, '{"en":"Ramesh farms four acres of paddy and drives a school van in the dry months. He asks guests to work one hour in the field, and does not charge for it.","hi":"रमेश चार एकड़ धान करते हैं और सूखे महीनों में स्कूल वैन चलाते हैं। वे मेहमानों से खेत में एक घंटा काम माँगते हैं, और उसका पैसा नहीं लेते।","mr":"रमेश चार एकर भात करतात आणि कोरड्या महिन्यांत स्कूल व्हॅन चालवतात. पाहुण्यांकडून शेतात एक तास काम मागतात, आणि त्याचे पैसे घेत नाहीत."}'::jsonb, v_region,
    'Raigad', '{"en":"Roha","hi":"रोहा","mr":"रोहा"}'::jsonb, '+91 90280 44219', 4,
    array['mr', 'hi'], 'approved', now(), 2024
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'bhat-shet-roha', '{"en":"Paddy, a river pool, and a house made of mud","hi":"धान, नदी का कुंड, और मिट्टी का घर","mr":"भात, नदीचा डोह, आणि मातीचं घर"}'::jsonb, '{"en":"The cheapest stay on the platform and the one people write the longest reviews about. Two rooms in a mud-and-cowdung house that stays cool at two in the afternoon, and the Kundalika ten minutes away on foot.","hi":"मंच पर सबसे सस्ता ठिकाना, और सबसे लंबी समीक्षाएँ इसी की आती हैं। मिट्टी-गोबर के घर में दो कमरे, जो दोपहर दो बजे भी ठंडे रहते हैं, और दस मिनट पैदल पर कुंडलिका।","mr":"साइटवरचा सगळ्यात स्वस्त मुक्काम, आणि सगळ्यात लांब अभिप्राय ह्याच्याच येतात. मातीच्या-शेणाच्या घरात दोन खोल्या, दुपारी दोनलाही गार, आणि दहा मिनिटांवर कुंडलिका."}'::jsonb, v_region,
    'Raigad', '{"en":"Roha","hi":"रोहा","mr":"रोहा"}'::jsonb, 'mud_house', 'river',
    array['rice', 'betelnut'], 1900, 6, 2,
    array[7, 8, 9, 10, 11, 12, 1]::integer[], 18.4386, 73.1198, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['paddy-work', 'river-swim', 'bhakri-making', 'waterfall-walk', 'bullock-cart', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'warli-angan-jawhar') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Warli Angan","hi":"वारली आँगन","mr":"वारली अंगण"}'::jsonb, '{"en":"Sunita Bhoir","hi":"सुनीता भोईर","mr":"सुनीता भोईर"}'::jsonb, '{"en":"Sunita paints Warli for a living and farms nachni for the house. Her daughter is doing a diploma in Nashik and translates on calls.","hi":"सुनीता वारली चित्र से कमाती हैं और घर के लिए नाचनी उगाती हैं। बेटी नाशिक में डिप्लोमा कर रही है और फ़ोन पर अनुवाद करती है।","mr":"सुनीता वारली चित्रांतून कमावतात आणि घरासाठी नाचणी करतात. मुलगी नाशिकला डिप्लोमा करते आणि फोनवर भाषांतर करते."}'::jsonb, v_region,
    'Palghar', '{"en":"Jawhar","hi":"जव्हार","mr":"जव्हार"}'::jsonb, '+91 89999 20714', 3,
    array['mr', 'hi'], 'approved', now(), 2023
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'warli-angan-jawhar', '{"en":"Warli country: nachni, a painted wall, and no phone signal","hi":"वारली इलाक़ा: नाचनी, चित्रित दीवार, और नेटवर्क नहीं","mr":"वारली मुलूख: नाचणी, चित्रं काढलेली भिंत, आणि रेंज नाही"}'::jsonb, '{"en":"Eight hundred metres up, where Jawhar gets cold in December. The front wall of the house is repainted every year, and you will be handed a bamboo stick and asked to add something.","hi":"आठ सौ मीटर ऊपर, जहाँ दिसंबर में जव्हार ठंडा हो जाता है। घर की अगली दीवार हर साल फिर से रँगती है, और आपको बाँस की तीली देकर कुछ जोड़ने को कहा जाएगा।","mr":"आठशे मीटर उंचीवर, जिथं डिसेंबरात जव्हार गार होतं. घराची पुढची भिंत दरवर्षी नव्यानं रंगते, आणि तुमच्या हातात बांबूची काडी देऊन काहीतरी काढायला सांगतील."}'::jsonb, v_region,
    'Palghar', '{"en":"Jawhar","hi":"जव्हार","mr":"जव्हार"}'::jsonb, 'mud_house', 'hills',
    array['rice', 'nachni'], 1700, 8, 2,
    array[8, 9, 10, 11, 12, 1, 2]::integer[], 19.9117, 73.227, 'published', 0,
    0, true, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['warli-painting', 'forest-walk', 'hilltop-sunset', 'bhakri-making', 'folk-music', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'supari-bagayat-guhagar') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Supari Bagayat","hi":"सुपारी बग़ीचा","mr":"सुपारी बागायत"}'::jsonb, '{"en":"Anil Gurav","hi":"अनिल गुरव","mr":"अनिल गुरव"}'::jsonb, '{"en":"Anil left a hotel job in Ratnagiri to take over his father’s bagayat. He is the one who will make you climb down to the beach for sunrise.","hi":"अनिल ने रत्नागिरी की होटल नौकरी छोड़कर पिता की बग़ीची सँभाली। सूर्योदय के लिए आपको समुद्र तक उतारने वाले वही हैं।","mr":"अनिलनं रत्नागिरीतली हॉटेलची नोकरी सोडून वडिलांची बागायत हाती घेतली. सूर्योदयासाठी तुम्हाला किनाऱ्यावर उतरवणारे तेच."}'::jsonb, v_region,
    'Ratnagiri', '{"en":"Guhagar","hi":"गुहागर","mr":"गुहागर"}'::jsonb, '+91 97650 88123', 5,
    array['mr', 'hi', 'en'], 'approved', now(), 2024
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'supari-bagayat-guhagar', '{"en":"Tents under the areca, two lanes from Guhagar beach","hi":"सुपारी के नीचे तंबू, गुहागर तट से दो गली दूर","mr":"सुपारीखाली तंबू, गुहागर किनाऱ्यापासून दोन गल्ल्या"}'::jsonb, '{"en":"Twelve people fit here, which is why cousins book it. Canvas tents on wooden platforms between the areca rows, proper bathrooms at the end, and the beach at walking distance.","hi":"यहाँ बारह लोग समाते हैं, इसीलिए भाई-बहन मिलकर बुक करते हैं। सुपारी की क़तारों के बीच लकड़ी के चबूतरों पर तंबू, आख़िर में ढंग के स्नानघर, और पैदल दूरी पर समुद्र।","mr":"इथं बारा माणसं मावतात, म्हणून भावंडं मिळून बुक करतात. सुपारीच्या ओळींमध्ये लाकडी चौथऱ्यांवर तंबू, टोकाला नीट स्नानगृहं, आणि चालत जाण्याइतक्या अंतरावर समुद्र."}'::jsonb, v_region,
    'Ratnagiri', '{"en":"Guhagar","hi":"गुहागर","mr":"गुहागर"}'::jsonb, 'orchard_tent', 'coast',
    array['betelnut', 'coconut', 'jackfruit'], 2200, 12, 4,
    array[10, 11, 12, 1, 2, 3]::integer[], 17.4805, 73.1935, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['coconut-climb', 'jackfruit-harvest', 'beach-sunrise', 'temple-walk', 'kokan-thali', 'campfire']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'kokam-aali-kudal') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'kokan';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Kokam Aali","hi":"कोकम आळी","mr":"कोकम आळी"}'::jsonb, '{"en":"Shubhangi Naik","hi":"शुभांगी नाईक","mr":"शुभांगी नाईक"}'::jsonb, '{"en":"Shubhangi taught school for twenty-two years and now sells kokum agal to three cities. Nothing leaves her kitchen unlabelled.","hi":"शुभांगी बाईस साल स्कूल में पढ़ाती रहीं, अब तीन शहरों में कोकम आगळ भेजती हैं। उनकी रसोई से कुछ भी बिना लेबल नहीं निकलता।","mr":"शुभांगी बावीस वर्षं शाळेत शिकवत होत्या, आता तीन शहरांत कोकम आगळ पाठवतात. त्यांच्या स्वयंपाकघरातून काहीही लेबलशिवाय बाहेर जात नाही."}'::jsonb, v_region,
    'Sindhudurg', '{"en":"Kudal","hi":"कुडाळ","mr":"कुडाळ"}'::jsonb, '+91 99230 65540', 7,
    array['mr', 'hi', 'en'], 'approved', now(), 2022
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'kokam-aali-kudal', '{"en":"Kokum, pepper, and a kitchen worth the drive","hi":"कोकम, काली मिर्च, और उस रसोई के लिए इतना सफ़र सही","mr":"कोकम, मिरी, आणि एवढा प्रवास करावा असा स्वयंपाक"}'::jsonb, '{"en":"A small cottage for six, deliberately kept small. Pepper climbs the areca, kokum dries in the yard from April, and every meal here starts with sol kadhi.","hi":"छह लोगों की छोटी कुटिया, जान-बूझकर छोटी रखी गई। सुपारी पर काली मिर्च चढ़ती है, अप्रैल से आँगन में कोकम सूखता है, और हर खाना सोल कढ़ी से शुरू होता है।","mr":"सहा जणांचं छोटं घर, मुद्दाम छोटं ठेवलेलं. सुपारीवर मिरी चढते, एप्रिलपासून अंगणात कोकम वाळतं, आणि इथलं प्रत्येक जेवण सोलकढीनं सुरू होतं."}'::jsonb, v_region,
    'Sindhudurg', '{"en":"Kudal","hi":"कुडाळ","mr":"कुडाळ"}'::jsonb, 'farm_cottage', 'orchard',
    array['kokum', 'alphonso', 'pepper'], 2600, 6, 2,
    array[11, 12, 1, 2, 3, 4, 5]::integer[], 16.0114, 73.6885, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['kokum-syrup', 'spice-trail', 'kokan-thali', 'bird-walk', 'mango-grafting', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'draksha-mala-ozar') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Draksha Mala","hi":"द्राक्ष माळ","mr":"द्राक्ष मळा"}'::jsonb, '{"en":"Dattatray Gaikwad","hi":"दत्तात्रय गायकवाड","mr":"दत्तात्रय गायकवाड"}'::jsonb, '{"en":"Dattatray exports to Europe and still prunes himself. Ask him about the 2019 rain and you will lose an evening, happily.","hi":"दत्तात्रय यूरोप को निर्यात करते हैं और छँटाई आज भी ख़ुद करते हैं। 2019 की बारिश पूछिए, तो एक शाम ख़ुशी से चली जाएगी।","mr":"दत्तात्रय युरोपला निर्यात करतात आणि छाटणी आजही स्वतः करतात. २०१९ चा पाऊस विचारा, एक संध्याकाळ आनंदानं जाईल."}'::jsonb, v_region,
    'Nashik', '{"en":"Ozar","hi":"ओझर","mr":"ओझर"}'::jsonb, '+91 98600 41277', 14,
    array['mr', 'hi', 'en'], 'approved', now(), 2022
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'draksha-mala-ozar', '{"en":"A working vineyard, and dinner served between the rows","hi":"चलता हुआ अंगूर का बाग़, और क़तारों के बीच रात का खाना","mr":"चालू द्राक्षमळा, आणि ओळींमध्ये वाढलेलं जेवण"}'::jsonb, '{"en":"Fourteen acres of Thompson and Sonaka, a raisin shed at the back, and a cottage that looks straight down a row. In January the whole farm smells of grape.","hi":"थॉम्पसन और सोनाका के चौदह एकड़, पीछे किशमिश का शेड, और एक कुटिया जिससे सीधी क़तार दिखती है। जनवरी में पूरा खेत अंगूर की गंध से भर जाता है।","mr":"थॉम्पसन आणि सोनाकाचे चौदा एकर, मागं बेदाण्याचं शेड, आणि सरळ ओळीकडे बघणारं घर. जानेवारीत सगळा मळा द्राक्षाचा वास घेतो."}'::jsonb, v_region,
    'Nashik', '{"en":"Ozar","hi":"ओझर","mr":"ओझर"}'::jsonb, 'farm_cottage', 'vineyard',
    array['grapes', 'onion'], 2700, 10, 3,
    array[11, 12, 1, 2, 3]::integer[], 20.0967, 73.928, 'published', 0,
    0, true, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['grape-pruning', 'raisin-making', 'vineyard-dinner', 'onion-market', 'bullock-cart', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'igatpuri-dhara-ghoti') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Igatpuri Dhara","hi":"इगतपुरी धारा","mr":"इगतपुरी धारा"}'::jsonb, '{"en":"Manisha Pawar","hi":"मनीषा पवार","mr":"मनीषा पवार"}'::jsonb, '{"en":"Manisha and her brother run the farm and the treks. She has taken guests up Kalsubai forty-one times and counts.","hi":"मनीषा और उनके भाई खेत और ट्रेक दोनों सँभालते हैं। वे इकतालीस बार मेहमानों को कलसुबाई ले जा चुकी हैं, और गिनती रखती हैं।","mr":"मनीषा आणि त्यांचा भाऊ शेती आणि ट्रेक दोन्ही बघतात. त्यांनी एकेचाळीस वेळा पाहुण्यांना कळसूबाईवर नेलंय, आणि मोजणी ठेवलीय."}'::jsonb, v_region,
    'Nashik', '{"en":"Ghoti","hi":"घोटी","mr":"घोटी"}'::jsonb, '+91 90110 78432', 5,
    array['mr', 'hi', 'en'], 'approved', now(), 2023
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'igatpuri-dhara-ghoti', '{"en":"Monsoon country: waterfalls, strawberries, and Kalsubai at dawn","hi":"बरसात का इलाक़ा: झरने, स्ट्रॉबेरी, और भोर में कलसुबाई","mr":"पावसाळी मुलूख: धबधबे, स्ट्रॉबेरी, आणि पहाटे कळसूबाई"}'::jsonb, '{"en":"Tents on a rice terrace at the foot of the Kalsubai range. July to September it rains without apology; December to March the strawberries come in. Both are worth it.","hi":"कलसुबाई शृंखला के पैर पर धान की सीढ़ी पर तंबू। जुलाई से सितंबर बिना माफ़ी के बरसता है; दिसंबर से मार्च स्ट्रॉबेरी आती है। दोनों सही हैं।","mr":"कळसूबाई रांगेच्या पायथ्याशी भातखाचरावर तंबू. जुलै ते सप्टेंबर माफी न मागता पाऊस; डिसेंबर ते मार्च स्ट्रॉबेरी. दोन्ही योग्य."}'::jsonb, v_region,
    'Nashik', '{"en":"Ghoti","hi":"घोटी","mr":"घोटी"}'::jsonb, 'orchard_tent', 'hills',
    array['rice', 'strawberry'], 2300, 8, 3,
    array[7, 8, 9, 12, 1, 2, 3]::integer[], 19.7118, 73.6285, 'published', 0,
    0, true, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['kalsubai-climb', 'waterfall-walk', 'strawberry-pick', 'campfire', 'bhakri-making', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'dalimb-bagh-rahuri') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Dalimb Bagh","hi":"अनार बाग़","mr":"डाळिंब बाग"}'::jsonb, '{"en":"Balasaheb Shinde","hi":"बालासाहेब शिंदे","mr":"बाळासाहेब शिंदे"}'::jsonb, '{"en":"Balasaheb chairs the local farmer producer company and will explain the mandi rate to anyone who sits still.","hi":"बालासाहेब स्थानीय किसान उत्पादक कंपनी के अध्यक्ष हैं और जो बैठ जाए उसे मंडी का भाव समझा देते हैं।","mr":"बाळासाहेब इथल्या शेतकरी उत्पादक कंपनीचे अध्यक्ष आहेत आणि जो बसेल त्याला बाजारभाव समजावून सांगतात."}'::jsonb, v_region,
    'Ahilyanagar', '{"en":"Rahuri","hi":"राहुरी","mr":"राहुरी"}'::jsonb, '+91 94040 21908', 11,
    array['mr', 'hi'], 'approved', now(), 2023
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'dalimb-bagh-rahuri', '{"en":"Pomegranate rows, and jaggery boiling at the crusher","hi":"अनार की क़तारें, और गुऱ्हाळ में उबलता गुड़","mr":"डाळिंबाच्या ओळी, आणि गुऱ्हाळात उकळणारा गूळ"}'::jsonb, '{"en":"Dry-country farming done well: drip everywhere, netting over the fruit, and a cottage that stays cool with nothing but a roof of country tiles.","hi":"सूखे इलाक़े की सलीक़े वाली खेती: हर जगह ड्रिप, फलों पर जाली, और देसी खपरैल भर से ठंडी रहने वाली कुटिया।","mr":"कोरडवाहू शेती नीट केलेली: सगळीकडे ठिबक, फळांवर जाळी, आणि नुसत्या देशी कौलांनी गार राहणारं घर."}'::jsonb, v_region,
    'Ahilyanagar', '{"en":"Rahuri","hi":"राहुरी","mr":"राहुरी"}'::jsonb, 'farm_cottage', 'orchard',
    array['pomegranate', 'sugarcane', 'wheat'], 2100, 8, 2,
    array[10, 11, 12, 1, 2, 3]::integer[], 19.3925, 74.648, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['pomegranate-harvest', 'gur-making', 'bullock-cart', 'bhakri-making', 'night-stars', 'folk-music']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'kelibaug-raver') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Kelibaug","hi":"केलीबाग़","mr":"केळीबाग"}'::jsonb, '{"en":"Jayshri Patil","hi":"जयश्री पाटील","mr":"जयश्री पाटील"}'::jsonb, '{"en":"Jayshri took over eight acres after her husband’s death in 2019 and doubled what the land returns. She hosts to pay for her son’s college.","hi":"2019 में पति के जाने के बाद जयश्री ने आठ एकड़ सँभाले और उपज दोगुनी की। बेटे की पढ़ाई के लिए मेज़बानी करती हैं।","mr":"२०१९ मध्ये पतीच्या जाण्यानंतर जयश्रींनी आठ एकर हाती घेतले आणि उत्पन्न दुप्पट केलं. मुलाच्या शिक्षणासाठी त्या यजमानी करतात."}'::jsonb, v_region,
    'Jalgaon', '{"en":"Raver","hi":"रावेर","mr":"रावेर"}'::jsonb, '+91 88880 34617', 8,
    array['mr', 'hi'], 'approved', now(), 2024
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'kelibaug-raver', '{"en":"Banana country, cotton at the edge, and a kitchen that does not hold back","hi":"केले का इलाक़ा, किनारे कपास, और बिना कंजूसी वाली रसोई","mr":"केळीचा मुलूख, कडेला कापूस, आणि हात न आखडणारा स्वयंपाक"}'::jsonb, '{"en":"Raver sends bananas to the whole country. Stay in the old mud house at the edge of the plantation, eat Khandeshi food, and accept that the chilli is not negotiable.","hi":"रावेर पूरे देश को केला भेजता है। बाग़ान के किनारे पुराने मिट्टी के घर में रुकिए, खानदेशी खाना खाइए, और मान लीजिए कि मिर्च पर मोल-भाव नहीं है।","mr":"रावेर अख्ख्या देशाला केळी पाठवतं. बागेच्या कडेच्या जुन्या मातीच्या घरात राहा, खानदेशी जेवा, आणि तिखटावर घासाघीस चालत नाही हे मान्य करा."}'::jsonb, v_region,
    'Jalgaon', '{"en":"Raver","hi":"रावेर","mr":"रावेर"}'::jsonb, 'mud_house', 'plateau',
    array['banana', 'cotton'], 1800, 10, 3,
    array[10, 11, 12, 1, 2]::integer[], 21.247, 76.033, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['banana-harvest', 'cotton-walk', 'khandeshi-kitchen', 'folk-music', 'bullock-cart', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'satpuda-padar-toranmal') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Satpuda Padar","hi":"सतपुड़ा पदर","mr":"सातपुडा पदर"}'::jsonb, '{"en":"Kailas Gavit","hi":"कैलास गावित","mr":"कैलास गावित"}'::jsonb, '{"en":"Kailas keeps bees, farms jowar, and guides in the forest. He speaks Pawri at home and Marathi with guests.","hi":"कैलास मधुमक्खियाँ पालते हैं, ज्वार करते हैं, और जंगल में राह दिखाते हैं। घर में पावरी बोलते हैं, मेहमानों से मराठी।","mr":"कैलास मधमाश्या पाळतात, ज्वारी करतात, आणि रानात वाट दाखवतात. घरात पावरी बोलतात, पाहुण्यांशी मराठी."}'::jsonb, v_region,
    'Nandurbar', '{"en":"Toranmal","hi":"तोरणमाळ","mr":"तोरणमाळ"}'::jsonb, '+91 70570 19286', 4,
    array['mr', 'hi'], 'approved', now(), 2024
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'satpuda-padar-toranmal', '{"en":"The far end of Maharashtra, at eleven hundred metres","hi":"महाराष्ट्र का आख़िरी छोर, ग्यारह सौ मीटर पर","mr":"महाराष्ट्राचं शेवटचं टोक, अकराशे मीटरवर"}'::jsonb, '{"en":"A Pawra family’s house on the Toranmal plateau, jowar and custard apple around it, and the Satpuda dropping away to the north. The furthest farm on the platform, and the quietest.","hi":"तोरणमाळ पठार पर पावरा परिवार का घर, चारों ओर ज्वार और सीताफल, और उत्तर की ओर गिरता सतपुड़ा। मंच का सबसे दूर का और सबसे शांत खेत।","mr":"तोरणमाळ पठारावर पावरा कुटुंबाचं घर, भोवती ज्वारी आणि सीताफळ, आणि उत्तरेला उतरणारा सातपुडा. साइटवरची सगळ्यात लांबची आणि सगळ्यात शांत वाडी."}'::jsonb, v_region,
    'Nandurbar', '{"en":"Toranmal","hi":"तोरणमाळ","mr":"तोरणमाळ"}'::jsonb, 'mud_house', 'hills',
    array['jowar', 'custardapple'], 1600, 6, 2,
    array[8, 9, 10, 11, 12, 1, 2]::integer[], 21.879, 74.464, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['satpuda-walk', 'honey-gather', 'folk-music', 'forest-walk', 'campfire', 'night-stars']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

do $$
declare
  v_region uuid;
  v_host uuid;
  v_listing uuid;
begin
  if exists (select 1 from public.listings where slug = 'kanda-ghar-lasalgaon') then
    return;
  end if;

  select id into v_region from public.regions where slug = 'nashik';

  insert into public.host_profiles (
    farm_name, host_name, bio, region_id, district, village, phone, land_acres,
    languages, verification_status, verified_at, hosting_since
  ) values (
    '{"en":"Kanda Ghar","hi":"कांदा घर","mr":"कांदा घर"}'::jsonb, '{"en":"Rekha Ahire","hi":"रेखा अहिरे","mr":"रेखा अहिरे"}'::jsonb, '{"en":"Rekha grades and stores onion for eleven neighbouring families. She is on the platform because storage does not pay in a bad year, and rooms do.","hi":"रेखा ग्यारह पड़ोसी परिवारों का प्याज़ छाँटती और भंडारित करती हैं। ख़राब साल में भंडारण नहीं चलता, कमरे चलते हैं — इसीलिए वे यहाँ हैं।","mr":"रेखा अकरा शेजारच्या कुटुंबांचा कांदा प्रतवारी करून साठवतात. वाईट वर्षात साठवणूक परवडत नाही, खोल्या परवडतात — म्हणून त्या इथं आहेत."}'::jsonb, v_region,
    'Nashik', '{"en":"Lasalgaon","hi":"लासलगाँव","mr":"लासलगाव"}'::jsonb, '+91 93710 55204', 10,
    array['mr', 'hi'], 'approved', now(), 2023
  ) returning id into v_host;

  insert into public.listings (
    host_id, slug, title, description, region_id, district, village, stay_type, scene,
    crops, base_price, max_guests, bedrooms, best_months, lat, lng, status, rating,
    review_count, is_featured, published_at
  ) values (
    v_host, 'kanda-ghar-lasalgaon', '{"en":"Onion, and the market that sets the country’s price","hi":"प्याज़, और वह मंडी जो देश का भाव तय करती है","mr":"कांदा, आणि देशाचा भाव ठरवणारा बाजार"}'::jsonb, '{"en":"A terrace room with the sky over it, on a farm ten minutes from the Lasalgaon mandi. Be at the auction by six in the morning and you will never look at an onion the same way.","hi":"खुले आसमान वाला छत का कमरा, लासलगाँव मंडी से दस मिनट के खेत पर। सुबह छह बजे नीलामी में पहुँचिए, फिर प्याज़ पहले जैसा नहीं लगेगा।","mr":"उघड्या आकाशाखालची गच्चीवरची खोली, लासलगाव बाजारापासून दहा मिनिटांवरच्या शेतात. सकाळी सहाला लिलावात पोहोचा, मग कांदा पूर्वीसारखा दिसणार नाही."}'::jsonb, v_region,
    'Nashik', '{"en":"Lasalgaon","hi":"लासलगाँव","mr":"लासलगाव"}'::jsonb, 'terrace_room', 'plateau',
    array['onion', 'tomato', 'wheat'], 1950, 12, 4,
    array[10, 11, 12, 1, 2, 3]::integer[], 20.1447, 74.238, 'published', 0,
    0, false, now()
  ) returning id into v_listing;

  insert into public.listing_activities (listing_id, activity_id)
  select v_listing, a.id from public.activities a where a.slug = any(array['onion-market', 'bhakri-making', 'bullock-cart', 'night-stars', 'bird-walk', 'gur-making']);

  -- Six months of open dates, so the calendar and the availability check have
  -- something to work with the moment the project is created.
  insert into public.availability (listing_id, date, is_available)
  select v_listing, d::date, true
  from generate_series(current_date, current_date + 180, interval '1 day') d
  on conflict (listing_id, date) do nothing;
end $$;

-- ─── curated two-day packages ───────────────────────────────────────────────
insert into public.trip_packages (slug, title, summary, region_id, listing_id, duration_days, price_per_person, itinerary, is_featured, status)
select 'kokan-mango-weekend', '{"en":"The mango weekend","hi":"आम वाला सप्ताहांत","mr":"आंब्याचा शनिवार-रविवार"}'::jsonb, '{"en":"Two days in an Alphonso wadi: grafting in the morning, kokum syrup in the afternoon, the reef at low tide, and the sky when the lights go off.","hi":"हापुस की वाड़ी में दो दिन: सुबह कलम, दोपहर कोकम शरबत, उतरते पानी में चट्टान, और बत्ती बुझने पर आसमान।","mr":"हापूसच्या वाडीत दोन दिवस: सकाळी कलमं, दुपारी कोकम सरबत, ओहोटीतला खडक, आणि दिवे गेल्यावरचं आकाश."}'::jsonb, r.id, l.id, 2,
       2400, '[{"day":1,"slot":"morning","time":"10:30","title":{"en":"Arrive, tea on the veranda","hi":"पहुँचना, ओसारी पर चाय","mr":"पोहोचणं, ओसरीवर चहा"},"note":{"en":"The family meets you at the Pawas stand.","hi":"परिवार पावस स्टैंड पर मिलता है।","mr":"घरचे पावस स्टँडवर भेटतात."}},{"day":1,"slot":"midday","time":"13:00","activity_slug":"kokan-thali","category":"food","title":{"en":"A Kokan thali, cooked with the family","hi":"परिवार के साथ कोंकणी थाली","mr":"घरच्यांसोबत कोकणी थाळी"},"note":{"en":"Wood fire, coconut, kokum. Vegetarian on request, no fuss.","hi":"चूल्हा, नारियल, कोकम। कहने पर शाकाहारी, बिना हिचक।","mr":"चूल, नारळ, कोकम. सांगितलं तर शाकाहारी, विनातक्रार."}},{"day":1,"slot":"afternoon","time":"16:00","activity_slug":"kokum-syrup","category":"craft","title":{"en":"Making kokum syrup","hi":"कोकम शरबत बनाना","mr":"कोकम सरबत करणं"},"note":{"en":"Rind, sugar, sun. You carry a bottle home.","hi":"छिलका, चीनी, धूप। एक बोतल साथ जाती है।","mr":"साल, साखर, ऊन. एक बाटली सोबत जाते."}},{"day":1,"slot":"evening","time":"18:15","activity_slug":"low-tide-walk","category":"water","title":{"en":"The reef at low tide","hi":"उतरते पानी में चट्टान","mr":"ओहोटीतला खडक"},"note":{"en":"Crabs, anemones, and whatever the sea left behind.","hi":"केकड़े, समुद्री फूल, और जो समुद्र छोड़ गया।","mr":"खेकडे, सागरफुलं, आणि समुद्रानं मागं ठेवलेलं."}},{"day":1,"slot":"night","time":"21:30","activity_slug":"night-stars","category":"stars","title":{"en":"Lying out for the stars","hi":"तारों के नीचे लेटना","mr":"चांदण्याखाली पडून राहणं"},"note":{"en":"The lights go off at ten. Then you understand the point.","hi":"दस बजे बत्ती बंद। तब बात समझ आती है।","mr":"दहाला दिवे बंद. मग गोष्ट लक्षात येते."}},{"day":2,"slot":"morning","time":"06:30","activity_slug":"bird-walk","category":"trekking","title":{"en":"Birds before breakfast","hi":"नाश्ते से पहले पक्षी","mr":"न्याहारीआधी पक्षी"},"note":{"en":"Bring nothing. The names come in Marathi first.","hi":"कुछ मत लाइए। नाम पहले मराठी में आते हैं।","mr":"काही आणू नका. नावं आधी मराठीत येतात."}},{"day":2,"slot":"morning","time":"08:30","title":{"en":"Breakfast after the first round","hi":"पहले चक्कर के बाद नाश्ता","mr":"पहिल्या फेरीनंतर न्याहारी"},"note":{"en":"Poha, and tea you will think about later.","hi":"पोहा, और वह चाय जो याद रहेगी।","mr":"पोहे, आणि नंतर आठवत राहणारा चहा."}},{"day":2,"slot":"midday","time":"10:30","activity_slug":"mango-grafting","category":"farming","title":{"en":"Grafting mango, and a round of the orchard","hi":"आम की कलम, और बाग़ का चक्कर","mr":"आंब्याची कलमं, आणि बागेतली फेरी"},"note":{"en":"Tie a graft yourself; the tree it becomes will outlive you.","hi":"ख़ुद एक कलम बाँधिए; वह पेड़ आपसे ज़्यादा जिएगा।","mr":"स्वतः एक कलम बांधा; ते झाड तुमच्यानंतरही राहील."}},{"day":2,"slot":"afternoon","time":"13:30","title":{"en":"Last lunch, and goodbye","hi":"आख़िरी खाना, और विदा","mr":"शेवटचं जेवण, आणि निरोप"},"note":{"en":"You leave with whatever is in season.","hi":"मौसम की उपज साथ जाती है।","mr":"हंगामातलं काहीतरी सोबत जातं."}}]'::jsonb, true, 'published'
from public.regions r
join public.listings l on l.slug = 'amrai-wadi-pawas'
where r.slug = 'kokan'
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, itinerary = excluded.itinerary,
  price_per_person = excluded.price_per_person, is_featured = excluded.is_featured;

insert into public.trip_packages (slug, title, summary, region_id, listing_id, duration_days, price_per_person, itinerary, is_featured, status)
select 'kokan-creek-and-cashew', '{"en":"Creek, cashew and a fish curry","hi":"खाड़ी, काजू और मछली करी","mr":"खाडी, काजू आणि माशाचं कालवण"}'::jsonb, '{"en":"Kayak the Achara backwater at first light, roast cashew after lunch, and learn a curry that takes twenty minutes and forty years.","hi":"भोर में आचरा की खाड़ी में कयाक, दोपहर बाद काजू भूनना, और वह करी सीखना जिसमें बीस मिनट और चालीस साल लगते हैं।","mr":"पहाटे आचऱ्याच्या खाडीत कयाक, दुपारनंतर काजू भाजणं, आणि वीस मिनिटं व चाळीस वर्षं लागणारं कालवण शिकणं."}'::jsonb, r.id, l.id, 2,
       2900, '[{"day":1,"slot":"morning","time":"11:00","title":{"en":"Arrive, cold kokum drink","hi":"पहुँचना, ठंडा कोकम","mr":"पोहोचणं, गार कोकम"},"note":{}},{"day":1,"slot":"midday","time":"13:30","activity_slug":"fish-curry","category":"food","title":{"en":"Coastal fish curry, start to finish","hi":"तटीय मछली करी, शुरू से आख़िर","mr":"माशाचं कालवण, सुरुवातीपासून"},"note":{"en":"From the morning catch. A vegetable version runs alongside.","hi":"सुबह की पकड़ से। साथ में सब्ज़ी वाला रूप भी बनता है।","mr":"सकाळच्या पाटीतून. सोबत भाजीचं कालवणही होतं."}},{"day":1,"slot":"afternoon","time":"16:30","activity_slug":"cashew-roast","category":"craft","title":{"en":"Roasting and shelling cashew","hi":"काजू भूनना और छीलना","mr":"काजू भाजणं आणि सोलणं"},"note":{"en":"Gloves on — the shell oil bites. Worth it for the first warm one.","hi":"दस्ताने पहनिए — छिलके का तेल जलाता है। पहला गरम काजू उसका मोल है।","mr":"हातमोजे घाला — सालीचं तेल चटका देतं. पहिल्या गरम काजूसाठी ते सोसवतं."}},{"day":1,"slot":"evening","time":"18:00","activity_slug":"backwater-kayak","category":"water","title":{"en":"Kayaking the backwater","hi":"खाड़ी में कयाकिंग","mr":"खाडीत कयाकिंग"},"note":{"en":"Flat water, mangrove on both sides, kingfishers.","hi":"शांत पानी, दोनों ओर कच्छ वन, किलकिले।","mr":"शांत पाणी, दोन्ही बाजूंना खारफुटी, खंड्या."}},{"day":1,"slot":"night","time":"22:00","activity_slug":"night-stars","category":"stars","title":{"en":"Lying out for the stars","hi":"तारों के नीचे लेटना","mr":"चांदण्याखाली पडून राहणं"},"note":{"en":"The lights go off at ten. Then you understand the point.","hi":"दस बजे बत्ती बंद। तब बात समझ आती है।","mr":"दहाला दिवे बंद. मग गोष्ट लक्षात येते."}},{"day":2,"slot":"morning","time":"06:00","activity_slug":"beach-sunrise","category":"water","title":{"en":"Sunrise on an empty beach","hi":"सुनसान समुद्र तट पर सूर्योदय","mr":"निर्जन किनाऱ्यावर सूर्योदय"},"note":{"en":"Ten minutes on foot, and nobody else is up.","hi":"दस मिनट पैदल, और कोई जागा नहीं होता।","mr":"दहा मिनिटं चालत, आणि दुसरं कुणी उठलेलं नसतं."}},{"day":2,"slot":"morning","time":"09:00","title":{"en":"Breakfast on the sand","hi":"रेत पर नाश्ता","mr":"वाळूवर न्याहारी"},"note":{}},{"day":2,"slot":"midday","time":"11:00","activity_slug":"low-tide-walk","category":"water","title":{"en":"The reef at low tide","hi":"उतरते पानी में चट्टान","mr":"ओहोटीतला खडक"},"note":{"en":"Crabs, anemones, and whatever the sea left behind.","hi":"केकड़े, समुद्री फूल, और जो समुद्र छोड़ गया।","mr":"खेकडे, सागरफुलं, आणि समुद्रानं मागं ठेवलेलं."}},{"day":2,"slot":"afternoon","time":"14:00","title":{"en":"Lunch, then the road home","hi":"खाना, फिर घर की राह","mr":"जेवण, मग परतीचा रस्ता"},"note":{}}]'::jsonb, true, 'published'
from public.regions r
join public.listings l on l.slug = 'kaju-mala-achara'
where r.slug = 'kokan'
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, itinerary = excluded.itinerary,
  price_per_person = excluded.price_per_person, is_featured = excluded.is_featured;

insert into public.trip_packages (slug, title, summary, region_id, listing_id, duration_days, price_per_person, itinerary, is_featured, status)
select 'nashik-vineyard-two-days', '{"en":"Two days in a vineyard","hi":"अंगूर के बाग़ में दो दिन","mr":"द्राक्षमळ्यात दोन दिवस"}'::jsonb, '{"en":"Prune a vine, watch raisins being made, eat dinner between the rows under lantern light, and stand in the Lasalgaon auction at six in the morning.","hi":"एक बेल छाँटिए, किशमिश बनते देखिए, लालटेन की रोशनी में क़तारों के बीच खाइए, और सुबह छह बजे लासलगाँव की नीलामी में खड़े रहिए।","mr":"एक वेल छाटा, बेदाणे होताना बघा, कंदिलाच्या उजेडात ओळींमध्ये जेवा, आणि सकाळी सहाला लासलगावच्या लिलावात उभे राहा."}'::jsonb, r.id, l.id, 2,
       2700, '[{"day":1,"slot":"morning","time":"11:00","title":{"en":"Arrive, walk the rows","hi":"पहुँचना, क़तारों में चलना","mr":"पोहोचणं, ओळींतून फेरी"},"note":{}},{"day":1,"slot":"midday","time":"13:00","title":{"en":"Lunch under the shed","hi":"शेड के नीचे खाना","mr":"शेडखाली जेवण"},"note":{}},{"day":1,"slot":"afternoon","time":"16:00","activity_slug":"raisin-making","category":"craft","title":{"en":"Turning grapes into raisins","hi":"अंगूर से किशमिश","mr":"द्राक्षांचे बेदाणे"},"note":{"en":"The dipping, the racks, the eighteen days of waiting.","hi":"डुबाना, रैक, और अठारह दिन का इंतज़ार।","mr":"बुडवणं, रॅक, आणि अठरा दिवसांची वाट."}},{"day":1,"slot":"evening","time":"18:30","activity_slug":"bullock-cart","category":"culture","title":{"en":"Bullock cart to the far field","hi":"बैलगाड़ी से दूर के खेत तक","mr":"बैलगाडीनं लांबच्या शेतात"},"note":{"en":"Slower than walking, and nobody minds.","hi":"पैदल से धीमी, और किसी को फ़र्क़ नहीं पड़ता।","mr":"चालण्यापेक्षा सावकाश, आणि कुणाला घाई नाही."}},{"day":1,"slot":"night","time":"20:30","activity_slug":"vineyard-dinner","category":"food","title":{"en":"Dinner between the vines","hi":"बेलों के बीच रात का खाना","mr":"वेलींमध्ये रात्रीचं जेवण"},"note":{"en":"Lanterns on the wire, food off the same soil.","hi":"तार पर लालटेन, उसी मिट्टी का खाना।","mr":"तारेवर कंदील, त्याच मातीचं जेवण."}},{"day":2,"slot":"morning","time":"05:45","activity_slug":"onion-market","category":"culture","title":{"en":"Dawn at the onion market","hi":"सुबह प्याज़ मंडी","mr":"पहाटे कांदा बाजार"},"note":{"en":"Lasalgaon sets the price of onion for the country. Watch it happen.","hi":"लासलगाँव देश में प्याज़ का भाव तय करता है। होते देखिए।","mr":"लासलगाव देशाचा कांदाभाव ठरवतं. ते होताना बघा."}},{"day":2,"slot":"morning","time":"09:00","title":{"en":"Breakfast back at the farm","hi":"खेत लौटकर नाश्ता","mr":"मळ्यात परत येऊन न्याहारी"},"note":{}},{"day":2,"slot":"midday","time":"10:30","activity_slug":"grape-pruning","category":"farming","title":{"en":"Pruning and tying the vines","hi":"बेलों की छँटाई और बँधाई","mr":"वेलींची छाटणी आणि बांधणी"},"note":{"en":"Every cut decides a bunch six months from now.","hi":"हर कटाई छह महीने बाद का गुच्छा तय करती है।","mr":"प्रत्येक छाटणी सहा महिन्यांनंतरचा घड ठरवते."}},{"day":2,"slot":"afternoon","time":"13:30","title":{"en":"Lunch, and a box of grapes","hi":"खाना, और अंगूर का एक डिब्बा","mr":"जेवण, आणि द्राक्षांचा एक बॉक्स"},"note":{}}]'::jsonb, true, 'published'
from public.regions r
join public.listings l on l.slug = 'draksha-mala-ozar'
where r.slug = 'nashik'
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, itinerary = excluded.itinerary,
  price_per_person = excluded.price_per_person, is_featured = excluded.is_featured;

insert into public.trip_packages (slug, title, summary, region_id, listing_id, duration_days, price_per_person, itinerary, is_featured, status)
select 'nashik-monsoon-climb', '{"en":"Waterfalls and the Kalsubai dawn","hi":"झरने और कलसुबाई की भोर","mr":"धबधबे आणि कळसूबाईची पहाट"}'::jsonb, '{"en":"Walk to the fall on the first afternoon, sleep early, and leave at five for the highest point in Maharashtra. Back down for bhakri by noon.","hi":"पहली दोपहर झरने तक, जल्दी सोइए, और पाँच बजे महाराष्ट्र की सबसे ऊँची चोटी की ओर। दोपहर तक लौटकर भाकरी।","mr":"पहिल्या दुपारी धबधब्यापर्यंत, लवकर झोपा, आणि पाचला महाराष्ट्राच्या सर्वोच्च टोकाकडे. दुपारपर्यंत परत येऊन भाकरी."}'::jsonb, r.id, l.id, 2,
       2300, '[{"day":1,"slot":"morning","time":"10:00","title":{"en":"Arrive, tents and tea","hi":"पहुँचना, तंबू और चाय","mr":"पोहोचणं, तंबू आणि चहा"},"note":{}},{"day":1,"slot":"midday","time":"13:00","title":{"en":"Rice-plate lunch","hi":"भात-थाली","mr":"भाताचं ताट"},"note":{}},{"day":1,"slot":"afternoon","time":"15:30","activity_slug":"waterfall-walk","category":"trekking","title":{"en":"Walking to the waterfall","hi":"झरने तक पैदल","mr":"धबधब्यापर्यंत चालणं"},"note":{"en":"An hour up through the fields, longer coming back wet.","hi":"खेतों से एक घंटा ऊपर, भीगकर लौटने में ज़्यादा।","mr":"शेतांतून तासभर वर, भिजून परतायला जास्त."}},{"day":1,"slot":"evening","time":"18:30","activity_slug":"bhakri-making","category":"food","title":{"en":"Bhakri on a wood fire","hi":"चूल्हे पर भाकरी","mr":"चुलीवर भाकरी"},"note":{"en":"Yours will tear. Theirs will not. That is the lesson.","hi":"आपकी फटेगी। उनकी नहीं। सीख यही है।","mr":"तुमची फाटेल. त्यांची नाही. शिकवण तीच."}},{"day":1,"slot":"night","time":"20:30","activity_slug":"campfire","category":"camping","title":{"en":"Campfire and old songs","hi":"अलाव और पुराने गीत","mr":"शेकोटी आणि जुनी गाणी"},"note":{"en":"Someone always has a dholki. It is never planned.","hi":"किसी के पास ढोलकी होती ही है। तय कभी नहीं होता।","mr":"कुणाकडे तरी ढोलकी असतेच. ठरवून कधीच होत नाही."}},{"day":2,"slot":"morning","time":"05:00","activity_slug":"kalsubai-climb","category":"trekking","title":{"en":"Early climb towards Kalsubai","hi":"कलसुबाई की ओर सुबह की चढ़ाई","mr":"कळसूबाईकडे पहाटेची चढाई"},"note":{"en":"Leave at five. The highest point in Maharashtra by nine.","hi":"पाँच बजे निकलिए। नौ बजे तक महाराष्ट्र का सबसे ऊँचा बिंदु।","mr":"पाचला निघा. नऊपर्यंत महाराष्ट्राचं सर्वोच्च टोक."}},{"day":2,"slot":"midday","time":"11:30","title":{"en":"Late breakfast, everything hurts","hi":"देर से नाश्ता, सब कुछ दुखता है","mr":"उशिरा न्याहारी, सगळं दुखतंय"},"note":{}},{"day":2,"slot":"afternoon","time":"14:00","activity_slug":"strawberry-pick","category":"farming","title":{"en":"Picking strawberries","hi":"स्ट्रॉबेरी तोड़ना","mr":"स्ट्रॉबेरी तोडणं"},"note":{"en":"December to March, and the count never matches the basket.","hi":"दिसंबर से मार्च, और गिनती टोकरी से कभी नहीं मिलती।","mr":"डिसेंबर ते मार्च, आणि मोजणी कधीच टोपलीशी जुळत नाही."}}]'::jsonb, false, 'published'
from public.regions r
join public.listings l on l.slug = 'igatpuri-dhara-ghoti'
where r.slug = 'nashik'
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, itinerary = excluded.itinerary,
  price_per_person = excluded.price_per_person, is_featured = excluded.is_featured;

-- ─── reviews, each on a completed booking ───────────────────────────────────
-- A review cannot exist without a booking that finished — the policy in
-- 20260907090200_rls.sql refuses one — so the seed creates the stay first.

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 24;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED01') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'amrai-wadi-pawas';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED01', v_listing, v_start, v_start + 2, 2, 'Aditi Ranade', '+91 98201 44512',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"I went to switch off and ended up tying grafts for two hours. Sunanda tai fed us like we were relatives. The room is simple and spotless.","hi":"सोचा था बस बंद हो जाऊँगी, और दो घंटे कलम बाँधती रही। सुनंदा ताई ने रिश्तेदारों जैसा खिलाया। कमरा सादा और बिल्कुल साफ़।","mr":"नुसतं शांत बसायला गेले होते, आणि दोन तास कलमं बांधत राहिले. सुनंदा ताईंनी नात्यातलं असल्यासारखं खाऊ घातलं. खोली साधी आणि लख्ख."}'::jsonb, now() - interval '24 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 61;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED02') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'amrai-wadi-pawas';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED02', v_listing, v_start, v_start + 2, 2, 'Faisal Shaikh', '+91 99870 23310',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"Took my parents. They have not stopped talking about the kokum. Sadanand kaka called twice before we left to check on the road.","hi":"माता-पिता को ले गया। कोकम की बात अब तक कर रहे हैं। निकलने से पहले सदानंद काका ने दो बार रास्ते का हाल पूछा।","mr":"आई-वडिलांना नेलं होतं. कोकमाबद्दल अजूनही बोलतायत. निघण्याआधी सदानंद काकांनी दोनदा फोन करून रस्त्याची चौकशी केली."}'::jsonb, now() - interval '61 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 12;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED03') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'kaju-mala-achara';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED03', v_listing, v_start, v_start + 2, 2, 'Neha Kulkarni', '+91 88790 55102',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"The kayak at six in the morning, alone on the creek, was the best hour of my year. Vaishali tai’s fish curry is not a demonstration, it is lunch.","hi":"सुबह छह बजे खाड़ी में अकेले कयाक — साल का सबसे अच्छा घंटा। वैशाली ताई की मछली करी दिखावा नहीं, खाना है।","mr":"सकाळी सहाला खाडीत एकटीनं कयाक — वर्षातला सगळ्यात चांगला तास. वैशाली ताईंचं कालवण प्रात्यक्षिक नाही, जेवण आहे."}'::jsonb, now() - interval '12 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 38;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED04') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'warli-angan-jawhar';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED04', v_listing, v_start, v_start + 2, 2, 'Rohit Deshmukh', '+91 90040 71183',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"No signal for two days and I did not notice until the drive back. My daughter painted half a wall. Sunita tai let her.","hi":"दो दिन नेटवर्क नहीं था, और लौटते वक़्त तक पता ही नहीं चला। बेटी ने आधी दीवार रँग दी। सुनीता ताई ने रँगने दी।","mr":"दोन दिवस रेंज नव्हती, आणि परतीच्या रस्त्यापर्यंत लक्षातही आलं नाही. मुलीनं अर्धी भिंत रंगवली. सुनीता ताईंनी रंगवू दिली."}'::jsonb, now() - interval '38 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 8;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED05') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'draksha-mala-ozar';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED05', v_listing, v_start, v_start + 2, 2, 'Sneha Joshi', '+91 97640 90021',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"Dinner between the vines is exactly as good as it sounds. Dattatray sir explained export grading for an hour and I was never bored.","hi":"बेलों के बीच का खाना उतना ही अच्छा है जितना सुनने में लगता है। दत्तात्रय सर ने एक घंटा निर्यात ग्रेडिंग समझाई और ऊब नहीं हुई।","mr":"वेलींमध्ये जेवण जितकं छान वाटतं तितकंच छान आहे. दत्तात्रय सरांनी तासभर निर्यात प्रतवारी समजावली आणि कंटाळा आलाच नाही."}'::jsonb, now() - interval '8 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 45;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED06') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'draksha-mala-ozar';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED06', v_listing, v_start, v_start + 2, 2, 'Imran Qureshi', '+91 98220 61470',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 4, '{"en":"Wonderful farm, but book the cottage and not the extra beds if you are four adults. The market trip at 5:45 is worth losing sleep for.","hi":"बढ़िया खेत, पर चार बड़े हों तो कुटिया लीजिए, अतिरिक्त बिस्तर नहीं। 5:45 की मंडी के लिए नींद क़ुर्बान की जा सकती है।","mr":"मळा छान, पण चार मोठी माणसं असतील तर घरच घ्या, जादा बिछाने नको. ५:४५ चा बाजार झोप सोडून बघण्यासारखा."}'::jsonb, now() - interval '45 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 19;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED07') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'igatpuri-dhara-ghoti';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED07', v_listing, v_start, v_start + 2, 2, 'Prachi Nikam', '+91 91680 30752',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"Manisha tai got four of us up Kalsubai and down again without a single scare. The tent stayed dry in serious rain.","hi":"मनीषा ताई हम चारों को कलसुबाई चढ़ा-उतार लाईं, एक बार भी डर नहीं लगा। तेज़ बारिश में भी तंबू सूखा रहा।","mr":"मनीषा ताईंनी आम्हा चौघांना कळसूबाई चढवून-उतरवून आणलं, एकदाही भीती वाटली नाही. जोरदार पावसातही तंबू कोरडा राहिला."}'::jsonb, now() - interval '19 days');
end $$;

do $$
declare
  v_listing uuid;
  v_price numeric;
  v_booking uuid;
  v_start date := current_date - 33;
begin
  if exists (select 1 from public.bookings where code = 'CTN-SEED08') then
    return;
  end if;

  select id, base_price into v_listing, v_price from public.listings where slug = 'satpuda-padar-toranmal';
  if v_listing is null then return; end if;

  insert into public.bookings (
    code, listing_id, start_date, end_date, guest_count, guest_name, guest_phone,
    language, total_amount, farmer_amount, platform_fee, status, payment_status
  ) values (
    'CTN-SEED08', v_listing, v_start, v_start + 2, 2, 'Yogesh Bhamre', '+91 70301 88264',
    'en', v_price * 2, 0, 0, 'completed', 'paid'
  ) returning id into v_booking;

  insert into public.reviews (booking_id, listing_id, rating, comment, created_at)
  values (v_booking, v_listing, 5, '{"en":"Eight hours from Pune and worth every one. The honey, the walk, and a night so quiet it was almost loud.","hi":"पुणे से आठ घंटे, और हर घंटा सही। शहद, वह सैर, और इतनी शांत रात कि लगभग शोर लगे।","mr":"पुण्याहून आठ तास, आणि प्रत्येक तास सार्थ. मध, ती भटकंती, आणि इतकी शांत रात्र की जवळजवळ आवाज वाटावा."}'::jsonb, now() - interval '33 days');
end $$;

-- Ratings are left to the trigger on public.reviews: whatever the reviews
-- in this file average to is what a farm shows, and a farm with none shows
-- none.

