import { apiFetch } from '@/lib/apiFetch';

export async function forgotPassword(email: string) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
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
