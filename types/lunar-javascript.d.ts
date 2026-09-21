declare module 'lunar-javascript' {
  export class EightChar {
    setSect(sect: number): void;
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    /** Returns the literal `日主`, not a Ten God name — the day stem is the day master. */
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
  }

  export class Lunar {
    getEightChar(): EightChar;
  }

  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    getLunar(): Lunar;
  }
}
