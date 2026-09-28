/** Where most readers at the academy come from — listed first. */
export const COMMON_COUNTRIES = ['PH', 'KR', 'JP', 'TW', 'CN', 'VN', 'TH', 'MN', 'HK', 'RU', 'SA', 'US'];

/** ISO 3166-1 alpha-2 codes. Names are not stored: `Intl.DisplayNames` supplies them. */
export const ALL_COUNTRIES = (
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT ' +
  'BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ' +
  'ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE ' +
  'IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV ' +
  'LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO ' +
  'NP NR NU NZ OM PA PE PF PG PH PK PL PM PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI ' +
  'SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA ' +
  'VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

export function countryName(code: string, locale = 'en'): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** A flag from two regional-indicator letters: "PH" → 🇵🇭. */
export function countryFlag(code: string): string {
  return String.fromCodePoint(...Array.from(code).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
