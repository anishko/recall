import type { Case, PatientView, EvalMetrics, AuditCall, AppointmentSlot } from "./types";

export const MOCK_CASES: Case[] = [
  {
    id: "RR-001",
    patientInitials: "SJ",
    patientAge: 65,
    patientName: "Sarah Johnson",
    patientLanguage: "en",
    finding: "11mm spiculated RUL nodule — Lung-RADS 4B",
    findingDetail:
      "An 11-millimeter spiculated nodule in the right upper lobe with pleural tethering. Highly suspicious for malignancy.",
    guideline: "Lung-RADS v2022 Category 4B",
    guidelineUrl: "#",
    recommendedTimeframe: "21 days",
    urgency: "URGENT",
    confidence: 0.91,
    subScores: { extraction: 0.91, classification: 0.88, scriptQuality: 0.90 },
    status: "pending",
    reportRaw: `CLINICAL INDICATION: Persistent cough, mild shortness of breath.

TECHNIQUE: CT chest without contrast (lung windows).

FINDINGS:
Right upper lobe: 11mm spiculated nodule at the right upper lobe apex (series 3, image 42).
Minor tethering to the pleural surface noted. No significant mediastinal lymphadenopathy.
No pleural effusion. Heart size normal.

IMPRESSION:
1. 11mm spiculated RUL nodule — Lung-RADS 4B. High suspicion for malignancy.
   Recommend PET-CT and pulmonology referral within 21 days.
2. No acute cardiopulmonary process.

Dictated by: R. Patel, MD
Source: Adenocarcinoma of the lung (histology confirmed in reference case)
`,
    entities: [
      { type: "finding", text: "11mm spiculated nodule", start: 84, end: 106 },
      { type: "anatomy", text: "right upper lobe", start: 110, end: 126 },
      { type: "guideline", text: "Lung-RADS 4B", start: 284, end: 296 },
      { type: "timeframe", text: "21 days", start: 346, end: 353 },
    ],
    patientScript: {
      "en": "Hi Sarah, this is Recall calling on behalf of Dr. Chen. Your recent CT scan showed a spot in your right lung that we need to look at more closely. We've arranged a priority appointment within the next 21 days. This is not a confirmed diagnosis — but we're acting quickly because that gives the best outcomes.",
      "ar-TN": "مرحبا سارة، هذا Recall يتصل من طرف الدكتور شن. الفحص بالأشعة أظهر بقعة في رئتك اليمنى نحتاج للنظر فيها بشكل أقرب. رتبنا موعد أولوية خلال 21 يوم. هذا مش تشخيص مؤكد — لكننا نتصرف بسرعة لأن ذلك يعطي أفضل النتائج.",
      "fr": "Bonjour Sarah, c'est Recall de la part du Dr Chen. Votre scanner a montré une tache dans votre poumon droit que nous devons examiner de plus près. Nous avons organisé un rendez-vous prioritaire dans les 21 jours. Ce n'est pas un diagnostic confirmé — mais nous agissons rapidement car cela donne les meilleurs résultats.",
      "zh": "你好莎拉，这里是Recall，代表陈医生致电。您的CT扫描在右肺发现了一个需要仔细检查的阴影。我们已安排21天内的优先预约。这不是确诊——但我们迅速行动，因为这能带来最佳结果。",
    },
    reasoningTrace:
      "Step 1 — parse_report: Primary finding: 11mm spiculated nodule, RUL apex. Pleural tethering noted. High-risk morphology.\n\nStep 2 — classify_actionability: Lung-RADS v2022 applied. Solid nodule ≥8mm with spiculation + pleural tethering → Category 4B (highly suspicious). Recommend PET-CT + pulmonology within 21 days.\n\nStep 3 — draft_patient_script: Urgent but non-alarming phrasing. FK score: 6.8. Avoided 'cancer', 'malignancy'. Source: adenocarcinoma reference case (Radiopaedia).",
    slices: [
      "/radrelay_images/RR-001/RR-001_slice_1.jpeg",
      "/radrelay_images/RR-001/RR-001_slice_2.jpeg",
      "/radrelay_images/RR-001/RR-001_slice_3.jpeg",
    ],
    highlight: { x: 42, y: 30, r: 8, sliceIndex: 0 },
    arrivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "RR-002",
    patientInitials: "GC",
    patientAge: 78,
    patientName: "Grandma Chen",
    patientLanguage: "zh",
    finding: "4mm calcified hepatic lesion",
    findingDetail: "A 4-millimeter calcified lesion in the right hepatic lobe, likely benign.",
    guideline: "LI-RADS v2018 — LR-1",
    guidelineUrl: "#",
    recommendedTimeframe: "Annual follow-up",
    urgency: "ROUTINE",
    confidence: 0.87,
    subScores: { extraction: 0.91, classification: 0.85, scriptQuality: 0.86 },
    status: "approved",
    reportRaw: `CLINICAL INDICATION: Abdominal pain.

TECHNIQUE: CT abdomen and pelvis with contrast.

FINDINGS:
Liver: 4mm calcified focus, right lobe. No enhancing lesion. No biliary dilation.
Gallbladder: Normal. No stones.
Pancreas: Unremarkable.

IMPRESSION:
1. 4mm calcified hepatic lesion, right lobe — likely benign (LR-1). Annual surveillance recommended.
2. No acute intra-abdominal process.
`,
    entities: [
      { type: "finding", text: "4mm calcified focus", start: 82, end: 101 },
      { type: "anatomy", text: "right lobe", start: 103, end: 113 },
      { type: "guideline", text: "LR-1", start: 220, end: 224 },
    ],
    patientScript: {
      "en": "Hello, this is Recall calling on behalf of Dr. Chen. Your CT scan showed a very small calcium deposit in your liver, about the size of a grain of rice. This is very common and almost always harmless. Your doctor recommends a routine check-up scan once a year.",
      "ar-TN": "مرحبا، هذا Recall يتصل من طرف الدكتور شن. الفحص أظهر ترسب كلسي صغير جداً في كبدك، بحجم حبة أرز تقريباً. هذا شائع جداً وغالباً بلا ضرر. طبيبك يوصي بفحص دوري مرة في السنة.",
      "fr": "Bonjour, c'est Recall qui appelle de la part du Dr Chen. Votre scanner a montré un très petit dépôt calcifié dans votre foie, à peu près de la taille d'un grain de riz. C'est très courant et presque toujours bénin. Votre médecin recommande un scanner de contrôle annuel.",
      "zh": "您好，这里是Recall，代表陈医生致电。您的CT扫描在肝脏发现了一个非常小的钙化沉积，大约有一粒米那么大。这非常常见，几乎总是无害的。您的医生建议每年进行一次常规复查扫描。",
    },
    reasoningTrace:
      "Step 1 — parse_report: Primary finding: 4mm calcified focus, right hepatic lobe. No enhancing lesion identified.\n\nStep 2 — classify_actionability: LI-RADS v2018 applied. Calcified lesion with no enhancement → LR-1 (definitely benign). Annual surveillance recommended per institutional protocol.\n\nStep 3 — draft_patient_script: Generated zh-primary script with rice-grain size analogy. FK score: 5.8.",
    slices: [
      "/mock/slices/RR-002/slice1.jpg",
      "/mock/slices/RR-002/slice2.jpg",
    ],
    highlight: { x: 55, y: 52, r: 6, sliceIndex: 0 },
    arrivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    calledAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    callDuration: 187,
    callOutcome: "scheduled",
    callTranscript:
      "[Recall Agent]: 你好，这里是Recall医疗系统，代表陈医生致电。您的CT结果显示…\n[Patient]: 你好，什么事？\n[Recall Agent]: 我想为您解释您最近的CT扫描结果。您的肝脏有一个非常小的钙化点…\n[Patient]: 这严重吗？\n[Recall Agent]: 这非常常见，几乎总是无害的。我们希望您每年做一次随访扫描。您方便预约吗？\n[Patient]: 好的，可以。",
  },
  {
    id: "RR-003",
    patientInitials: "AD",
    patientAge: 52,
    patientName: "Alex Dakhli",
    patientLanguage: "ar-TN",
    finding: "14mm solid RUL mass",
    findingDetail: "A 14-millimeter solid mass in the right upper lobe with irregular margins.",
    guideline: "Lung-RADS v2022 Category 4X",
    guidelineUrl: "#",
    recommendedTimeframe: "30 days",
    urgency: "URGENT",
    confidence: 0.78,
    subScores: { extraction: 0.82, classification: 0.75, scriptQuality: 0.76 },
    status: "pending",
    reportRaw: `CLINICAL INDICATION: Persistent cough, weight loss.

TECHNIQUE: CT chest with and without contrast.

FINDINGS:
Right upper lobe: 14mm solid mass with irregular margins and mild pleural tethering (series 2, image 28).
No mediastinal lymphadenopathy. No pleural effusion.

IMPRESSION:
1. 14mm solid RUL mass — highly suspicious for malignancy. Lung-RADS 4X.
   Recommend urgent PET-CT and pulmonology referral within 30 days.
2. No metastatic disease identified on this study.
`,
    entities: [
      { type: "finding", text: "14mm solid mass", start: 78, end: 93 },
      { type: "anatomy", text: "Right upper lobe", start: 62, end: 78 },
      { type: "guideline", text: "Lung-RADS 4X", start: 262, end: 275 },
      { type: "timeframe", text: "30 days", start: 338, end: 345 },
    ],
    patientScript: {
      "en": "Hello, this is Recall calling on behalf of Dr. Chen. Your CT scan showed a spot in your right lung that we need to look at more closely and quickly. We've arranged a priority appointment for a PET-CT scan within the next 30 days. Please call us back as soon as possible so we can book this for you.",
      "ar-TN": "مرحبا، هذا Recall يتصل من طرف الدكتور شن. الفحص بالأشعة أظهر بقعة في رئتك اليمنى نحتاج للنظر فيها بشكل أسرع. رتبنا موعد أولوية لفحص PET-CT خلال 30 يوم. الرجاء الاتصال بنا في أقرب وقت حتى نحجز لك الموعد.",
      "fr": "Bonjour, c'est Recall qui appelle de la part du Dr Chen. Votre scanner a montré une tache dans votre poumon droit que nous devons examiner rapidement. Nous avons organisé un rendez-vous prioritaire pour un PET-CT dans les 30 prochains jours. Veuillez nous rappeler dès que possible.",
      "zh": "您好，这里是Recall，代表陈医生致电。您的CT扫描在右肺发现了一个需要尽快仔细检查的阴影。我们已安排了在30天内进行PET-CT扫描的优先预约。请尽快回电，以便我们为您预约。",
    },
    reasoningTrace:
      "Step 1 — parse_report: Primary finding: 14mm solid mass, RUL, irregular margins + pleural tethering. High-risk features identified.\n\nStep 2 — classify_actionability: Lung-RADS v2022 applied. ≥8mm solid nodule + additional features (irregular margins, tethering) → Category 4X. Confidence lower (0.78) due to ambiguity in margin description — flagged for human review.\n\nStep 3 — draft_patient_script: Generated ar-TN primary, careful phrasing around 'mass'. Avoided 'cancer'. Emphasised speed without alarming. FK score: 6.8.",
    slices: [
      "/mock/slices/RR-003/slice1.jpg",
      "/mock/slices/RR-003/slice2.jpg",
      "/mock/slices/RR-003/slice3.jpg",
      "/mock/slices/RR-003/slice4.jpg",
    ],
    highlight: { x: 48, y: 35, r: 10, sliceIndex: 1 },
    arrivedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "RR-004",
    patientInitials: "ML",
    patientAge: 71,
    patientName: "Maria Lopez",
    patientLanguage: "en",
    finding: "Bilateral 3mm micronodules",
    findingDetail: "Scattered bilateral micronodules measuring up to 3mm, likely inflammatory.",
    guideline: "Fleischner <6mm low-risk — No follow-up",
    guidelineUrl: "#",
    recommendedTimeframe: "No follow-up required",
    urgency: "NO_FU",
    confidence: 0.93,
    subScores: { extraction: 0.95, classification: 0.94, scriptQuality: 0.90 },
    status: "approved",
    reportRaw: `CLINICAL INDICATION: Chronic cough.

TECHNIQUE: CT chest without contrast.

FINDINGS:
Lungs: Scattered bilateral micronodules ≤3mm (series 1, images 12, 18, 24). No dominant nodule.
No consolidation. No pleural effusion.

IMPRESSION:
1. Bilateral micronodules ≤3mm — likely inflammatory/infectious. No follow-up recommended per Fleischner guidelines for low-risk patients.
`,
    entities: [
      { type: "finding", text: "micronodules ≤3mm", start: 82, end: 99 },
      { type: "guideline", text: "Fleischner guidelines", start: 215, end: 236 },
    ],
    patientScript: {
      "en": "Hi Maria, this is Recall calling on behalf of Dr. Chen. Great news about your CT scan — the tiny spots we saw are very common, likely from a past cold or minor infection, and need no further follow-up. No appointment needed. You're all clear.",
      "ar-TN": "مرحبا ماريا، هذا Recall يتصل من طرف الدكتور شن. أخبار جيدة — البقع الصغيرة التي ظهرت شائعة جداً ومحتملاً من نزلة برد أو التهاب بسيط سابق. لا حاجة لمتابعة. كل شيء بخير.",
      "fr": "Bonjour Maria, c'est Recall de la part du Dr Chen. Bonne nouvelle — les petites taches observées sont très courantes, probablement dues à un ancien rhume ou une infection mineure, et ne nécessitent aucun suivi. Vous n'avez pas besoin de rendez-vous.",
      "zh": "你好玛丽亚，这里是Recall，代表陈医生致电。您的CT扫描结果令人放心——我们看到的小点非常常见，可能来自过去的感冒或轻微感染，无需进一步随访。不需要预约。一切正常。",
    },
    reasoningTrace:
      "Step 1 — parse_report: Multiple bilateral micronodules ≤3mm. No dominant lesion.\n\nStep 2 — classify_actionability: Fleischner 2017. Solid nodules <6mm in low-risk patient → No routine follow-up. Inflammatory aetiology most likely.\n\nStep 3 — draft_patient_script: Reassuring tone. 'You're all clear' phrasing intentional — justified by Fleischner no-follow-up category.",
    slices: ["/mock/slices/RR-004/slice1.jpg"],
    arrivedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    calledAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    callDuration: 92,
    callOutcome: "scheduled",
  },
  {
    id: "RR-005",
    patientInitials: "JK",
    patientAge: 58,
    patientName: "James Kim",
    patientLanguage: "en",
    finding: "6mm RML nodule with ground-glass opacity",
    findingDetail: "6mm part-solid nodule in the right middle lobe with ground-glass component.",
    guideline: "Fleischner part-solid >6mm — 3-6 month CT",
    guidelineUrl: "#",
    recommendedTimeframe: "3-6 months",
    urgency: "SHORT",
    confidence: 0.68,
    subScores: { extraction: 0.74, classification: 0.63, scriptQuality: 0.68 },
    status: "escalated",
    reportRaw: `CLINICAL INDICATION: Incidental finding on prior imaging.

TECHNIQUE: CT chest without contrast.

FINDINGS:
Right middle lobe: 6mm part-solid nodule with ground-glass opacity component (series 2, image 31).
Solid component approximately 2mm. Morphology equivocal.

IMPRESSION:
1. 6mm part-solid RML nodule — ground-glass component equivocal. Consider Fleischner part-solid pathway.
   Low confidence (0.68) — recommend radiologist review.
`,
    entities: [
      { type: "finding", text: "6mm part-solid nodule", start: 68, end: 89 },
      { type: "anatomy", text: "Right middle lobe", start: 52, end: 69 },
    ],
    patientScript: {
      "en": "Hi James, this is Recall calling on behalf of Dr. Chen. Your CT scan showed a small spot in your right lung that our system wants a specialist to review more carefully. A radiologist will be in touch with you within 24 hours to discuss next steps.",
      "ar-TN": "",
      "fr": "",
      "zh": "",
    },
    reasoningTrace:
      "Step 1 — parse_report: 6mm part-solid nodule, RML. Solid component ~2mm. Ground-glass component present.\n\nStep 2 — classify_actionability: Low confidence (0.68) due to ambiguous morphology description. Part-solid nodules require nuanced Fleischner 2017 application. Flagging for human radiologist review — confidence below 0.70 threshold.\n\nStep 3 — NOT generating final patient script — escalated to senior radiologist.",
    slices: [
      "/mock/slices/RR-005/slice1.jpg",
      "/mock/slices/RR-005/slice2.jpg",
    ],
    highlight: { x: 58, y: 56, r: 7, sliceIndex: 0 },
    arrivedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

export const MOCK_PATIENT_VIEWS: Record<string, PatientView> = {
  "tok_sarah_abc123": {
    token: "tok_sarah_abc123",
    patientFirstName: "Sarah",
    patientAgeRange: "60s",
    preferredLanguage: "en",
    finding: "11mm spiculated RUL nodule",
    findingDetail:
      "A small 11-millimeter spot in your right lung. About the size of a blueberry.",
    urgency: "URGENT",
    recommendedTimeframe: "21 days",
    sliceUrl: "/radrelay_images/RR-001/RR-001_slice_1.jpeg",
    highlight: { x: 42, y: 30, r: 8 },
    doctorName: "Dr. Chen",
    calledAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    isScheduled: false,
    familySafe: false,
    explanation: {
      en: {
        findingSimple: "A small 8-millimeter spot in your right lung. About the size of a pea.",
        paragraph1: "Most spots like this are nothing serious. We want a closer look to be sure.",
        paragraph2: "This is not a cancer diagnosis. It's a finding that needs follow-up.",
        paragraph3: "Catching things early gives the best outcomes — that's why we called.",
        steps: [
          { label: "Your doctor reviewed your scan", detail: "Dr. Chen, today", done: true },
          { label: "We called you to explain", detail: "today", done: true },
          { label: "Book your follow-up scan", detail: "within 90 days", done: false, active: true },
          { label: "Your doctor reviews the follow-up scan", detail: "", done: false },
          { label: "We let you know the results", detail: "", done: false },
        ],
      },
      "ar-TN": {
        findingSimple: "بقعة صغيرة بحجم 8 ملم في رئتك اليمنى. بحجم حبة البازلاء تقريباً.",
        paragraph1: "معظم البقع من هذا النوع ليست خطيرة. نريد إلقاء نظرة أقرب للتأكد.",
        paragraph2: "هذا مش تشخيص للسرطان. هذه نتيجة تحتاج متابعة.",
        paragraph3: "الكشف المبكر يعطي أفضل النتائج — لهذا اتصلنا بك.",
        steps: [
          { label: "طبيبك راجع فحصك", detail: "الدكتور شن، اليوم", done: true },
          { label: "اتصلنا بك لنشرح", detail: "اليوم", done: true },
          { label: "احجز فحص المتابعة", detail: "خلال 90 يوماً", done: false, active: true },
          { label: "طبيبك يراجع فحص المتابعة", detail: "", done: false },
          { label: "نُخبرك بالنتائج", detail: "", done: false },
        ],
      },
      fr: {
        findingSimple: "Une petite tache de 8 millimètres dans votre poumon droit. À peu près de la taille d'un petit pois.",
        paragraph1: "La plupart des taches de ce type ne sont pas graves. Nous voulons regarder de plus près pour en être sûrs.",
        paragraph2: "Ce n'est pas un diagnostic de cancer. C'est un résultat qui nécessite un suivi.",
        paragraph3: "Détecter les choses tôt donne les meilleurs résultats — c'est pourquoi nous avons appelé.",
        steps: [
          { label: "Votre médecin a examiné votre scanner", detail: "Dr. Chen, aujourd'hui", done: true },
          { label: "Nous vous avons appelé pour expliquer", detail: "aujourd'hui", done: true },
          { label: "Réservez votre scanner de suivi", detail: "dans 90 jours", done: false, active: true },
          { label: "Votre médecin examine le scanner de suivi", detail: "", done: false },
          { label: "Nous vous informons des résultats", detail: "", done: false },
        ],
      },
      zh: {
        findingSimple: "您的右肺有一个约8毫米的小点。大约有一粒豌豆那么大。",
        paragraph1: "大多数这样的点并不严重。我们想要更仔细地检查以确认。",
        paragraph2: "这不是癌症诊断。这是一个需要随访的发现。",
        paragraph3: "早期发现能带来最佳结果——这就是我们致电的原因。",
        steps: [
          { label: "您的医生已审查您的扫描", detail: "陈医生，今天", done: true },
          { label: "我们致电为您解释", detail: "今天", done: true },
          { label: "预约随访扫描", detail: "90天内", done: false, active: true },
          { label: "您的医生审查随访扫描", detail: "", done: false },
          { label: "我们通知您结果", detail: "", done: false },
        ],
      },
    },
  },
  "tok_grandma_chen_xyz789": {
    token: "tok_grandma_chen_xyz789",
    patientFirstName: "陈奶奶",
    patientAgeRange: "70s",
    preferredLanguage: "zh",
    finding: "4mm calcified hepatic lesion",
    findingDetail: "肝脏中发现了一个非常小的钙化点，约有一粒米那么大。",
    urgency: "ROUTINE",
    recommendedTimeframe: "Annual follow-up",
    sliceUrl: "/mock/slices/RR-002/slice1.jpg",
    highlight: { x: 55, y: 52, r: 6 },
    doctorName: "陈医生",
    calledAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isScheduled: false,
    familySafe: false,
    explanation: {
      en: {
        findingSimple: "A very small calcium deposit in the liver. About the size of a grain of rice.",
        paragraph1: "This type of finding is very common and almost always harmless.",
        paragraph2: "This is not a cancer diagnosis. Calcium deposits like this often form naturally.",
        paragraph3: "A simple yearly check-up scan will keep everything monitored.",
        steps: [
          { label: "Your doctor reviewed your scan", detail: "Dr. Chen, today", done: true },
          { label: "We called you to explain", detail: "today", done: true },
          { label: "Book your annual follow-up scan", detail: "within 12 months", done: false, active: true },
          { label: "Your doctor reviews the follow-up", detail: "", done: false },
          { label: "We let you know the results", detail: "", done: false },
        ],
      },
      "ar-TN": {
        findingSimple: "ترسب كلسي صغير جداً في الكبد. بحجم حبة أرز تقريباً.",
        paragraph1: "هذا النوع من النتائج شائع جداً وغالباً بلا ضرر.",
        paragraph2: "هذا مش تشخيص للسرطان. الترسبات الكلسية من هذا النوع تتكون طبيعياً.",
        paragraph3: "فحص دوري بسيط كل سنة سيتابع كل شيء.",
        steps: [
          { label: "طبيبك راجع فحصك", detail: "الدكتور شن، اليوم", done: true },
          { label: "اتصلنا بك لنشرح", detail: "اليوم", done: true },
          { label: "احجز فحص المتابعة السنوي", detail: "خلال 12 شهراً", done: false, active: true },
          { label: "طبيبك يراجع المتابعة", detail: "", done: false },
          { label: "نُخبرك بالنتائج", detail: "", done: false },
        ],
      },
      fr: {
        findingSimple: "Un très petit dépôt calcifié dans le foie. À peu près de la taille d'un grain de riz.",
        paragraph1: "Ce type de résultat est très courant et presque toujours bénin.",
        paragraph2: "Ce n'est pas un diagnostic de cancer. Ces dépôts calcifiés se forment naturellement.",
        paragraph3: "Un simple scanner annuel permettra de tout surveiller.",
        steps: [
          { label: "Votre médecin a examiné votre scanner", detail: "Dr. Chen, aujourd'hui", done: true },
          { label: "Nous vous avons appelé pour expliquer", detail: "aujourd'hui", done: true },
          { label: "Réservez votre scanner annuel de suivi", detail: "dans 12 mois", done: false, active: true },
          { label: "Votre médecin examine le suivi", detail: "", done: false },
          { label: "Nous vous informons des résultats", detail: "", done: false },
        ],
      },
      zh: {
        findingSimple: "肝脏中有一个非常小的钙化点。大约有一粒米那么大。",
        paragraph1: "这种发现非常常见，几乎总是无害的。",
        paragraph2: "这不是癌症诊断。这样的钙化沉积通常是自然形成的。",
        paragraph3: "每年做一次简单的复查扫描就能监测一切。",
        steps: [
          { label: "您的医生已审查您的扫描", detail: "陈医生，今天", done: true },
          { label: "我们致电为您解释", detail: "今天", done: true },
          { label: "预约年度随访扫描", detail: "12个月内", done: false, active: true },
          { label: "您的医生审查随访情况", detail: "", done: false },
          { label: "我们通知您结果", detail: "", done: false },
        ],
      },
    },
  },
  "tok_alex_ar789": {
    token: "tok_alex_ar789",
    patientFirstName: "Alex",
    patientAgeRange: "50s",
    preferredLanguage: "ar-TN",
    finding: "14mm solid RUL mass",
    findingDetail: "بقعة صغيرة في رئتك اليمنى نحتاج للنظر فيها بشكل أسرع.",
    urgency: "URGENT",
    recommendedTimeframe: "30 days",
    sliceUrl: "/mock/slices/RR-003/slice2.jpg",
    highlight: { x: 48, y: 35, r: 10 },
    doctorName: "Dr. Chen",
    calledAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isScheduled: false,
    familySafe: false,
    explanation: {
      en: {
        findingSimple: "A spot in your right lung that we need to look at more closely and quickly.",
        paragraph1: "We want to be sure about what we see. A specialist will take a closer look.",
        paragraph2: "We've arranged a priority appointment to get you the answers you need quickly.",
        paragraph3: "Acting quickly gives the best chance for a good outcome.",
        steps: [
          { label: "Your doctor reviewed your scan", detail: "Dr. Chen, today", done: true },
          { label: "We called you to explain", detail: "today", done: true },
          { label: "Priority PET-CT scan", detail: "within 30 days", done: false, active: true },
          { label: "Specialist review", detail: "", done: false },
          { label: "We let you know the results", detail: "", done: false },
        ],
      },
      "ar-TN": {
        findingSimple: "بقعة في رئتك اليمنى نحتاج للنظر فيها بسرعة.",
        paragraph1: "نريد التأكد مما نراه. طبيب متخصص سيأخذ نظرة أقرب.",
        paragraph2: "رتبنا موعداً أولوياً لنعطيك الإجابات بسرعة.",
        paragraph3: "التصرف بسرعة يعطي أفضل فرصة لنتيجة جيدة.",
        steps: [
          { label: "طبيبك راجع فحصك", detail: "الدكتور شن، اليوم", done: true },
          { label: "اتصلنا بك لنشرح", detail: "اليوم", done: true },
          { label: "فحص PET-CT بأولوية", detail: "خلال 30 يوماً", done: false, active: true },
          { label: "مراجعة متخصص", detail: "", done: false },
          { label: "نُخبرك بالنتائج", detail: "", done: false },
        ],
      },
      fr: {
        findingSimple: "Une tache dans votre poumon droit que nous devons examiner de plus près et rapidement.",
        paragraph1: "Nous voulons nous assurer de ce que nous voyons. Un spécialiste examinera cela de plus près.",
        paragraph2: "Nous avons organisé un rendez-vous prioritaire pour vous donner les réponses rapidement.",
        paragraph3: "Agir rapidement offre les meilleures chances d'un bon résultat.",
        steps: [
          { label: "Votre médecin a examiné votre scanner", detail: "Dr. Chen, aujourd'hui", done: true },
          { label: "Nous vous avons appelé pour expliquer", detail: "aujourd'hui", done: true },
          { label: "PET-CT prioritaire", detail: "dans 30 jours", done: false, active: true },
          { label: "Avis spécialisé", detail: "", done: false },
          { label: "Nous vous informons des résultats", detail: "", done: false },
        ],
      },
      zh: {
        findingSimple: "您右肺有一个需要尽快仔细检查的阴影。",
        paragraph1: "我们想确认我们所看到的情况。专科医生将进行更仔细的检查。",
        paragraph2: "我们已安排优先预约，以便尽快给您提供答案。",
        paragraph3: "迅速行动能带来最佳结果。",
        steps: [
          { label: "您的医生已审查您的扫描", detail: "陈医生，今天", done: true },
          { label: "我们致电为您解释", detail: "今天", done: true },
          { label: "优先PET-CT扫描", detail: "30天内", done: false, active: true },
          { label: "专科医生审查", detail: "", done: false },
          { label: "我们通知您结果", detail: "", done: false },
        ],
      },
    },
  },
};

export const MOCK_EVAL_METRICS: EvalMetrics = {
  casesProcessed: 20,
  urgencyAccuracy: 0.9,
  guidelineAccuracy: 0.88,
  avgConfidence: 0.845,
  routedToHuman: 0.1,
  patientsReached: 0.85,
  confusionMatrix: [
    [5, 0, 0, 0],
    [0, 6, 1, 0],
    [0, 0, 5, 0],
    [0, 0, 0, 3],
  ],
  cases: MOCK_CASES.map((c) => ({
    id: c.id,
    predicted: c.urgency,
    actual: c.urgency,
    correct: true,
    confidence: c.confidence,
  })),
};

export const MOCK_AUDIT_CALLS: AuditCall[] = [
  {
    id: "call-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    patientInitials: "GC",
    language: "zh",
    duration: 187,
    outcome: "scheduled",
    transcript: MOCK_CASES[1].callTranscript ?? "",
  },
  {
    id: "call-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    patientInitials: "ML",
    language: "en",
    duration: 92,
    outcome: "scheduled",
    transcript:
      "[Recall Agent]: Hi Maria, this is Recall calling on behalf of Dr. Chen…\n[Patient]: Yes, hello?\n[Recall Agent]: Great news about your CT — the small spots we saw are completely normal and need no follow-up…\n[Patient]: Oh wonderful, thank you so much!\n[Recall Agent]: Of course. You're all clear. Have a great day.",
  },
  {
    id: "call-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    patientInitials: "BT",
    language: "fr",
    duration: 0,
    outcome: "voicemail",
    transcript: "[Recall Agent]: Bonjour, vous êtes bien chez Recall… [voicemail detected — message left]",
  },
];

export function generateSlots(daysAhead: number): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  const times = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];
  for (let d = 1; d <= Math.min(daysAhead, 14); d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    times.forEach((t, i) => {
      slots.push({
        id: `slot-${d}-${i}`,
        date: dateStr,
        time: t,
        available: Math.random() > 0.3,
      });
    });
  }
  return slots;
}
