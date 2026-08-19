"use client";

/**
 * English and Arabic.
 *
 * Arabic here is a real locale, not a string swap. Three things have to move
 * together or the result looks broken:
 *
 *   1. Direction. dir="rtl" on the document mirrors the whole layout, which
 *      only works if the styling uses logical properties (ps, pe, ms, me,
 *      text-start, text-end) rather than physical ones. A physical utility
 *      pins content to the same side in both languages, which is what produces
 *      the mangled layout that a naive translation gives you.
 *   2. Direction aware icons. An arrow that means "forward" points right in
 *      English and left in Arabic. Chevrons, back arrows and progress fills
 *      all have to follow the reading direction.
 *   3. Numerals. The UAE writes numbers with Western digits in almost all
 *      civic and commercial contexts, so digits stay as they are. Switching to
 *      Eastern Arabic numerals would look wrong and would break the tabular
 *      figure alignment the stat blocks rely on.
 *
 * Content that comes from the model is already bilingual, because the verifier
 * asks for both languages in one call. This dictionary covers the interface
 * around it.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ar";

const STORAGE_KEY = "nabta.locale";

type Dict = Record<string, string>;

const EN: Dict = {
  /* chrome */
  "nav.home": "Home",
  "nav.plants": "My plants",
  "nav.market": "Market",
  "nav.ask": "Nabta AI",
  "nav.more": "More",
  "nav.leaderboard": "Leaderboard",
  "nav.learn": "Start growing",
  "nav.gov": "Government",
  "nav.console": "Console",
  "nav.admin": "Admin",
  "nav.verify": "Verify with camera",
  "chrome.points": "pts",
  "chrome.language": "العربية",
  "chrome.languageLabel": "Switch to Arabic",
  "chrome.reset": "Reset demo data",
  "chrome.close": "Close",

  /* market tab */
  "market.tabMarket": "Buy and swap",
  "market.tabMarketHint": "Trade with other growers",
  "market.tabRewards": "Spend points",
  "market.tabRewardsHint": "Redeem what you earned",
  "market.tablist": "Market and rewards",

  /* plants */
  "plants.eyebrow": "Your log",
  "plants.title": "My plants",
  "plants.subtitle":
    "Every plant you photograph is registered and followed over time. Come back to see how each one is doing.",
  "plants.emptyTitle": "No plants yet",
  "plants.emptyBody":
    "Photograph a plant and it gets registered here automatically. After that, every new photo of the same plant adds to its record.",
  "plants.health": "Health",
  "plants.photo": "photo",
  "plants.photos": "photos",
  "plants.improving": "Improving",
  "plants.declining": "Declining",
  "plants.all": "All plants",
  "plants.registered": "Registered",
  "plants.healthOverTime": "Health over time",
  "plants.oneReading":
    "One reading so far. Photograph this plant again in a few days and a trend will appear here.",
  "plants.everyVisit": "Every visit",
  "plants.addPhoto": "Add a photo",
  "plants.noPhotosTitle": "No photos stored",
  "plants.noPhotosBody":
    "Older photos are dropped to save space on your device, but the readings above are kept.",
  "plants.firstPhoto": "First photo",
  "plants.points": "points",
  "plants.logged": "Logged",
  "plants.note":
    "Plants are registered from the photo itself, not from anything you type. A plant we have not seen before starts at day one, which is what stops someone earning points from a photograph of a plant they do not tend.",

  /* helper */
  "helper.eyebrow": "Powered by AI",
  "helper.title": "Nabta AI",
  "helper.subtitle":
    "Ask anything about growing. There is no wrong question, and you do not need to know the right words.",
  "helper.intro":
    "Tell me what you are growing, or what looks wrong, and I will give you a few simple steps. You can write in English or Arabic.",
  "helper.common": "Common questions",
  "helper.placeholder": "Ask about your plant",
  "helper.send": "Send question",
  "helper.thinking": "Thinking about your plant",
  "helper.startAgain": "Start again",
  "helper.failed": "Sorry, I could not answer just now. Please try asking again.",
  "helper.offline": "You seem to be offline. Check your connection and ask again.",
  "helper.note":
    "The helper gives general growing advice for home growers in the UAE. It is not a substitute for an agricultural extension officer, and it will not recommend pesticide brands or doses.",
  "helper.q1": "I have never grown anything. Where do I start?",
  "helper.q2": "My leaves are turning yellow. What is wrong?",
  "helper.q3": "What is easy to grow right now?",
  "helper.q4": "How much water does my plant need?",
  "helper.q5": "Can I grow food on my balcony?",
  "helper.q6": "The tips of the leaves look burnt.",

  /* verification result */
  "verify.newPlant": "New plant registered",
  "verify.newPlantBody":
    "This is the first time we have seen this plant, so it starts at day one on base points. Keep photographing it and the bonuses build up.",
  "verify.knownPlant": "Known plant",
  "verify.knownPlantBody":
    "We recognised this plant from your earlier photos, so your streak and bonuses apply.",
  "verify.plantCheck": "Plant check",
  "verify.whatWeFound": "What we found",
  "verify.doThisNext": "Do this next",
  "verify.howToGrow": "How to grow",
  "verify.adviceHint": "Soil, where to put it, water, seeds and care",
  "verify.soil": "Soil",
  "verify.location": "Where to put it",
  "verify.water": "Water",
  "verify.seeds": "Seeds",
  "verify.care": "Looking after it",
  "verify.harvest": "Estimated harvest",
  "verify.visibleInFrame": "visible in frame",
  "verify.rangeNote":
    "The range is wide on purpose, since a photograph cannot show everything the plant is carrying.",
  "verify.checkIn": "Plant check in",
};

