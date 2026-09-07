/**
 * Public legal site — https://sdservices.cloud
 */
const BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LEGAL_BASE_URL?.replace(/\/$/, '')) ||
  'https://sdservices.cloud';

export const LEGAL_SUPPORT_EMAIL = 'support@sdservices.cloud';

export const LegalUrls = {
  privacy: `${BASE}/privacy-policy.html`,
  terms: `${BASE}/terms-and-conditions.html`,
  accountDeletion: `${BASE}/account-deletion.html`,
  supportMailto: `mailto:${LEGAL_SUPPORT_EMAIL}`,
  deletionMailto: `mailto:${LEGAL_SUPPORT_EMAIL}?subject=${encodeURIComponent('Account Deletion Request')}`,
};
