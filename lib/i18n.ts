import type { Element } from './saju/calculate';

/**
 * The reading is written in English and translated on request. Fixed labels — headings, the day
 * master images, the footer — are translated here in code, so switching language costs the model
 * only the reading itself.
 */
export const TRANSLATED_LANGS = ['ko', 'zh-TW', 'zh-CN', 'ja'] as const;
export const LANGS = ['en', ...TRANSLATED_LANGS] as const;
export type Lang = (typeof LANGS)[number];
export type TranslatedLang = (typeof TRANSLATED_LANGS)[number];

/** Each language is named in itself — the reader who needs it cannot read the English name. */
export const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  ko: '한국어',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  ja: '日本語',
};

/** What the translator is told to write. Taiwan gets Traditional characters and Taiwanese usage. */
export const LANG_FOR_MODEL: Record<TranslatedLang, string> = {
  ko: 'Korean (한국어), warm and friendly 해요체 style',
  'zh-TW': 'Traditional Chinese as written in Taiwan (繁體中文, 台灣用語)',
  'zh-CN': 'Simplified Chinese as written in mainland China (简体中文)',
  ja: 'Japanese (日本語), friendly です/ます style',
};

/** Chinese and Japanese are written without spaces between words, so they wrap per character. Korean has spaces. */
export function isCjk(lang: Lang): boolean {
  return lang === 'zh-TW' || lang === 'zh-CN' || lang === 'ja';
}

export interface UiText {
  snapshot: string;
  identity: string;
  hiddenSide: string;
  englishStyle: string;
  cebuMode: string;
  lifePattern: string;
  peopleStyle: string;
  blindSpot: string;
  question: string;
  tryThis: string;
  strongest: string;
  noVisible: string;
  dayMasterStrength: string;
  strengthLevel: Record<'weak' | 'balanced' | 'strong', string>;
  weakest: string;
  motto: string;
  mottoSub: string;
  translatedNote: string;
  translating: string;
  translateFailed: string;
}