const AR: Dict = {
  /* chrome */
  "nav.home": "الرئيسية",
  "nav.plants": "نباتاتي",
  "nav.market": "السوق",
  "nav.ask": "نبتة AI",
  "nav.more": "المزيد",
  "nav.leaderboard": "المتصدرون",
  "nav.learn": "ابدأ الزراعة",
  "nav.gov": "الحكومة",
  "nav.console": "لوحة البلدية",
  "nav.admin": "الإدارة",
  "nav.verify": "وثّق بالكاميرا",
  "chrome.points": "نقطة",
  "chrome.language": "English",
  "chrome.languageLabel": "التبديل إلى الإنجليزية",
  "chrome.reset": "إعادة ضبط بيانات العرض",
  "chrome.close": "إغلاق",

  /* market tab */
  "market.tabMarket": "بيع ومبادلة",
  "market.tabMarketHint": "تبادل مع مزارعين آخرين",
  "market.tabRewards": "اصرف نقاطك",
  "market.tabRewardsHint": "استبدل ما جمعته",
  "market.tablist": "السوق والمكافآت",

  /* plants */
  "plants.eyebrow": "سجلك",
  "plants.title": "نباتاتي",
  "plants.subtitle":
    "كل نبتة تصورها يتم تسجيلها ومتابعتها مع الوقت. ارجع لتشاهد حالة كل واحدة منها.",
  "plants.emptyTitle": "لا توجد نباتات بعد",
  "plants.emptyBody":
    "صوّر نبتة وسيتم تسجيلها هنا تلقائياً. بعد ذلك، كل صورة جديدة لنفس النبتة تضاف إلى سجلها.",
  "plants.health": "الصحة",
  "plants.photo": "صورة",
  "plants.photos": "صور",
  "plants.improving": "تتحسن",
  "plants.declining": "تتراجع",
  "plants.all": "كل النباتات",
  "plants.registered": "سُجلت",
  "plants.healthOverTime": "الصحة مع الوقت",
  "plants.oneReading":
    "قراءة واحدة حتى الآن. صوّر هذه النبتة مرة أخرى بعد أيام وسيظهر لك التغير هنا.",
  "plants.everyVisit": "كل زيارة",
  "plants.addPhoto": "أضف صورة",
  "plants.noPhotosTitle": "لا توجد صور محفوظة",
  "plants.noPhotosBody":
    "الصور القديمة تُحذف لتوفير مساحة على جهازك، لكن القراءات أعلاه محفوظة.",
  "plants.firstPhoto": "أول صورة",
  "plants.points": "نقطة",
  "plants.logged": "مسجل",
  "plants.note":
    "تُسجل النباتات من الصورة نفسها، لا مما تكتبه. النبتة التي لم نرها من قبل تبدأ من اليوم الأول، وهذا ما يمنع أي شخص من كسب النقاط بصورة نبتة لا يعتني بها.",

  /* helper */
  "helper.eyebrow": "مدعوم بالذكاء الاصطناعي",
  "helper.title": "نبتة AI",
  "helper.subtitle":
    "اسأل أي شيء عن الزراعة. لا يوجد سؤال خاطئ، ولست بحاجة لمعرفة المصطلحات الصحيحة.",
  "helper.intro":
    "أخبرني ماذا تزرع، أو ما الذي يبدو غير سليم، وسأعطيك خطوات بسيطة. يمكنك الكتابة بالعربية أو الإنجليزية.",
  "helper.common": "أسئلة شائعة",
  "helper.placeholder": "اسأل عن نبتتك",
  "helper.send": "إرسال السؤال",
  "helper.thinking": "أفكر في نبتتك",
  "helper.startAgain": "ابدأ من جديد",
  "helper.failed": "عذراً، لم أتمكن من الإجابة الآن. حاول السؤال مرة أخرى.",
  "helper.offline": "يبدو أنك غير متصل بالإنترنت. تحقق من الاتصال واسأل مرة أخرى.",
  "helper.note":
    "يقدم المساعد نصائح عامة للزراعة المنزلية في الإمارات. وهو لا يغني عن المرشد الزراعي، ولا يوصي بأسماء المبيدات أو جرعاتها.",
  "helper.q1": "لم أزرع أي شيء من قبل. من أين أبدأ؟",
  "helper.q2": "أوراق نبتتي تصفرّ. ما المشكلة؟",
  "helper.q3": "ما هو النبات السهل زراعته الآن؟",
  "helper.q4": "كم تحتاج نبتتي من الماء؟",
  "helper.q5": "هل أستطيع زراعة الطعام في الشرفة؟",
  "helper.q6": "أطراف الأوراق تبدو محروقة.",

  /* verification result */
  "verify.newPlant": "تم تسجيل نبتة جديدة",
  "verify.newPlantBody":
    "هذه أول مرة نرى فيها هذه النبتة، لذلك تبدأ من اليوم الأول بالنقاط الأساسية. استمر بتصويرها وستزداد المكافآت.",
  "verify.knownPlant": "نبتة معروفة",
  "verify.knownPlantBody":
    "تعرفنا على هذه النبتة من صورك السابقة، لذلك تنطبق سلسلتك ومكافآتك.",
  "verify.plantCheck": "فحص النبتة",
  "verify.whatWeFound": "ما وجدناه",
  "verify.doThisNext": "افعل هذا الآن",
  "verify.howToGrow": "كيف تزرع",
  "verify.adviceHint": "التربة، المكان، الماء، البذور والعناية",
  "verify.soil": "التربة",
  "verify.location": "أين تضعها",
  "verify.water": "الماء",
  "verify.seeds": "البذور",
  "verify.care": "العناية بها",
  "verify.harvest": "المحصول التقديري",
  "verify.visibleInFrame": "ظاهرة في الصورة",
  "verify.rangeNote":
    "النطاق واسع عن قصد، لأن الصورة لا تُظهر كل ما تحمله النبتة.",
  "verify.checkIn": "زيارة تفقد",
};

const DICTS: Record<Locale, Dict> = { en: EN, ar: AR };

interface I18nValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  /** True in Arabic. Use for flipping direction aware icons. */
  rtl: boolean;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: (key: string) => string;
  /** Picks the right half of a bilingual value returned by the model. */
  pick: (value: { en: string; ar: string } | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read after mount. Reading localStorage during render would make the
  // server output and the first client render disagree.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  // The document element is owned by the server rendered layout, so direction
  // is applied here rather than through a lang attribute in the tree.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Private mode or a full quota. The choice just will not persist.
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[locale];
    return {
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      rtl: locale === "ar",
      setLocale,
      toggle: () => setLocale(locale === "ar" ? "en" : "ar"),
      // Falling back to the key rather than to English makes a missing string
      // obvious on screen instead of silently shipping English into Arabic.
      t: (key) => dict[key] ?? EN[key] ?? key,
      pick: (v) => (v ? (locale === "ar" ? v.ar : v.en) : ""),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
