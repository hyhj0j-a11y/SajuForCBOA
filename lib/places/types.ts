/** A birthplace as the form shows it and the reading route receives it. */
export interface Place {
  id: string;
  /** Display name, e.g. "Cebu City" or "서울 · Seoul". */
  name: string;
  /** Province or state, to tell apart places with the same name. */
  region: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  latitude: number;
  longitude: number;
  /** IANA time zone, e.g. "Asia/Manila". */
  timezone: string;
}
