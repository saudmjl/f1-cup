// ════════════════════════════════════════════════════════
//  بيانات مشتركة: أسماء الفرق بالعربي، الأعلام، قواعد النقاط
// ════════════════════════════════════════════════════════

// خريطة أسماء الفرق (إنجليزي من openfootball → عربي + علم)
// تشمل أسماء مسارات الملحق الأوروبي مؤقتًا لحين حسمها
const TEAMS = {
  "Mexico":        { ar: "المكسيك",        flag: "🇲🇽", code: "MEX" },
  "South Africa":  { ar: "جنوب أفريقيا",   flag: "🇿🇦", code: "RSA" },
  "South Korea":   { ar: "كوريا الجنوبية", flag: "🇰🇷", code: "KOR" },
  "Canada":        { ar: "كندا",           flag: "🇨🇦", code: "CAN" },
  "Qatar":         { ar: "قطر",            flag: "🇶🇦", code: "QAT" },
  "Switzerland":   { ar: "سويسرا",         flag: "🇨🇭", code: "SUI" },
  "Brazil":        { ar: "البرازيل",       flag: "🇧🇷", code: "BRA" },
  "Morocco":       { ar: "المغرب",         flag: "🇲🇦", code: "MAR" },
  "Haiti":         { ar: "هايتي",          flag: "🇭🇹", code: "HAI" },
  "Scotland":      { ar: "اسكتلندا",       flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", code: "SCO" },
  "USA":           { ar: "أمريكا",         flag: "🇺🇸", code: "USA" },
  "Paraguay":      { ar: "باراغواي",       flag: "🇵🇾", code: "PAR" },
  "Australia":     { ar: "أستراليا",       flag: "🇦🇺", code: "AUS" },
  "Germany":       { ar: "ألمانيا",        flag: "🇩🇪", code: "GER" },
  "Curaçao":       { ar: "كوراساو",        flag: "🇨🇼", code: "CUW" },
  "Ivory Coast":   { ar: "ساحل العاج",     flag: "🇨🇮", code: "CIV" },
  "Ecuador":       { ar: "الإكوادور",      flag: "🇪🇨", code: "ECU" },
  "Netherlands":   { ar: "هولندا",         flag: "🇳🇱", code: "NED" },
  "Japan":         { ar: "اليابان",        flag: "🇯🇵", code: "JPN" },
  "Tunisia":       { ar: "تونس",           flag: "🇹🇳", code: "TUN" },
  "Spain":         { ar: "إسبانيا",        flag: "🇪🇸", code: "ESP" },
  "Cape Verde":    { ar: "الرأس الأخضر",   flag: "🇨🇻", code: "CPV" },
  "Belgium":       { ar: "بلجيكا",         flag: "🇧🇪", code: "BEL" },
  "Egypt":         { ar: "مصر",            flag: "🇪🇬", code: "EGY" },
  "Saudi Arabia":  { ar: "السعودية",       flag: "🇸🇦", code: "KSA" },
  "Uruguay":       { ar: "أوروغواي",       flag: "🇺🇾", code: "URU" },
  "Iran":          { ar: "إيران",          flag: "🇮🇷", code: "IRN" },
  "New Zealand":   { ar: "نيوزيلندا",      flag: "🇳🇿", code: "NZL" },
  "France":        { ar: "فرنسا",          flag: "🇫🇷", code: "FRA" },
  "Argentina":     { ar: "الأرجنتين",      flag: "🇦🇷", code: "ARG" },
  "Algeria":       { ar: "الجزائر",        flag: "🇩🇿", code: "ALG" },
  "Austria":       { ar: "النمسا",         flag: "🇦🇹", code: "AUT" },
  "Jordan":        { ar: "الأردن",         flag: "🇯🇴", code: "JOR" },
  "Portugal":      { ar: "البرتغال",       flag: "🇵🇹", code: "POR" },
  "Uzbekistan":    { ar: "أوزبكستان",      flag: "🇺🇿", code: "UZB" },
  "England":       { ar: "إنجلترا",        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "ENG" },
  "Ghana":         { ar: "غانا",           flag: "🇬🇭", code: "GHA" },
  "Panama":        { ar: "بنما",           flag: "🇵🇦", code: "PAN" },
  "Croatia":       { ar: "كرواتيا",        flag: "🇭🇷", code: "CRO" },
  "Colombia":      { ar: "كولومبيا",       flag: "🇨🇴", code: "COL" },
  "DR Congo":      { ar: "الكونغو الd.",   flag: "🇨🇩", code: "COD" },
  "Norway":        { ar: "النرويج",        flag: "🇳🇴", code: "NOR" },
  "Senegal":       { ar: "السنغال",        flag: "🇸🇳", code: "SEN" },
  "Iraq":          { ar: "العراق",         flag: "🇮🇶", code: "IRQ" },
  "Czechia":       { ar: "التشيك",         flag: "🇨🇿", code: "CZE" },
  "Sweden":        { ar: "السويد",         flag: "🇸🇪", code: "SWE" },
  "Turkey":        { ar: "تركيا",          flag: "🇹🇷", code: "TUR" },
  "Türkiye":       { ar: "تركيا",          flag: "🇹🇷", code: "TUR" },
};

// أي اسم غير معروف (مثل "UEFA Path D winner") يُعرض كما هو مؤقتًا
function teamInfo(name) {
  return TEAMS[name] || { ar: name, flag: "⚽", code: "?" };
}

// ─── قواعد النقاط ───────────────────────────────────────
// نتيجة دقيقة صح = 3 | فائز صح فقط = 1 | غلط = 0 | الدبل ×2
function calcPoints(pred1, pred2, score1, score2, isDouble) {
  if (score1 == null || score2 == null) return 0;       // لم تنتهِ
  let pts = 0;
  if (pred1 === score1 && pred2 === score2) {
    pts = 3;                                             // نتيجة دقيقة
  } else {
    const predOut = Math.sign(pred1 - pred2);            // 1/0/-1
    const realOut = Math.sign(score1 - score2);
    if (predOut === realOut) pts = 1;                    // فائز صح
  }
  return isDouble ? pts * 2 : pts;
}

if (typeof module !== "undefined") module.exports = { TEAMS, teamInfo, calcPoints };