export const UI: Record<Lang, UiText> = {
  en: {
    snapshot: 'You, in Saju',
    identity: 'Who you are',
    hiddenSide: 'Your hidden side',
    englishStyle: 'Your English style',
    cebuMode: 'You in Cebu',
    lifePattern: 'Your life pattern',
    peopleStyle: 'You with people',
    blindSpot: 'Your blind spot',
    question: 'One question to ask yourself',
    tryThis: 'Try this',
    strongest: 'Strongest',
    noVisible: 'Not visible in the chart',
    dayMasterStrength: 'Day master',
    strengthLevel: { strong: 'Strong', balanced: 'Balanced', weak: 'Soft' },
    weakest: 'Weakest',
    motto: 'Use Saju as a mirror, not as a map.',
    mottoSub: 'Our future is still ours to choose.',
    translatedNote: '',
    translating: 'Translating…',
    translateFailed: 'The translation did not come through. Tap to try again.',
  },
  ko: {
    snapshot: '사주로 본 나',
    identity: '나는 어떤 사람',
    hiddenSide: '숨겨진 나의 모습',
    englishStyle: '나의 영어 스타일',
    cebuMode: '세부에서의 나',
    lifePattern: '나의 삶의 패턴',
    peopleStyle: '사람들 속의 나',
    blindSpot: '나의 사각지대',
    question: '나에게 던지는 질문',
    tryThis: '해 보기',
    strongest: '가장 강한',
    noVisible: '겉으로 드러나지 않은 오행',
    dayMasterStrength: '일간',
    strengthLevel: { strong: '신강 (강한 편)', balanced: '중화 (균형)', weak: '신약 (약한 편)' },
    weakest: '가장 약한',
    motto: '사주는 지도가 아니라 거울로 쓰세요.',
    mottoSub: '우리의 미래는 여전히 우리가 선택해요.',
    translatedNote: 'AI가 영어 원문을 번역했어요',
    translating: '번역 중…',
    translateFailed: '번역이 되지 않았어요. 다시 눌러 주세요.',
  },
  'zh-TW': {
    snapshot: '四柱裡的你',
    identity: '你是誰',
    hiddenSide: '你隱藏的一面',
    englishStyle: '你的英語風格',
    cebuMode: '在宿霧的你',
    lifePattern: '你的生活模式',
    peopleStyle: '你與人相處',
    blindSpot: '你的盲點',
    question: '問問自己',
    tryThis: '試試看',
    strongest: '最強',
    noVisible: '表面缺少',
    dayMasterStrength: '日主',
    strengthLevel: { strong: '身強', balanced: '中和', weak: '身弱' },
    weakest: '最弱',
    motto: '把四柱當作鏡子，而不是地圖。',
    mottoSub: '我們的未來，仍由我們自己選擇。',
    translatedNote: '由 AI 從英文翻譯',
    translating: '翻譯中…',
    translateFailed: '翻譯沒有成功，請再點一次。',
  },
  'zh-CN': {
    snapshot: '四柱里的你',
    identity: '你是谁',
    hiddenSide: '你隐藏的一面',
    englishStyle: '你的英语风格',
    cebuMode: '在宿务的你',
    lifePattern: '你的生活模式',
    peopleStyle: '你与人相处',
    blindSpot: '你的盲点',
    question: '问问自己',
    tryThis: '试试看',
    strongest: '最强',
    noVisible: '表面缺少',
    dayMasterStrength: '日主',
    strengthLevel: { strong: '身强', balanced: '中和', weak: '身弱' },
    weakest: '最弱',
    motto: '把四柱当作镜子，而不是地图。',
    mottoSub: '我们的未来，仍由我们自己选择。',
    translatedNote: '由 AI 从英文翻译',
    translating: '翻译中…',
    translateFailed: '翻译没有成功，请再点一次。',
  },
  ja: {
    snapshot: '四柱で見るあなた',
    identity: 'あなたはこんな人',
    hiddenSide: 'あなたの隠れた一面',
    englishStyle: 'あなたの英語スタイル',
    cebuMode: 'セブでのあなた',
    lifePattern: 'あなたの生き方のパターン',
    peopleStyle: '人といるときのあなた',
    blindSpot: 'あなたの盲点',
    question: '自分に聞いてみよう',
    tryThis: 'やってみよう',
    strongest: 'いちばん強い',
    noVisible: '表に出ていない五行',
    dayMasterStrength: '日主',
    strengthLevel: { strong: '身強', balanced: '中和', weak: '身弱' },
    weakest: 'いちばん弱い',
    motto: '四柱は地図ではなく、鏡として使おう。',
    mottoSub: '未来を選ぶのは、今も私たち自身。',
    translatedNote: 'AI が英語から翻訳しました',
    translating: '翻訳中…',
    translateFailed: '翻訳できませんでした。もう一度タップしてください。',
  },
};

export const ELEMENT_NAME: Record<Lang, Record<Element, string>> = {
  en: { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' },
  ko: { wood: '나무', fire: '불', earth: '흙', metal: '쇠', water: '물' },
  'zh-TW': { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' },
  'zh-CN': { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' },
  ja: { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' },
};

/**
 * Day master images per language, keyed by day stem. The English names live in
 * `DAY_MASTER_IMAGE`; the translator is handed the name from here so the snapshot text and the
 * picture above it always use the same words.
 */
export const DAY_MASTER_IMAGE_NAME: Record<TranslatedLang, Record<string, string>> = {
  ko: {
    甲: '큰 나무', 乙: '꽃 덩굴', 丙: '태양', 丁: '촛불', 戊: '산',
    己: '텃밭의 흙', 庚: '무쇠 바위', 辛: '보석', 壬: '바다', 癸: '비',
  },
  'zh-TW': {
    甲: '參天大樹', 乙: '花草藤蔓', 丙: '太陽', 丁: '燭火', 戊: '高山',
    己: '田園沃土', 庚: '鋼鐵岩石', 辛: '珠寶', 壬: '大海', 癸: '雨露',
  },
  'zh-CN': {
    甲: '参天大树', 乙: '花草藤蔓', 丙: '太阳', 丁: '烛火', 戊: '高山',
    己: '田园沃土', 庚: '钢铁岩石', 辛: '珠宝', 壬: '大海', 癸: '雨露',
  },
  ja: {
    甲: 'そびえる大樹', 乙: '花のつる', 丙: '太陽', 丁: 'ろうそくの灯', 戊: '山',
    己: '畑の土', 庚: '鉄の岩', 辛: '宝石', 壬: '大海', 癸: '雨',
  },
};
