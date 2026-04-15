const RFID_PATTERN = /^[A-Za-z0-9\-]{6,24}$/;

/** Strips non-printable chars and trailing newlines from HID keyboard input */
export function sanitizeRfid(raw: string): string {
  return raw.replace(/[\r\n\t\x00-\x1F\x7F]/g, '').trim();
}

/** Returns true if the RFID string is a valid ear-tag ID */
export function isValidRfid(rfid: string): boolean {
  return RFID_PATTERN.test(rfid);
}

/** Normalizes RFID to uppercase for consistent DB storage */
export function normalizeRfid(rfid: string): string {
  return sanitizeRfid(rfid).toUpperCase();
}
