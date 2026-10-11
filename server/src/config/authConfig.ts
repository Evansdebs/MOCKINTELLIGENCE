/**
 * Authentication configuration and transition constants.
 */

// Global sunset date for legacy staff credentials and legacy staff JWTs.
// After this timestamp, legacy staff login issuance and acceptance are shut down.
export const LEGACY_AUTH_SUNSET_DATE = new Date(
  process.env.LEGACY_AUTH_SUNSET_DATE || '2026-10-25T00:00:00.000Z'
);

/**
 * Checks if legacy staff authentication is currently permitted.
 */
export function isLegacyAuthAllowed(): boolean {
  return new Date() < LEGACY_AUTH_SUNSET_DATE;
}
