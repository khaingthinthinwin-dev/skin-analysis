export interface Identity {
  name: string;
  email: string;
}

let seq = 0;

/**
 * Realistic-looking unique email (gmail-style local part + short suffix),
 * e.g. alison.bennett.abc123@gmail.com — unique across runs so re-registration never 409s.
 */
export function uniqueEmail(localPart: string): string {
  seq += 1;
  const suffix = `${Date.now().toString(36)}${seq}`;
  return `${localPart}.${suffix}@gmail.com`;
}

/** Realistic person identity, e.g. person('Alison', 'Bennett'). */
export function person(first: string, last: string): Identity {
  return {
    name: `${first} ${last}`,
    email: uniqueEmail(`${first}.${last}`.toLowerCase()),
  };
}
