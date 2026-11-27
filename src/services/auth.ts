import { apiFetch } from '@/lib/apiFetch';

export async function forgotPassword(email: string) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Verify reset OTP before allowing the new-password step. */
export async function verifyResetOtp(input: { email: string; otp: string }) {
  return apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ ...input, purpose: 'reset' }),
  });
}

export async function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
}) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
