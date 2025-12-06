/**
 * Official athletics result codes (Rule 132)
 * Based on World Athletics / Norsk Friidrett regulations
 * Source: docs/koderresultat.pdf
 */

// Attempt codes for field events
export const ATTEMPT_CODES = {
  /** Valid attempt in high jump and pole vault */
  O: 'O',
  /** Invalid/foul attempt in any field event */
  X: 'X',
  /** Pass - chose not to attempt */
  PASS: '-',
} as const;

// Athlete status codes
export type AthleteStatusCode =
  | 'active'  // Still competing
  | 'DNS'     // Did not start (Startet ikke)
  | 'DNF'     // Did not finish (Fullførte ikke) - for running events
  | 'NM'      // No mark (Uten gyldig resultat)
  | 'r'       // Retired (Trukket seg)
  | 'DQ';     // Disqualified (Diskvalifisert)

export const ATHLETE_STATUS_CODES: AthleteStatusCode[] = [
  'active', 'DNS', 'DNF', 'NM', 'r', 'DQ'
];

export const STATUS_LABELS: Record<AthleteStatusCode, string> = {
  active: 'Aktiv',
  DNS: 'DNS',
  DNF: 'DNF',
  NM: 'NM',
  r: 'r',
  DQ: 'DQ',
};

export const STATUS_DESCRIPTIONS: Record<AthleteStatusCode, string> = {
  active: 'Deltar i konkurransen',
  DNS: 'Startet ikke (Did not start)',
  DNF: 'Fullførte ikke (Did not finish)',
  NM: 'Ingen gyldige forsøk (No mark)',
  r: 'Trukket seg (Retired)',
  DQ: 'Diskvalifisert',
};

// Qualification codes
export const QUALIFICATION_CODES = {
  /** Qualified by position (løp) or meeting standard (teknisk) */
  Q: 'Q',
  /** Also qualified by time (løp) or count (teknisk) */
  q: 'q',
  /** Qualified by referee decision */
  qR: 'qR',
  /** Qualified by jury decision */
  qJ: 'qJ',
} as const;

// Race walking warning codes
export const RACE_WALK_CODES = {
  /** Warning for bent knee */
  BENT_KNEE: '>',
  /** Warning for loss of contact */
  LOSS_OF_CONTACT: '~',
} as const;

// Card codes
export const CARD_CODES = {
  /** Yellow card */
  YC: 'YC',
  /** Yellow and red card (second yellow) */
  YRC: 'YRC',
  /** Red card */
  RC: 'RC',
} as const;

/**
 * Get display code for a field event attempt
 * @param isVertical - true for high jump and pole vault
 * @param distance - measured distance (for horizontal/throw events)
 * @param isFoul - true if attempt was invalid
 * @param isPass - true if athlete chose to pass
 */
export function getAttemptDisplayCode(
  isVertical: boolean,
  distance: string | number | null,
  isFoul: boolean,
  isPass: boolean
): string {
  if (isFoul) return ATTEMPT_CODES.X;
  if (isPass) return ATTEMPT_CODES.PASS;
  if (distance) return isVertical ? ATTEMPT_CODES.O : String(distance);
  return '';
}
