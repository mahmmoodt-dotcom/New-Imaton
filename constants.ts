import { Language } from './types';

/**
 * Delivery destinations. The English name is the stored value — the server
 * validates against this exact list — while CITY_NAMES supplies what the
 * customer actually reads. Never send a translated name to the server.
 */
export const IRAQ_CITIES = [
  "Baghdad", "Erbil", "Sulaymaniyah", "Duhok", "Basra", "Mosul", "Najaf", "Karbala",
  "Kirkuk", "Anbar", "Maysan", "Muthanna", "Qadisiyah", "Dhi Qar", "Babil", "Wasit", "Diyala", "Salah al-Din"
];

const CITY_NAMES: Record<string, Record<Language, string>> = {
  "Baghdad":      { en: "Baghdad",      ar: "بغداد",       ku: "بەغدا" },
  "Erbil":        { en: "Erbil",        ar: "أربيل",       ku: "هەولێر" },
  "Sulaymaniyah": { en: "Sulaymaniyah", ar: "السليمانية",  ku: "سلێمانی" },
  "Duhok":        { en: "Duhok",        ar: "دهوك",        ku: "دهۆک" },
  "Basra":        { en: "Basra",        ar: "البصرة",      ku: "بەسرە" },
  "Mosul":        { en: "Mosul",        ar: "الموصل",      ku: "مووسڵ" },
  "Najaf":        { en: "Najaf",        ar: "النجف",       ku: "نەجەف" },
  "Karbala":      { en: "Karbala",      ar: "كربلاء",      ku: "کەربەلا" },
  "Kirkuk":       { en: "Kirkuk",       ar: "كركوك",       ku: "کەرکووک" },
  "Anbar":        { en: "Anbar",        ar: "الأنبار",     ku: "ئەنبار" },
  "Maysan":       { en: "Maysan",       ar: "ميسان",       ku: "مەیسان" },
  "Muthanna":     { en: "Muthanna",     ar: "المثنى",      ku: "موسەننا" },
  "Qadisiyah":    { en: "Qadisiyah",    ar: "القادسية",    ku: "قادسیە" },
  "Dhi Qar":      { en: "Dhi Qar",      ar: "ذي قار",      ku: "زیقار" },
  "Babil":        { en: "Babil",        ar: "بابل",        ku: "بابل" },
  "Wasit":        { en: "Wasit",        ar: "واسط",        ku: "واسیت" },
  "Diyala":       { en: "Diyala",       ar: "ديالى",       ku: "دیالە" },
  "Salah al-Din": { en: "Salah al-Din", ar: "صلاح الدين",  ku: "سەلاحەدین" },
};

/** The readable name of a city, falling back to the stored value. */
export const cityLabel = (city: string, lang: Language): string =>
  CITY_NAMES[city]?.[lang] ?? city;
