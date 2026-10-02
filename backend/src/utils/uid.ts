// src/utils/uid.ts

import crypto from "crypto";

/**
 * Generates a canonical UID for a patient.
 * Format: EVP-<12 hex chars>
 */
export function generateUID(): string {
  const random = crypto.randomBytes(6).toString("hex"); // 12 chars
  return `EVP-${random.toUpperCase()}`;
}
